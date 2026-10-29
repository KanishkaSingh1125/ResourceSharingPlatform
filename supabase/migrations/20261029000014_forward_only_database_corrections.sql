-- Forward-only corrections for notification/audit writes, booking rescheduling,
-- organisation verification review, and owner membership assignment.

-- Remove legacy permissive insert policies and table privileges. Trusted
-- SECURITY DEFINER functions remain the write path for application events.
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert audit entries" ON public.audit_log;
REVOKE INSERT, UPDATE, DELETE ON public.notifications, public.audit_log
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications, public.audit_log TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications, public.audit_log TO service_role;

-- Keep the membership predicates used by RLS from exposing arbitrary users'
-- membership status through the public RPC surface.
CREATE OR REPLACE FUNCTION public._is_org_member_internal(
  _org_id UUID,
  _user_id UUID,
  _min_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = _user_id AND role = ANY(_min_roles)
  );
$$;
REVOKE ALL ON FUNCTION public._is_org_member_internal(UUID, UUID, TEXT[])
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_org_member(
  _org_id UUID,
  _user_id UUID,
  _min_roles TEXT[] DEFAULT '{owner,admin,manager,member}'
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT _user_id IS NOT DISTINCT FROM auth.uid()
    AND public._is_org_member_internal(_org_id, _user_id, _min_roles);
$$;
REVOKE ALL ON FUNCTION public.is_org_member(UUID, UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID, TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT _user_id IS NOT DISTINCT FROM auth.uid()
    AND public._is_org_member_internal(_org_id, _user_id, ARRAY['owner', 'admin']::TEXT[]);
$$;
REVOKE ALL ON FUNCTION public.is_org_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID, UUID) TO authenticated;

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
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT i.* INTO _incident FROM public.incidents i
  WHERE i.id = _incident_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  SELECT org_id INTO _org_id FROM public.resources WHERE id = _incident.resource_id;
  IF NOT public.is_org_member(_org_id, _actor, '{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can review incidents');
  END IF;
  IF _new_status NOT IN ('open', 'investigating', 'resolved', 'closed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid incident status');
  END IF;
  IF _new_status IN ('resolved', 'closed') AND char_length(btrim(_reason)) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A resolution reason of at least 5 characters is required');
  END IF;
  IF _assignee_id IS NOT NULL AND NOT public._is_org_member_internal(
    _org_id, _assignee_id, ARRAY['owner', 'admin', 'manager']::TEXT[]
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignee must be resource-owning organisation staff');
  END IF;

  UPDATE public.incidents SET status = _new_status,
    assigned_to = COALESCE(_assignee_id, assigned_to),
    assigned_by = CASE WHEN _assignee_id IS NOT NULL THEN _actor ELSE assigned_by END,
    resolved_by = CASE WHEN _new_status IN ('resolved', 'closed') THEN _actor
                       WHEN _new_status IN ('open', 'investigating') THEN NULL ELSE resolved_by END,
    resolved_at = CASE WHEN _new_status IN ('resolved', 'closed') THEN now()
                       WHEN _new_status IN ('open', 'investigating') THEN NULL ELSE resolved_at END,
    resolution = CASE WHEN _new_status IN ('resolved', 'closed') THEN btrim(_reason)
                      WHEN _new_status IN ('open', 'investigating') THEN NULL ELSE resolution END
  WHERE id = _incident_id;
  INSERT INTO public.incident_history(incident_id, actor_id, action, previous_status, new_status, reason)
  VALUES (_incident_id, _actor,
    CASE WHEN _assignee_id IS NOT NULL THEN 'assigned'
         WHEN _new_status IN ('resolved', 'closed') THEN _new_status ELSE 'status_changed' END,
    _incident.status, _new_status, btrim(_reason));
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'incident_status_changed', 'incident', _incident_id,
    jsonb_build_object('from', _incident.status, 'to', _new_status,
      'assignee_id', _assignee_id, 'reason', btrim(_reason)));
  IF _new_status IN ('resolved', 'closed') THEN
    INSERT INTO public.notifications(user_id, type, title, body, metadata)
    VALUES (_incident.reported_by, 'incident_resolved', 'Incident reviewed', btrim(_reason),
      jsonb_build_object('incident_id', _incident_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'incident_id', _incident_id, 'status', _new_status);
END;
$$;

-- Use the shared slot validator introduced in migration 00008. It checks active
-- offers as well as bookings, availability, holds, and maintenance.
CREATE OR REPLACE FUNCTION public.reschedule_booking(
  _booking_id UUID,
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _booking public.bookings%ROWTYPE;
  _resource_id UUID;
  _org_id UUID;
  _issues TEXT[];
  _policy public.fairshare_policy%ROWTYPE;
  _week_start TIMESTAMPTZ;
  _week_count INTEGER;
  _user_lock_key BIGINT;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT resource_id INTO _resource_id
  FROM public.bookings WHERE id = _booking_id;
  IF _resource_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text, 0));
  _user_lock_key := hashtextextended('booking-limit:' || _actor::text, 0);
  PERFORM pg_advisory_xact_lock(_user_lock_key);
  PERFORM 1 FROM public.resources WHERE id = _resource_id FOR UPDATE;
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR _booking.user_id <> _actor
     OR _booking.status NOT IN ('confirmed', 'rescheduling_requested') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking cannot be rescheduled by this user');
  END IF;

  _issues := public.booking_slot_issues(_resource_id, _starts_at, _ends_at, _booking_id);
  IF cardinality(_issues) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', array_to_string(_issues, '; '));
  END IF;
  _org_id := public.eligible_org_for_resource(_actor, _resource_id);
  IF _org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Eligibility check failed');
  END IF;

  SELECT * INTO _policy FROM public.fairshare_policy
  WHERE is_active ORDER BY created_at DESC LIMIT 1;
  _week_start := date_trunc('week', _starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  SELECT count(*) INTO _week_count FROM public.bookings b
  WHERE b.user_id = _actor AND b.id <> _booking_id
    AND b.starts_at >= _week_start AND b.starts_at < _week_start + interval '1 week'
    AND b.status IN ('pending_approval', 'confirmed', 'rescheduling_requested', 'completed', 'no_show');
  IF _week_count >= COALESCE(_policy.max_bookings_per_week, 5) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Weekly FairShare booking limit reached');
  END IF;

  PERFORM set_config('sharesphere.allow_booking_status_transition', 'on', true);
  UPDATE public.bookings SET starts_at = _starts_at, ends_at = _ends_at, org_id = _org_id,
    status = 'confirmed' WHERE id = _booking_id;
  PERFORM set_config('sharesphere.allow_booking_status_transition', 'off', true);
  INSERT INTO public.booking_history(booking_id, previous_status, new_status, changed_by, reason)
  VALUES (_booking_id, _booking.status, 'confirmed', _actor, 'Booking rescheduled');
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'booking_rescheduled', 'booking', _booking_id,
    jsonb_build_object('previous_starts_at', _booking.starts_at, 'previous_ends_at', _booking.ends_at,
      'starts_at', _starts_at, 'ends_at', _ends_at));
  PERFORM public.offer_waitlist_slot(_resource_id, _booking.starts_at, _booking.ends_at);
  RETURN jsonb_build_object('success', true, 'booking_id', _booking_id,
    'starts_at', _starts_at, 'ends_at', _ends_at);
END;
$$;
REVOKE ALL ON FUNCTION public.reschedule_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated;

-- A reviewer must have a server-managed JWT app_metadata claim. Membership in
-- the organisation being reviewed remains disqualifying, including member role.
-- Status changes are allowed only while executing their SECURITY DEFINER RPC,
-- not because a caller set a user-configurable custom GUC.
CREATE OR REPLACE FUNCTION public.protect_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND current_user <> 'service_role'
     AND current_user IS DISTINCT FROM (
       SELECT pg_catalog.pg_get_userbyid(p.proowner)
       FROM pg_catalog.pg_proc p
       WHERE p.oid = pg_catalog.to_regprocedure(
         'public.transition_booking_status(uuid,text,text)'
       )
     ) THEN
    RAISE EXCEPTION 'Use transition_booking_status() to change booking status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_org_verification_status()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND current_user <> 'service_role'
     AND current_user IS DISTINCT FROM (
       SELECT pg_catalog.pg_get_userbyid(p.proowner)
       FROM pg_catalog.pg_proc p
       WHERE p.oid = pg_catalog.to_regprocedure(
         'public.transition_verification_status(uuid,text,text)'
       )
     ) THEN
    RAISE EXCEPTION 'Use transition_verification_status() to change verification status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_verification_status(
  _org_id UUID,
  _new_status TEXT,
  _reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _current_status TEXT;
  _actor UUID := auth.uid();
  _platform_role TEXT := auth.jwt() -> 'app_metadata' ->> 'role';
  _is_org_member BOOLEAN;
  _is_org_admin BOOLEAN;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT verification_status INTO _current_status
  FROM public.organisations WHERE id = _org_id FOR UPDATE;
  IF _current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organisation not found');
  END IF;

  _is_org_member := public.is_org_member(_org_id, _actor);
  _is_org_admin := public.is_org_admin(_org_id, _actor);

  IF _current_status = 'draft' AND _new_status = 'submitted' THEN
    IF NOT _is_org_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only organisation admins can submit for verification');
    END IF;
  ELSIF _current_status = 'additional_information_required' AND _new_status = 'submitted' THEN
    IF NOT _is_org_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only organisation admins can resubmit');
    END IF;
  ELSIF (_current_status = 'submitted' AND _new_status = 'under_review')
     OR (_current_status = 'under_review' AND _new_status IN ('approved', 'rejected', 'additional_information_required'))
     OR _new_status = 'suspended' THEN
    IF _platform_role IS DISTINCT FROM 'platform_admin' OR _is_org_member THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only an unrelated platform admin can review this organisation');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error',
      format('Invalid transition: %s to %s', _current_status, _new_status));
  END IF;

  UPDATE public.organisations SET verification_status = _new_status WHERE id = _org_id;
  INSERT INTO public.verification_decisions(org_id, previous_status, new_status, reason, decided_by)
  VALUES (_org_id, _current_status, _new_status, _reason, _actor);
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'verification_status_change', 'organisation', _org_id,
    jsonb_build_object('from', _current_status, 'to', _new_status, 'reason', _reason));

  RETURN jsonb_build_object('success', true, 'previous_status', _current_status, 'new_status', _new_status);
END;
$$;
REVOKE ALL ON FUNCTION public.transition_verification_status(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_verification_status(UUID, TEXT, TEXT)
  TO authenticated;

-- Only the organisation creator may be bootstrapped as owner by the org-create
-- trigger. An org admin cannot assign owner to another account with invited_by
-- omitted.
CREATE OR REPLACE FUNCTION public.protect_member_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _actor_role TEXT;
BEGIN
  IF NEW.user_id = _actor AND TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'owner'
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    IF NEW.invited_by IS NOT NULL
       OR NEW.user_id IS DISTINCT FROM _actor
       OR NOT EXISTS (
         SELECT 1 FROM public.organisations o
         WHERE o.id = NEW.org_id AND o.created_by = _actor
       ) THEN
      RAISE EXCEPTION 'Only the organisation creator may be bootstrapped as owner';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IN ('owner', 'admin')
     AND NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT role INTO _actor_role FROM public.org_members
    WHERE org_id = NEW.org_id AND user_id = _actor;
    IF _actor_role IS DISTINCT FROM 'owner' THEN
      RAISE EXCEPTION 'Only owners can promote members to owner or admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
