-- Verified credentials must have a reviewer and recorded review provenance.
-- Legacy verified rows without provenance are invalidated with explicit history,
-- not deleted, and require a fresh authorised review.

ALTER TABLE public.user_credentials
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_source TEXT,
  ADD COLUMN IF NOT EXISTS verification_reason TEXT;

DO $$ BEGIN
  ALTER TABLE public.user_credentials ADD CONSTRAINT user_credentials_verification_source_check
    CHECK (verification_source IS NULL OR verification_source IN (
      'issuer_confirmation', 'document_review', 'organisation_training'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.credential_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.user_credentials(id) ON DELETE RESTRICT,
  subject_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_verified BOOLEAN NOT NULL,
  new_verified BOOLEAN NOT NULL,
  verification_source TEXT,
  reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (verification_source IS NULL OR verification_source IN (
    'issuer_confirmation', 'document_review', 'organisation_training', 'legacy_recheck'
  ))
);
CREATE INDEX IF NOT EXISTS idx_credential_verification_history_subject
  ON public.credential_verification_history(subject_user_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_credential_verification_history_credential
  ON public.credential_verification_history(credential_id, changed_at DESC);

ALTER TABLE public.credential_verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_verification_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Credential owners and org reviewers can view verification history"
  ON public.credential_verification_history;
CREATE POLICY "Credential owners and org reviewers can view verification history"
  ON public.credential_verification_history FOR SELECT TO authenticated
  USING (
    subject_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.org_members reviewer
      JOIN public.org_members subject ON subject.org_id = reviewer.org_id
      WHERE reviewer.user_id = auth.uid()
        AND reviewer.role IN ('owner', 'admin', 'manager')
        AND subject.user_id = credential_verification_history.subject_user_id
    )
  );
REVOKE ALL ON public.credential_verification_history FROM anon, authenticated;
GRANT SELECT ON public.credential_verification_history TO authenticated;
REVOKE UPDATE ON public.user_credentials FROM authenticated;

CREATE OR REPLACE FUNCTION public.force_self_reported_credentials_unverified()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.verified := false;
    NEW.verified_by := NULL;
    NEW.verified_at := NULL;
    NEW.verification_source := NULL;
    NEW.verification_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_self_reported_credential_unverified ON public.user_credentials;
CREATE TRIGGER on_self_reported_credential_unverified
  BEFORE INSERT ON public.user_credentials
  FOR EACH ROW EXECUTE FUNCTION public.force_self_reported_credentials_unverified();

-- Preserve the prior verification decision, but do not continue trusting rows
-- that lack the provenance required by the new eligibility rule.
INSERT INTO public.credential_verification_history(
  credential_id, subject_user_id, actor_id, previous_verified, new_verified,
  verification_source, reason
)
SELECT c.id, c.user_id, NULL, true, false, 'legacy_recheck',
  'Legacy verification lacked reviewer provenance and requires re-review.'
FROM public.user_credentials c
WHERE c.verified AND (c.verified_at IS NULL OR c.verification_source IS NULL OR c.verified_by IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.credential_verification_history h
    WHERE h.credential_id = c.id AND h.verification_source = 'legacy_recheck'
  );
UPDATE public.user_credentials c SET verified = false, verified_by = NULL,
  verified_at = NULL, verification_source = NULL,
  verification_reason = 'Legacy verification requires authorised re-review.'
WHERE c.verified AND (c.verified_at IS NULL OR c.verification_source IS NULL OR c.verified_by IS NULL);

CREATE OR REPLACE FUNCTION public.review_user_credential(
  _credential_id UUID,
  _verified BOOLEAN,
  _verification_source TEXT,
  _reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _credential public.user_credentials%ROWTYPE;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF char_length(btrim(COALESCE(_reason, ''))) NOT BETWEEN 10 AND 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Review reason must be 10 to 1000 characters');
  END IF;
  IF _verified AND (_verification_source IS NULL OR _verification_source NOT IN (
    'issuer_confirmation', 'document_review', 'organisation_training'
  )) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A valid verification source is required');
  END IF;
  IF NOT _verified AND _verification_source IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Revocation must not specify a verification source');
  END IF;

  SELECT * INTO _credential FROM public.user_credentials
  WHERE id = _credential_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credential not found');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.org_members reviewer
    JOIN public.org_members subject ON subject.org_id = reviewer.org_id
    WHERE reviewer.user_id = _actor AND reviewer.role IN ('owner', 'admin', 'manager')
      AND subject.user_id = _credential.user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only organisation managers of the credential owner can review this credential');
  END IF;

  UPDATE public.user_credentials SET
    verified = _verified,
    verified_by = CASE WHEN _verified THEN _actor ELSE NULL END,
    verified_at = CASE WHEN _verified THEN now() ELSE NULL END,
    verification_source = CASE WHEN _verified THEN _verification_source ELSE NULL END,
    verification_reason = btrim(_reason)
  WHERE id = _credential_id;

  INSERT INTO public.credential_verification_history(
    credential_id, subject_user_id, actor_id, previous_verified, new_verified,
    verification_source, reason
  ) VALUES (
    _credential_id, _credential.user_id, _actor, _credential.verified, _verified,
    CASE WHEN _verified THEN _verification_source ELSE NULL END, btrim(_reason)
  );
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, CASE WHEN _verified THEN 'credential_verified' ELSE 'credential_revoked' END,
    'user_credential', _credential_id,
    jsonb_build_object('subject_user_id', _credential.user_id,
      'verification_source', CASE WHEN _verified THEN _verification_source ELSE NULL END,
      'reason', btrim(_reason)));
  RETURN jsonb_build_object('success', true, 'credential_id', _credential_id, 'verified', _verified);
END;
$$;
REVOKE ALL ON FUNCTION public.review_user_credential(UUID,BOOLEAN,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_user_credential(UUID,BOOLEAN,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_verified_user_credential(_user_id UUID, _credential_type TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_credentials c
    WHERE c.user_id = _user_id AND c.credential_type = _credential_type
      AND c.verified AND c.verified_by IS NOT NULL AND c.verified_at IS NOT NULL
      AND c.verification_source IS NOT NULL
      AND (c.expires_at IS NULL OR c.expires_at >= CURRENT_DATE)
  );
$$;
REVOKE ALL ON FUNCTION public.has_verified_user_credential(UUID,TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_user_resource_eligibility(
  _user_id UUID,
  _resource_id UUID,
  _org_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resources r
    JOIN public.organisations o ON o.id = r.org_id
    JOIN public.profiles p ON p.id = _user_id AND p.account_status = 'active'
    JOIN public.org_members m ON m.org_id = _org_id AND m.user_id = _user_id
    WHERE r.id = _resource_id AND r.publication_status = 'published'
      AND o.verification_status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM public.resource_safety_holds h
        WHERE h.resource_id = r.id AND h.released_at IS NULL
          AND (h.expires_at IS NULL OR h.expires_at > now())
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.eligibility_rules er
        WHERE er.resource_id = r.id AND er.is_hard_block
          AND NOT CASE er.rule_type
            WHEN 'org_verification' THEN o.verification_status = 'approved'
            WHEN 'org_membership' THEN m.org_id = r.org_id
            WHEN 'org_restriction' THEN CASE
              WHEN NOT (er.rule_config ? 'allowed_org_ids') THEN true
              WHEN jsonb_typeof(er.rule_config -> 'allowed_org_ids') = 'array' THEN
                jsonb_array_length(er.rule_config -> 'allowed_org_ids') = 0
                OR (er.rule_config -> 'allowed_org_ids') ? _org_id::text
              ELSE false
            END
            WHEN 'credential' THEN public.has_verified_user_credential(
              _user_id, er.rule_config ->> 'credential_type'
            )
            WHEN 'training' THEN public.has_verified_user_credential(
              _user_id, er.rule_config ->> 'training_type'
            )
            WHEN 'approval_required' THEN true
            ELSE false
          END
      )
  );
$$;
REVOKE ALL ON FUNCTION public.check_user_resource_eligibility(UUID,UUID,UUID)
  FROM PUBLIC, anon, authenticated;
