-- One-use booking QR tokens and append-only condition workflows.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.booking_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('check_in','check_out')),
  token_hash BYTEA NOT NULL UNIQUE,
  issued_by UUID NOT NULL REFERENCES public.profiles(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  consumed_by UUID REFERENCES public.profiles(id),
  CHECK (expires_at > issued_at),
  CHECK ((consumed_at IS NULL) = (consumed_by IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_booking_qr_booking_active
  ON public.booking_qr_tokens(booking_id, event_type, expires_at)
  WHERE revoked_at IS NULL AND consumed_at IS NULL;

ALTER TABLE public.condition_reports
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS damage_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.condition_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL CHECK (item_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  label TEXT NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 160),
  required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource_id, item_key)
);
CREATE TABLE IF NOT EXISTS public.condition_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.condition_reports(id) ON DELETE RESTRICT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_condition_evidence_report ON public.condition_evidence(report_id);
CREATE TABLE IF NOT EXISTS public.condition_report_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_report_id UUID NOT NULL REFERENCES public.condition_reports(id) ON DELETE RESTRICT,
  post_report_id UUID NOT NULL UNIQUE REFERENCES public.condition_reports(id) ON DELETE RESTRICT,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE RESTRICT,
  detected_by UUID NOT NULL REFERENCES public.profiles(id),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);
DO $$ BEGIN
  ALTER TABLE public.incidents ADD CONSTRAINT incidents_condition_report_fk
    FOREIGN KEY (condition_report_id) REFERENCES public.condition_reports(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.booking_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_qr_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.condition_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_checklist_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.condition_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE public.condition_report_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_report_discrepancies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants can manage checklist" ON public.condition_checklist_items;
CREATE POLICY "Authenticated users can view active checklists" ON public.condition_checklist_items
  FOR SELECT TO authenticated USING (is_active OR EXISTS (
    SELECT 1 FROM public.resources r WHERE r.id = resource_id
      AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
  ));
CREATE POLICY "Resource staff can manage checklists" ON public.condition_checklist_items
  FOR ALL TO authenticated USING (EXISTS (
    SELECT 1 FROM public.resources r WHERE r.id = resource_id
      AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.resources r WHERE r.id = resource_id
      AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
  ));
DROP POLICY IF EXISTS "Booking participants can view condition evidence" ON public.condition_evidence;
CREATE POLICY "Booking participants can view condition evidence" ON public.condition_evidence
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.condition_reports cr JOIN public.bookings b ON b.id = cr.booking_id
    WHERE cr.id = report_id AND (b.user_id = auth.uid()
      OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}')
      OR EXISTS (SELECT 1 FROM public.resources r WHERE r.id = cr.resource_id
        AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')))
  ));
DROP POLICY IF EXISTS "Booking participants can view discrepancies" ON public.condition_report_discrepancies;
CREATE POLICY "Booking participants can view discrepancies" ON public.condition_report_discrepancies
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.condition_reports cr JOIN public.bookings b ON b.id = cr.booking_id
    JOIN public.resources r ON r.id = cr.resource_id
    WHERE cr.id = post_report_id AND (b.user_id = auth.uid()
      OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
      OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}'))
  ));

REVOKE ALL ON public.booking_qr_tokens, public.condition_evidence, public.condition_report_discrepancies FROM anon, authenticated;
GRANT SELECT ON public.condition_evidence, public.condition_report_discrepancies TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.condition_reports, public.checkin_events FROM authenticated;
GRANT SELECT ON public.condition_reports, public.checkin_events TO authenticated;
REVOKE ALL ON public.condition_checklist_items FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condition_checklist_items TO authenticated;
DROP POLICY IF EXISTS "Participants can record checkins" ON public.checkin_events;
DROP POLICY IF EXISTS "Participants can add reports" ON public.condition_reports;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('condition-evidence', 'condition-evidence', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Booking participants can upload condition evidence" ON storage.objects;
CREATE POLICY "Booking participants can upload condition evidence" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'condition-evidence'
    AND name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9._-]+$'
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = split_part(name, '/', 1)::uuid
      AND (b.user_id = auth.uid()
        OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}')
        OR EXISTS (SELECT 1 FROM public.resources r WHERE r.id = b.resource_id
          AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')))
    )
  );
DROP POLICY IF EXISTS "Booking participants can read condition evidence" ON storage.objects;
CREATE POLICY "Booking participants can read condition evidence" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'condition-evidence'
    AND name ~ '^[0-9a-fA-F-]{36}/[A-Za-z0-9._-]+$'
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = split_part(name, '/', 1)::uuid
      AND (b.user_id = auth.uid()
        OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}')
        OR EXISTS (SELECT 1 FROM public.resources r WHERE r.id = b.resource_id
          AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')))
    )
  );

CREATE OR REPLACE FUNCTION public.issue_booking_qr_token(_booking_id UUID, _event_type TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _booking public.bookings%ROWTYPE;
  _resource_org UUID;
  _token TEXT;
  _token_id UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF _event_type NOT IN ('check_in','check_out') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid check-in event');
  END IF;
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;
  SELECT org_id INTO _resource_org FROM public.resources WHERE id = _booking.resource_id;
  IF _booking.status <> 'confirmed' OR NOT (
    _booking.user_id = _actor OR public.is_org_member(_resource_org, _actor, '{owner,admin,manager}')
  ) THEN RETURN jsonb_build_object('success', false, 'error', 'Booking is not eligible or not accessible'); END IF;
  IF EXISTS (SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = _booking.resource_id
    AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource is under a safety hold');
  END IF;
  IF _event_type = 'check_in' THEN
    IF now() < _booking.starts_at - interval '30 minutes' OR now() > _booking.ends_at
       OR EXISTS (SELECT 1 FROM public.checkin_events WHERE booking_id = _booking_id AND event_type = 'check_in') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Booking is outside check-in window or already checked in');
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.checkin_events WHERE booking_id = _booking_id AND event_type = 'check_in')
       OR EXISTS (SELECT 1 FROM public.checkin_events WHERE booking_id = _booking_id AND event_type = 'check_out')
       OR now() > _booking.ends_at + interval '12 hours' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Booking is not eligible for check-out');
    END IF;
  END IF;
  UPDATE public.booking_qr_tokens SET revoked_at = now()
    WHERE booking_id = _booking_id AND event_type = _event_type
      AND revoked_at IS NULL AND consumed_at IS NULL;
  _token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.booking_qr_tokens(booking_id, resource_id, event_type, token_hash, issued_by, expires_at)
  VALUES (_booking_id, _booking.resource_id, _event_type,
    extensions.digest(convert_to(_token, 'UTF8'), 'sha256'), _actor, now() + interval '15 minutes')
  RETURNING id INTO _token_id;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'booking_qr_issued', 'booking', _booking_id,
    jsonb_build_object('event_type', _event_type, 'token_id', _token_id));
  RETURN jsonb_build_object('success', true, 'token', _token, 'expires_at', now() + interval '15 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_booking_qr_token(
  _token TEXT,
  _resource_id UUID,
  _event_type TEXT,
  _notes TEXT DEFAULT ''
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _booking_id UUID;
  _token_row public.booking_qr_tokens%ROWTYPE;
  _booking public.bookings%ROWTYPE;
  _resource_org UUID;
  _event_id UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF _token IS NULL OR char_length(_token) <> 64 OR _event_type NOT IN ('check_in','check_out')
     OR char_length(COALESCE(_notes,'')) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid QR input');
  END IF;
  SELECT booking_id INTO _booking_id FROM public.booking_qr_tokens
  WHERE token_hash = extensions.digest(convert_to(_token, 'UTF8'), 'sha256');
  IF _booking_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR token is invalid, expired, or already used');
  END IF;
  PERFORM 1 FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  SELECT * INTO _token_row FROM public.booking_qr_tokens
  WHERE token_hash = extensions.digest(convert_to(_token, 'UTF8'), 'sha256') FOR UPDATE;
  IF NOT FOUND OR _token_row.resource_id <> _resource_id OR _token_row.event_type <> _event_type
     OR _token_row.revoked_at IS NOT NULL OR _token_row.consumed_at IS NOT NULL
     OR _token_row.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR token is invalid, expired, or already used');
  END IF;
  SELECT * INTO _booking FROM public.bookings WHERE id = _token_row.booking_id FOR UPDATE;
  SELECT org_id INTO _resource_org FROM public.resources WHERE id = _resource_id;
  IF _booking.resource_id <> _resource_id OR _booking.status <> 'confirmed'
     OR NOT (_booking.user_id = _actor OR public.is_org_member(_resource_org, _actor, '{owner,admin,manager}')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking, resource, or permissions do not match');
  END IF;
  IF EXISTS (SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = _resource_id
    AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource is under a safety hold');
  END IF;
  IF _event_type = 'check_in' THEN
    IF now() < _booking.starts_at - interval '30 minutes' OR now() > _booking.ends_at
       OR EXISTS (SELECT 1 FROM public.checkin_events WHERE booking_id = _booking.id AND event_type = 'check_in') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid or duplicate check-in');
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.checkin_events WHERE booking_id = _booking.id AND event_type = 'check_in')
       OR EXISTS (SELECT 1 FROM public.checkin_events WHERE booking_id = _booking.id AND event_type = 'check_out')
       OR now() > _booking.ends_at + interval '12 hours' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid or duplicate check-out');
    END IF;
  END IF;
  UPDATE public.booking_qr_tokens SET consumed_at = now(), consumed_by = _actor WHERE id = _token_row.id;
  INSERT INTO public.checkin_events(booking_id, event_type, recorded_by, notes)
  VALUES (_booking.id, _event_type, _actor, btrim(COALESCE(_notes,''))) RETURNING id INTO _event_id;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'booking_' || _event_type, 'booking', _booking.id,
    jsonb_build_object('resource_id', _resource_id, 'event_id', _event_id));
  RETURN jsonb_build_object('success', true, 'event_id', _event_id, 'recorded_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.register_condition_evidence(
  _report_id UUID,
  _storage_path TEXT,
  _mime_type TEXT,
  _file_size_bytes BIGINT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _booking_id UUID;
  _resource_id UUID;
  _evidence_id UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT cr.booking_id, cr.resource_id INTO _booking_id, _resource_id
  FROM public.condition_reports cr WHERE cr.id = _report_id;
  IF _booking_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND
      (b.user_id = _actor OR EXISTS (SELECT 1 FROM public.resources r WHERE r.id = _resource_id
        AND public.is_org_member(r.org_id, _actor, '{owner,admin,manager}')))
  ) THEN RETURN jsonb_build_object('success', false, 'error', 'Report not found or not accessible'); END IF;
  IF _storage_path !~ ('^' || _booking_id::text || '/[A-Za-z0-9._-]+$')
     OR _mime_type NOT IN ('image/jpeg','image/png','image/webp')
     OR _file_size_bytes NOT BETWEEN 1 AND 10485760 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid evidence metadata');
  END IF;
  INSERT INTO public.condition_evidence(report_id, uploaded_by, storage_path, mime_type, file_size_bytes)
  VALUES (_report_id, _actor, _storage_path, _mime_type, _file_size_bytes)
  RETURNING id INTO _evidence_id;
  RETURN jsonb_build_object('success', true, 'evidence_id', _evidence_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_condition_report(
  _booking_id UUID,
  _resource_id UUID,
  _report_type TEXT,
  _condition TEXT,
  _description TEXT DEFAULT '',
  _checklist JSONB DEFAULT '{}'::jsonb,
  _damage_flag BOOLEAN DEFAULT false
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _booking public.bookings%ROWTYPE;
  _resource_org UUID;
  _report_id UUID;
  _version INTEGER;
  _pre public.condition_reports%ROWTYPE;
  _incident_id UUID;
  _discrepancy BOOLEAN := false;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF _report_type NOT IN ('pre_use','post_use') OR _condition NOT IN ('excellent','good','fair','poor','damaged')
     OR char_length(COALESCE(_description,'')) > 5000 OR jsonb_typeof(_checklist) <> 'object'
     OR octet_length(_checklist::text) > 20000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid condition report');
  END IF;
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR _booking.resource_id <> _resource_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking and resource do not match');
  END IF;
  SELECT org_id INTO _resource_org FROM public.resources WHERE id = _resource_id;
  IF NOT (_booking.user_id = _actor OR public.is_org_member(_resource_org, _actor, '{owner,admin,manager}')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorised to submit this report');
  END IF;
  IF _booking.status NOT IN ('confirmed','completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Condition reports require a confirmed or completed booking');
  END IF;
  IF _report_type = 'pre_use' AND EXISTS (SELECT 1 FROM public.checkin_events
    WHERE booking_id = _booking_id AND event_type = 'check_in') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pre-use report must be submitted before check-in');
  END IF;
  IF _report_type = 'post_use' AND NOT EXISTS (SELECT 1 FROM public.checkin_events
    WHERE booking_id = _booking_id AND event_type = 'check_in') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Post-use report requires a recorded check-in');
  END IF;
  IF EXISTS (SELECT 1 FROM public.condition_checklist_items ci WHERE ci.resource_id = _resource_id
      AND ci.is_active AND ci.required AND NOT (_checklist ? ci.item_key)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A required checklist item is missing');
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(_checklist) e
      WHERE NOT EXISTS (SELECT 1 FROM public.condition_checklist_items ci
        WHERE ci.resource_id = _resource_id AND ci.item_key = e.key AND ci.is_active)
      OR jsonb_typeof(e.value) <> 'string'
      OR e.value #>> '{}' NOT IN ('excellent','good','fair','poor','damaged','not_applicable')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Checklist contains an unknown item');
  END IF;
  SELECT COALESCE(max(report_version),0) + 1 INTO _version FROM public.condition_reports
  WHERE booking_id = _booking_id AND report_type = _report_type;
  INSERT INTO public.condition_reports(booking_id, resource_id, report_type, condition, description,
    reported_by, checklist, damage_flag, report_version)
  VALUES (_booking_id, _resource_id, _report_type, _condition, btrim(COALESCE(_description,'')),
    _actor, _checklist, _damage_flag, _version) RETURNING id INTO _report_id;

  IF _report_type = 'post_use' THEN
    SELECT * INTO _pre FROM public.condition_reports WHERE booking_id = _booking_id AND report_type = 'pre_use'
    ORDER BY report_version DESC LIMIT 1;
    IF FOUND THEN
      _discrepancy := _damage_flag
        OR (_condition IN ('poor','damaged') AND _pre.condition IN ('excellent','good','fair'))
        OR EXISTS (
          SELECT 1 FROM jsonb_each(_checklist) post_item
          JOIN jsonb_each(_pre.checklist) pre_item ON pre_item.key = post_item.key
          WHERE post_item.value #>> '{}' IN ('poor','damaged')
            AND pre_item.value IS DISTINCT FROM post_item.value
        );
      IF _discrepancy THEN
        INSERT INTO public.incidents(resource_id, booking_id, reported_by, severity, title, description, condition_report_id)
        VALUES (_resource_id, _booking_id, _actor,
          CASE WHEN _damage_flag OR _condition = 'damaged' THEN 'high' ELSE 'medium' END,
          'Condition discrepancy requires review',
          COALESCE(NULLIF(btrim(_description),''), 'Post-use condition is worse than the submitted pre-use condition.'),
          _report_id) RETURNING id INTO _incident_id;
        INSERT INTO public.incident_history(incident_id, actor_id, action, new_status, reason)
        VALUES (_incident_id, _actor, 'reported', 'open', 'Created from condition report discrepancy');
        INSERT INTO public.condition_report_discrepancies(pre_report_id, post_report_id, incident_id, detected_by, details)
        VALUES (_pre.id, _report_id, _incident_id, _actor,
          jsonb_build_object('pre_condition', _pre.condition, 'post_condition', _condition, 'damage_flag', _damage_flag));
        INSERT INTO public.notifications(user_id, type, title, body, metadata)
        SELECT om.user_id, 'incident_reported', 'Condition discrepancy reported',
          'A post-use report requires review.', jsonb_build_object('incident_id', _incident_id, 'booking_id', _booking_id)
        FROM public.org_members om WHERE om.org_id = _resource_org AND om.role IN ('owner','admin','manager');
        INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
        VALUES (_actor, 'condition_discrepancy_detected', 'condition_report', _report_id,
          jsonb_build_object('incident_id', _incident_id, 'pre_report_id', _pre.id));
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('success', true, 'report_id', _report_id, 'report_version', _version,
    'discrepancy', _discrepancy, 'incident_id', _incident_id);
END;
$$;

REVOKE ALL ON FUNCTION public.issue_booking_qr_token(UUID,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_booking_qr_token(TEXT,UUID,TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_condition_evidence(UUID,TEXT,TEXT,BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_condition_report(UUID,UUID,TEXT,TEXT,TEXT,JSONB,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_booking_qr_token(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_booking_qr_token(TEXT,UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_condition_evidence(UUID,TEXT,TEXT,BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_condition_report(UUID,UUID,TEXT,TEXT,TEXT,JSONB,BOOLEAN) TO authenticated;
