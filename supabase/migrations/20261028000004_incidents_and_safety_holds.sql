-- Incident workflow and resource safety holds.
-- Existing in-progress bookings are not cancelled by a hold; future overlapping
-- bookings are cancelled and their bookers are notified in the same transaction.

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS condition_report_id UUID;

CREATE TABLE IF NOT EXISTS public.incident_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('reported','assigned','status_changed','resolved','closed')),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incident_history_incident
  ON public.incident_history(incident_id, created_at);

CREATE TABLE IF NOT EXISTS public.incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE RESTRICT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_id, storage_path)
);
  INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('incident-evidence', 'incident-evidence', false, 10485760,
    ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
  ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
  DROP POLICY IF EXISTS "Incident participants can upload evidence" ON storage.objects;
  CREATE POLICY "Incident participants can upload evidence" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
      bucket_id = 'incident-evidence'
      AND name ~ '^incidents/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$'
      AND EXISTS (
        SELECT 1 FROM public.incidents i JOIN public.resources r ON r.id = i.resource_id
        WHERE i.id = split_part(name, '/', 2)::uuid AND
          (i.reported_by = auth.uid() OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}'))
      )
    );
  DROP POLICY IF EXISTS "Incident participants can read evidence" ON storage.objects;
  CREATE POLICY "Incident participants can read evidence" ON storage.objects
    FOR SELECT TO authenticated USING (
      bucket_id = 'incident-evidence'
      AND name ~ '^incidents/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$'
      AND EXISTS (
        SELECT 1 FROM public.incidents i JOIN public.resources r ON r.id = i.resource_id
        WHERE i.id = split_part(name, '/', 2)::uuid AND
          (i.reported_by = auth.uid() OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}'))
      )
    );
CREATE INDEX IF NOT EXISTS idx_incident_evidence_incident ON public.incident_evidence(incident_id);

CREATE TABLE IF NOT EXISTS public.resource_safety_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 1000),
  placed_by UUID NOT NULL REFERENCES public.profiles(id),
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  released_by UUID REFERENCES public.profiles(id),
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  CHECK ((released_at IS NULL) = (released_by IS NULL)),
  CHECK ((released_at IS NULL) = (release_reason IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_unreleased_safety_hold
  ON public.resource_safety_holds(resource_id) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_safety_holds_resource_expiry
  ON public.resource_safety_holds(resource_id, expires_at);

ALTER TABLE public.incident_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE public.resource_safety_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_safety_holds FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Incident participants can view history" ON public.incident_history;
CREATE POLICY "Incident participants can view history" ON public.incident_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.incidents i JOIN public.resources r ON r.id = i.resource_id
      WHERE i.id = incident_id AND (
        i.reported_by = auth.uid() OR i.assigned_to = auth.uid()
        OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
      )
    )
  );
DROP POLICY IF EXISTS "Incident participants can view evidence" ON public.incident_evidence;
CREATE POLICY "Incident participants can view evidence" ON public.incident_evidence
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.incidents i JOIN public.resources r ON r.id = i.resource_id
      WHERE i.id = incident_id AND (
        i.reported_by = auth.uid() OR i.assigned_to = auth.uid()
        OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
      )
    )
  );
DROP POLICY IF EXISTS "Org staff can view safety holds" ON public.resource_safety_holds;
CREATE POLICY "Org staff can view safety holds" ON public.resource_safety_holds
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_id
        AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
    )
  );

REVOKE ALL ON public.incident_history, public.incident_evidence, public.resource_safety_holds FROM anon, authenticated;
GRANT SELECT ON public.incident_history, public.incident_evidence, public.resource_safety_holds TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.incidents FROM authenticated;
GRANT SELECT ON public.incidents TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notifications, public.audit_log FROM authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "Users can report incidents" ON public.incidents;
DROP POLICY IF EXISTS "Org managers can update incidents" ON public.incidents;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert audit entries" ON public.audit_log;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_notification_content()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF ROW(NEW.id,NEW.user_id,NEW.type,NEW.title,NEW.body,NEW.metadata,NEW.created_at)
     IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.type,OLD.title,OLD.body,OLD.metadata,OLD.created_at) THEN
    RAISE EXCEPTION 'Notification content is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_notification_protect ON public.notifications;
CREATE TRIGGER on_notification_protect BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notification_content();

CREATE OR REPLACE FUNCTION public.protect_booking_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND current_setting('sharesphere.allow_booking_status_transition', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Use transition_booking_status() to change booking status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_incident(
  _resource_id UUID,
  _severity TEXT,
  _title TEXT,
  _description TEXT,
  _booking_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _incident_id UUID;
  _resource_org UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF _severity NOT IN ('low','medium','high','critical')
     OR char_length(btrim(_title)) NOT BETWEEN 2 AND 200
     OR char_length(btrim(_description)) NOT BETWEEN 5 AND 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid incident details');
  END IF;
  SELECT org_id INTO _resource_org FROM public.resources WHERE id = _resource_id;
  IF _resource_org IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Resource not found'); END IF;
  IF _booking_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.resource_id = _resource_id
      AND (b.user_id = _actor OR public.is_org_member(_resource_org, _actor, '{owner,admin,manager}'))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking does not belong to this resource or is not accessible');
  END IF;

  INSERT INTO public.incidents(resource_id, booking_id, reported_by, severity, title, description)
  VALUES (_resource_id, _booking_id, _actor, _severity, btrim(_title), btrim(_description))
  RETURNING id INTO _incident_id;
  INSERT INTO public.incident_history(incident_id, actor_id, action, new_status, reason)
  VALUES (_incident_id, _actor, 'reported', 'open', btrim(_description));
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'incident_reported', 'incident', _incident_id,
    jsonb_build_object('resource_id', _resource_id, 'severity', _severity));
  INSERT INTO public.notifications(user_id, type, title, body, metadata)
  SELECT om.user_id, 'incident_reported', 'Incident reported', btrim(_title),
    jsonb_build_object('incident_id', _incident_id, 'resource_id', _resource_id)
  FROM public.org_members om
  WHERE om.org_id = _resource_org AND om.role IN ('owner','admin','manager') AND om.user_id <> _actor;
  RETURN jsonb_build_object('success', true, 'incident_id', _incident_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_incident(
  _incident_id UUID,
  _new_status TEXT,
  _reason TEXT DEFAULT '',
  _assignee_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _incident public.incidents%ROWTYPE;
  _org_id UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT i.* INTO _incident FROM public.incidents i WHERE i.id = _incident_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Incident not found'); END IF;
  SELECT org_id INTO _org_id FROM public.resources WHERE id = _incident.resource_id;
  IF NOT public.is_org_member(_org_id, _actor, '{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can review incidents');
  END IF;
  IF _new_status NOT IN ('open','investigating','resolved','closed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid incident status');
  END IF;
  IF _new_status IN ('resolved','closed') AND char_length(btrim(_reason)) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A resolution reason of at least 5 characters is required');
  END IF;
  IF _assignee_id IS NOT NULL AND NOT public.is_org_member(_org_id, _assignee_id, '{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignee must be resource-owning organisation staff');
  END IF;

  UPDATE public.incidents SET status = _new_status,
    assigned_to = COALESCE(_assignee_id, assigned_to),
    assigned_by = CASE WHEN _assignee_id IS NOT NULL THEN _actor ELSE assigned_by END,
    resolved_by = CASE WHEN _new_status IN ('resolved','closed') THEN _actor
                       WHEN _new_status IN ('open','investigating') THEN NULL ELSE resolved_by END,
    resolved_at = CASE WHEN _new_status IN ('resolved','closed') THEN now()
                       WHEN _new_status IN ('open','investigating') THEN NULL ELSE resolved_at END,
    resolution = CASE WHEN _new_status IN ('resolved','closed') THEN btrim(_reason)
                      WHEN _new_status IN ('open','investigating') THEN NULL ELSE resolution END
  WHERE id = _incident_id;
  INSERT INTO public.incident_history(incident_id, actor_id, action, previous_status, new_status, reason)
  VALUES (_incident_id, _actor,
    CASE WHEN _assignee_id IS NOT NULL THEN 'assigned'
         WHEN _new_status IN ('resolved','closed') THEN _new_status ELSE 'status_changed' END,
    _incident.status, _new_status, btrim(_reason));
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'incident_status_changed', 'incident', _incident_id,
    jsonb_build_object('from', _incident.status, 'to', _new_status, 'assignee_id', _assignee_id, 'reason', btrim(_reason)));
  IF _new_status IN ('resolved','closed') THEN
    INSERT INTO public.notifications(user_id, type, title, body, metadata)
    VALUES (_incident.reported_by, 'incident_resolved', 'Incident reviewed', btrim(_reason),
      jsonb_build_object('incident_id', _incident_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'incident_id', _incident_id, 'status', _new_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_incident_evidence(
  _incident_id UUID,
  _storage_path TEXT,
  _mime_type TEXT,
  _file_size_bytes BIGINT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _org_id UUID;
  _evidence_id UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT r.org_id INTO _org_id FROM public.incidents i JOIN public.resources r ON r.id = i.resource_id
  WHERE i.id = _incident_id;
  IF _org_id IS NULL OR NOT (
    public.is_org_member(_org_id, _actor, '{owner,admin,manager}')
    OR EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = _incident_id AND i.reported_by = _actor)
  ) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorised to attach evidence'); END IF;
  IF _storage_path !~ ('^incidents/' || _incident_id::text || '/[A-Za-z0-9._/-]+$')
     OR _mime_type NOT IN ('image/jpeg','image/png','image/webp','application/pdf')
     OR _file_size_bytes NOT BETWEEN 1 AND 10485760 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid evidence metadata');
  END IF;
  INSERT INTO public.incident_evidence(incident_id, uploaded_by, storage_path, mime_type, file_size_bytes)
  VALUES (_incident_id, _actor, _storage_path, _mime_type, _file_size_bytes)
  RETURNING id INTO _evidence_id;
  RETURN jsonb_build_object('success', true, 'evidence_id', _evidence_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.place_resource_safety_hold(
  _resource_id UUID,
  _reason TEXT,
  _expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _org_id UUID;
  _hold_id UUID;
  _booking RECORD;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT org_id INTO _org_id FROM public.resources WHERE id = _resource_id FOR UPDATE;
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Resource not found'); END IF;
  IF NOT public.is_org_member(_org_id, _actor, '{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can place a safety hold');
  END IF;
  IF char_length(btrim(_reason)) NOT BETWEEN 5 AND 1000
     OR (_expires_at IS NOT NULL AND (_expires_at <= now() OR _expires_at > now() + interval '30 days')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provide a valid reason and an expiry within 30 days');
  END IF;
  UPDATE public.resource_safety_holds SET released_at = expires_at, released_by = placed_by,
    release_reason = 'Automatically expired'
  WHERE resource_id = _resource_id AND released_at IS NULL AND expires_at <= now();
  IF EXISTS (SELECT 1 FROM public.resource_safety_holds WHERE resource_id = _resource_id AND released_at IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource already has an active safety hold');
  END IF;
  INSERT INTO public.resource_safety_holds(resource_id, reason, placed_by, expires_at)
  VALUES (_resource_id, btrim(_reason), _actor, _expires_at) RETURNING id INTO _hold_id;

  PERFORM set_config('sharesphere.allow_booking_status_transition', 'on', true);
  FOR _booking IN
    SELECT b.id, b.user_id, b.status FROM public.bookings b
    WHERE b.resource_id = _resource_id AND b.status IN ('pending_approval','confirmed')
      AND b.starts_at > now() AND b.starts_at < COALESCE(_expires_at, 'infinity'::timestamptz)
    FOR UPDATE
  LOOP
    UPDATE public.bookings SET status = 'cancelled', cancelled_by = _actor,
      cancellation_reason = 'Cancelled due to safety hold: ' || btrim(_reason)
    WHERE id = _booking.id;
    INSERT INTO public.booking_history(booking_id, previous_status, new_status, changed_by, reason)
    VALUES (_booking.id, _booking.status, 'cancelled', _actor, 'Safety hold: ' || btrim(_reason));
    INSERT INTO public.notifications(user_id, type, title, body, metadata)
    VALUES (_booking.user_id, 'booking_cancelled', 'Booking cancelled for safety', btrim(_reason),
      jsonb_build_object('booking_id', _booking.id, 'resource_id', _resource_id, 'safety_hold_id', _hold_id));
  END LOOP;
  PERFORM set_config('sharesphere.allow_booking_status_transition', 'off', true);
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'resource_safety_hold_placed', 'resource_safety_hold', _hold_id,
    jsonb_build_object('resource_id', _resource_id, 'reason', btrim(_reason), 'expires_at', _expires_at));
  RETURN jsonb_build_object('success', true, 'hold_id', _hold_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_resource_safety_hold(
  _hold_id UUID,
  _reason TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _resource_id UUID;
  _org_id UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT h.resource_id, r.org_id INTO _resource_id, _org_id
  FROM public.resource_safety_holds h JOIN public.resources r ON r.id = h.resource_id
  WHERE h.id = _hold_id FOR UPDATE OF h;
  IF _resource_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Safety hold not found'); END IF;
  IF NOT public.is_org_member(_org_id, _actor, '{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can release a safety hold');
  END IF;
  IF char_length(btrim(_reason)) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A release reason of at least 5 characters is required');
  END IF;
  UPDATE public.resource_safety_holds SET released_by = _actor, released_at = now(), release_reason = btrim(_reason)
  WHERE id = _hold_id AND released_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Safety hold is already released'); END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'resource_safety_hold_released', 'resource_safety_hold', _hold_id,
    jsonb_build_object('resource_id', _resource_id, 'reason', btrim(_reason)));
  RETURN jsonb_build_object('success', true, 'hold_id', _hold_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_booking_status(
  _booking_id UUID,
  _new_status TEXT,
  _reason TEXT DEFAULT ''
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _resource_id UUID;
  _booking public.bookings%ROWTYPE;
  _resource_org UUID;
  _is_booker BOOLEAN;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT resource_id INTO _resource_id FROM public.bookings WHERE id = _booking_id;
  IF _resource_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text,0));
  PERFORM 1 FROM public.resources WHERE id = _resource_id FOR UPDATE;
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;
  SELECT org_id INTO _resource_org FROM public.resources WHERE id = _booking.resource_id;
  _is_booker := _booking.user_id = _actor;

  IF _booking.status = 'pending_approval' AND _new_status IN ('confirmed','rejected') THEN
    IF NOT public.is_org_member(_resource_org, _actor, '{owner,admin,manager}') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can review bookings');
    END IF;
  ELSIF _booking.status IN ('pending_approval','confirmed') AND _new_status = 'cancelled' THEN
    IF NOT (_is_booker OR public.is_org_member(_resource_org, _actor, '{owner,admin,manager}')) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorised to cancel this booking');
    END IF;
  ELSIF _booking.status = 'confirmed' AND _new_status = 'rescheduling_requested' THEN
    IF NOT _is_booker THEN RETURN jsonb_build_object('success', false, 'error', 'Only the booker can request rescheduling'); END IF;
  ELSIF _booking.status = 'confirmed' AND _new_status IN ('completed','no_show') THEN
    IF NOT public.is_org_member(_resource_org, _actor, '{owner,admin,manager}') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can update this booking');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid booking status transition');
  END IF;

  PERFORM set_config('sharesphere.allow_booking_status_transition', 'on', true);
  UPDATE public.bookings SET status = _new_status,
    approved_by = CASE WHEN _new_status = 'confirmed' THEN _actor ELSE approved_by END,
    cancelled_by = CASE WHEN _new_status = 'cancelled' THEN _actor ELSE cancelled_by END,
    cancellation_reason = CASE WHEN _new_status = 'cancelled' THEN btrim(_reason) ELSE cancellation_reason END
  WHERE id = _booking_id;
  PERFORM set_config('sharesphere.allow_booking_status_transition', 'off', true);
  INSERT INTO public.booking_history(booking_id, previous_status, new_status, changed_by, reason)
  VALUES (_booking_id, _booking.status, _new_status, _actor, btrim(_reason));
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'booking_status_change', 'booking', _booking_id,
    jsonb_build_object('from', _booking.status, 'to', _new_status, 'reason', btrim(_reason)));
  IF _new_status = 'cancelled' THEN
    PERFORM public.offer_waitlist_slot(_booking.resource_id, _booking.starts_at, _booking.ends_at);
  END IF;
  RETURN jsonb_build_object('success', true, 'previous_status', _booking.status, 'new_status', _new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.report_incident(UUID,TEXT,TEXT,TEXT,UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_incident(UUID,TEXT,TEXT,UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_incident_evidence(UUID,TEXT,TEXT,BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.place_resource_safety_hold(UUID,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_resource_safety_hold(UUID,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_booking_status(UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_incident(UUID,TEXT,TEXT,TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_incident(UUID,TEXT,TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_incident_evidence(UUID,TEXT,TEXT,BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_resource_safety_hold(UUID,TEXT,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_resource_safety_hold(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_booking_status(UUID,TEXT,TEXT) TO authenticated;
