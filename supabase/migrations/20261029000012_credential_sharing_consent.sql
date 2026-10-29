-- User-controlled, recipient-specific consent for minimal credential disclosure.
-- Credential documents and profile data are never returned by this workflow.

CREATE TABLE IF NOT EXISTS public.credential_share_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recipient_org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  purpose TEXT NOT NULL CHECK (char_length(btrim(purpose)) BETWEEN 5 AND 300),
  allowed_attributes TEXT[] NOT NULL CHECK (
    cardinality(allowed_attributes) BETWEEN 1 AND 5
    AND allowed_attributes <@ ARRAY['credential_type','credential_name','issued_at','expires_at','verified']::TEXT[]
  ),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at > granted_at),
  CHECK (expires_at <= granted_at + interval '1 year')
);
CREATE INDEX IF NOT EXISTS idx_credential_share_subject
  ON public.credential_share_consents(subject_user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_credential_share_recipient
  ON public.credential_share_consents(recipient_org_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.credential_share_consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id UUID NOT NULL REFERENCES public.credential_share_consents(id) ON DELETE RESTRICT,
  subject_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recipient_org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('granted','revoked')),
  purpose TEXT NOT NULL,
  allowed_attributes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credential_consent_history_subject
  ON public.credential_share_consent_history(subject_user_id, occurred_at DESC);

ALTER TABLE public.credential_share_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_share_consents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credential_share_consent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_share_consent_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Credential consent parties can view grants" ON public.credential_share_consents;
CREATE POLICY "Credential consent parties can view grants" ON public.credential_share_consents
  FOR SELECT TO authenticated USING (
    subject_user_id = auth.uid()
    OR public.is_org_member(recipient_org_id, auth.uid(), '{owner,admin,manager}')
  );
DROP POLICY IF EXISTS "Credential consent parties can view history" ON public.credential_share_consent_history;
CREATE POLICY "Credential consent parties can view history" ON public.credential_share_consent_history
  FOR SELECT TO authenticated USING (
    subject_user_id = auth.uid()
    OR public.is_org_member(recipient_org_id, auth.uid(), '{owner,admin,manager}')
  );
REVOKE ALL ON public.credential_share_consents, public.credential_share_consent_history
  FROM anon, authenticated;
GRANT SELECT ON public.credential_share_consents, public.credential_share_consent_history
  TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_credential_share_consent(
  _recipient_org_id UUID,
  _purpose TEXT,
  _allowed_attributes TEXT[],
  _expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _consent_id UUID;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF char_length(btrim(COALESCE(_purpose, ''))) NOT BETWEEN 5 AND 300
     OR _allowed_attributes IS NULL
     OR cardinality(_allowed_attributes) NOT BETWEEN 1 AND 5
      OR NOT ('credential_type' = ANY(_allowed_attributes))
     OR NOT (_allowed_attributes <@ ARRAY['credential_type','credential_name','issued_at','expires_at','verified']::TEXT[])
     OR _expires_at IS NULL OR _expires_at <= now() OR _expires_at > now() + interval '1 year' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid consent purpose, attributes, or expiry');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organisations o
    WHERE o.id = _recipient_org_id AND o.verification_status = 'approved'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient organisation must be approved');
  END IF;
  INSERT INTO public.credential_share_consents(
    subject_user_id, recipient_org_id, purpose, allowed_attributes, expires_at
  ) VALUES (_actor, _recipient_org_id, btrim(_purpose), _allowed_attributes, _expires_at)
  RETURNING id INTO _consent_id;
  INSERT INTO public.credential_share_consent_history(
    consent_id, subject_user_id, recipient_org_id, actor_id, action, purpose, allowed_attributes, expires_at
  ) VALUES (_consent_id, _actor, _recipient_org_id, _actor, 'granted',
    btrim(_purpose), _allowed_attributes, _expires_at);
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'credential_share_consent_granted', 'credential_share_consent', _consent_id,
    jsonb_build_object('recipient_org_id', _recipient_org_id, 'purpose', btrim(_purpose),
      'allowed_attributes', _allowed_attributes, 'expires_at', _expires_at));
  RETURN jsonb_build_object('success', true, 'consent_id', _consent_id, 'expires_at', _expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_credential_share_consent(_consent_id UUID, _reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _consent public.credential_share_consents%ROWTYPE;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF char_length(btrim(COALESCE(_reason, ''))) NOT BETWEEN 5 AND 300 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A revocation reason is required');
  END IF;
  SELECT * INTO _consent FROM public.credential_share_consents
  WHERE id = _consent_id FOR UPDATE;
  IF NOT FOUND OR _consent.subject_user_id <> _actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Consent not found or not owned by current user');
  END IF;
  IF _consent.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Consent is already revoked');
  END IF;
  UPDATE public.credential_share_consents SET revoked_at = now() WHERE id = _consent_id;
  INSERT INTO public.credential_share_consent_history(
    consent_id, subject_user_id, recipient_org_id, actor_id, action, purpose, allowed_attributes, expires_at
  ) VALUES (_consent.id, _consent.subject_user_id, _consent.recipient_org_id, _actor, 'revoked',
    _consent.purpose, _consent.allowed_attributes, _consent.expires_at);
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'credential_share_consent_revoked', 'credential_share_consent', _consent_id,
    jsonb_build_object('recipient_org_id', _consent.recipient_org_id, 'reason', btrim(_reason)));
  RETURN jsonb_build_object('success', true, 'consent_id', _consent_id, 'revoked_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_consented_credentials(
  _consent_id UUID,
  _purpose TEXT
)
RETURNS TABLE(
  credential_type TEXT,
  credential_name TEXT,
  issued_at DATE,
  expires_at DATE,
  verified BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _consent public.credential_share_consents%ROWTYPE;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _consent FROM public.credential_share_consents c
  WHERE c.id = _consent_id AND c.purpose = btrim(COALESCE(_purpose, ''))
    AND c.revoked_at IS NULL AND c.expires_at > now()
    AND EXISTS (SELECT 1 FROM public.organisations o
      WHERE o.id = c.recipient_org_id AND o.verification_status = 'approved')
    AND public.is_org_member(c.recipient_org_id, _actor, '{owner,admin,manager}');
  IF NOT FOUND THEN RAISE EXCEPTION 'No active consent for this recipient and purpose'; END IF;
  RETURN QUERY
  SELECT c.credential_type,
    CASE WHEN 'credential_name' = ANY(_consent.allowed_attributes) THEN c.credential_name ELSE NULL END,
    CASE WHEN 'issued_at' = ANY(_consent.allowed_attributes) THEN c.issued_at ELSE NULL END,
    CASE WHEN 'expires_at' = ANY(_consent.allowed_attributes) THEN c.expires_at ELSE NULL END,
    CASE WHEN 'verified' = ANY(_consent.allowed_attributes)
      THEN c.verified AND c.verified_by IS NOT NULL AND c.verified_at IS NOT NULL
        AND c.verification_source IS NOT NULL
      ELSE NULL END
  FROM public.user_credentials c
  WHERE c.user_id = _consent.subject_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_credential_share_consent(UUID,TEXT,TEXT[],TIMESTAMPTZ)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_credential_share_consent(UUID,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_consented_credentials(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_credential_share_consent(UUID,TEXT,TEXT[],TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_credential_share_consent(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consented_credentials(UUID,TEXT) TO authenticated;
