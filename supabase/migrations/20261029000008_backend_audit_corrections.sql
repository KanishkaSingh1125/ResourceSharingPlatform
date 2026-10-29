-- Forward-only corrections for the audited backend migrations 00004-00007.
-- This migration does not rewrite migration history and must run after 00007.

-- Keep booking availability semantics identical for creation, rescheduling, and matching.
CREATE OR REPLACE FUNCTION public.booking_within_availability(
  _resource_id UUID,
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN _starts_at IS NULL OR _ends_at IS NULL OR _ends_at <= _starts_at THEN false
    WHEN NOT EXISTS (SELECT 1 FROM public.availability_windows WHERE resource_id = _resource_id) THEN true
    ELSE NOT EXISTS (
      SELECT 1
      FROM generate_series(
        (_starts_at AT TIME ZONE 'UTC')::date::timestamp,
        ((_ends_at - interval '1 microsecond') AT TIME ZONE 'UTC')::date::timestamp,
        interval '1 day'
      ) AS d(day_start)
      CROSS JOIN LATERAL (
        SELECT greatest(_starts_at, d.day_start AT TIME ZONE 'UTC') AS segment_start,
          least(_ends_at, (d.day_start + interval '1 day') AT TIME ZONE 'UTC') AS segment_end
      ) AS segment
      WHERE NOT EXISTS (
        SELECT 1 FROM public.availability_windows w
        WHERE w.resource_id = _resource_id
          AND w.day_of_week = extract(dow FROM d.day_start)::integer
          AND (segment.segment_start AT TIME ZONE 'UTC')::time >= w.start_time
          AND (segment.segment_end AT TIME ZONE 'UTC')::time <= w.end_time
      )
    )
  END;
$$;
REVOKE ALL ON FUNCTION public.booking_within_availability(UUID,TIMESTAMPTZ,TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;

-- Shared by booking creation, rescheduling, and matching to prevent drift.
CREATE OR REPLACE FUNCTION public.booking_slot_issues(
  _resource_id UUID,
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ,
  _exclude_booking_id UUID DEFAULT NULL
)
RETURNS TEXT[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _resource RECORD;
  _issues TEXT[] := ARRAY[]::TEXT[];
  _conflicts INTEGER := 0;
  _offers INTEGER := 0;
BEGIN
  IF _starts_at IS NULL OR _ends_at IS NULL OR _ends_at <= _starts_at THEN
    RETURN ARRAY['Invalid booking time range'];
  END IF;

  SELECT r.*, o.verification_status AS org_verification
  INTO _resource
  FROM public.resources r
  JOIN public.organisations o ON o.id = r.org_id
  WHERE r.id = _resource_id;
  IF NOT FOUND THEN RETURN ARRAY['Resource not found']; END IF;

  IF _resource.publication_status <> 'published' THEN
    _issues := array_append(_issues, 'Resource is not available for booking');
  END IF;
  IF _resource.org_verification <> 'approved' THEN
    _issues := array_append(_issues, 'Owning organisation is not verified');
  END IF;
  IF _resource.max_booking_duration_hours IS NOT NULL
     AND _ends_at - _starts_at > make_interval(hours => _resource.max_booking_duration_hours) THEN
    _issues := array_append(_issues, 'Booking exceeds the maximum duration');
  END IF;
  IF _starts_at < now() + make_interval(hours => COALESCE(_resource.min_notice_hours, 0)) THEN
    _issues := array_append(_issues, 'Minimum booking notice has not been met');
  END IF;
  IF NOT public.booking_within_availability(_resource_id, _starts_at, _ends_at) THEN
    _issues := array_append(_issues, 'Requested time is outside the resource availability schedule');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.maintenance_blocks mb
    WHERE mb.resource_id = _resource_id AND mb.starts_at < _ends_at AND mb.ends_at > _starts_at
  ) THEN
    _issues := array_append(_issues, 'Resource is under maintenance during this period');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.resource_safety_holds h
    WHERE h.resource_id = _resource_id AND h.released_at IS NULL
      AND (h.expires_at IS NULL OR h.expires_at > now())
      AND h.placed_at < _ends_at AND COALESCE(h.expires_at, 'infinity'::timestamptz) > _starts_at
  ) THEN
    _issues := array_append(_issues, 'Resource is under an active safety hold');
  END IF;

  SELECT count(*) INTO _conflicts
  FROM public.bookings b
  WHERE b.resource_id = _resource_id
    AND b.id IS DISTINCT FROM _exclude_booking_id
    AND b.status IN ('pending_approval','confirmed')
    AND b.starts_at < _ends_at AND b.ends_at > _starts_at;
  SELECT count(*) INTO _offers
  FROM public.waiting_list w
  WHERE w.resource_id = _resource_id AND w.status = 'offered' AND w.offer_expires_at > now()
    AND w.starts_at < _ends_at AND w.ends_at > _starts_at;

  IF (_resource.resource_type = 'exclusive' AND _conflicts + _offers > 0)
     OR (_resource.resource_type = 'shared' AND _conflicts + _offers >= COALESCE(_resource.capacity, 1)) THEN
    _issues := array_append(_issues, 'Requested time conflicts with existing bookings or offered capacity');
  END IF;
  RETURN _issues;
END;
$$;
REVOKE ALL ON FUNCTION public.booking_slot_issues(UUID,TIMESTAMPTZ,TIMESTAMPTZ,UUID)
  FROM PUBLIC, anon, authenticated;

-- Fail closed for malformed organisation restriction policy data.
CREATE OR REPLACE FUNCTION public.check_user_resource_eligibility(
  _user_id UUID,
  _resource_id UUID,
  _org_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resources r
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
            WHEN 'org_restriction' THEN
              CASE
                WHEN NOT (er.rule_config ? 'allowed_org_ids') THEN true
                WHEN jsonb_typeof(er.rule_config -> 'allowed_org_ids') = 'array' THEN
                  jsonb_array_length(er.rule_config -> 'allowed_org_ids') = 0
                  OR (er.rule_config -> 'allowed_org_ids') ? _org_id::text
                ELSE false
              END
            WHEN 'credential' THEN EXISTS (
              SELECT 1 FROM public.user_credentials c
              WHERE c.user_id = _user_id AND c.credential_type = er.rule_config ->> 'credential_type'
                AND c.verified AND (c.expires_at IS NULL OR c.expires_at >= CURRENT_DATE)
            )
            WHEN 'training' THEN EXISTS (
              SELECT 1 FROM public.user_credentials c
              WHERE c.user_id = _user_id AND c.credential_type = er.rule_config ->> 'training_type'
                AND c.verified AND (c.expires_at IS NULL OR c.expires_at >= CURRENT_DATE)
            )
            WHEN 'approval_required' THEN true
            ELSE false
          END
      )
  );
$$;
REVOKE ALL ON FUNCTION public.check_user_resource_eligibility(UUID,UUID,UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.eligible_org_for_resource(_user_id UUID, _resource_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.org_id FROM public.org_members m
  WHERE m.user_id = _user_id
    AND public.check_user_resource_eligibility(_user_id, _resource_id, m.org_id)
  ORDER BY (m.role IN ('owner','admin','manager')) DESC, m.joined_at, m.org_id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.eligible_org_for_resource(UUID,UUID)
  FROM PUBLIC, anon, authenticated;

-- Reserve slots and serialize every queue operation using resource -> booking/entry lock order.
CREATE OR REPLACE FUNCTION public.offer_waitlist_slot(
  _resource_id UUID,
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _candidate public.waiting_list%ROWTYPE;
  _entry_id UUID;
  _policy public.fairshare_policy%ROWTYPE;
  _score NUMERIC(10,6);
  _issues TEXT[];
BEGIN
  IF _ends_at IS NULL OR _starts_at IS NULL OR _ends_at <= _starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid time range');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text, 0));
  PERFORM 1 FROM public.resources WHERE id = _resource_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Resource not found'); END IF;

  WITH expired AS (
    UPDATE public.waiting_list SET status = 'expired', acted_at = now()
    WHERE resource_id = _resource_id AND starts_at = _starts_at AND ends_at = _ends_at
      AND status = 'offered' AND offer_expires_at <= now()
    RETURNING id, allocation_score, policy_version
  )
  INSERT INTO public.waitlist_decisions(entry_id, action, score, policy_version, reason)
  SELECT id, 'expired', allocation_score, policy_version, 'Offer expired before the next allocation'
  FROM expired;

  _issues := public.booking_slot_issues(_resource_id, _starts_at, _ends_at, NULL);
  IF cardinality(_issues) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', array_to_string(_issues, '; '));
  END IF;
  SELECT * INTO _policy FROM public.fairshare_policy WHERE is_active ORDER BY created_at DESC LIMIT 1;
  SELECT w.* INTO _candidate
  FROM public.waiting_list w
  WHERE w.resource_id = _resource_id AND w.starts_at = _starts_at AND w.ends_at = _ends_at
    AND (w.status = 'waiting' OR (w.status = 'offered' AND w.offer_expires_at <= now()))
    AND public.check_user_resource_eligibility(w.user_id, _resource_id, w.org_id)
  ORDER BY w.allocation_score
      + COALESCE(_policy.weight_wait_time, 0.30)
        * LEAST(extract(epoch FROM (now() - w.created_at)) / 3600 / 168, 1) DESC,
    w.created_at, w.id
  LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'No eligible waitlist entry'); END IF;

  _score := round(_candidate.allocation_score + COALESCE(_policy.weight_wait_time, 0.30)
    * LEAST(extract(epoch FROM (now() - _candidate.created_at)) / 3600 / 168, 1), 6);
  _entry_id := _candidate.id;
  UPDATE public.waiting_list SET status = 'offered', offer_expires_at = now() + interval '30 minutes',
    allocation_score = _score,
    allocation_reason = allocation_reason || jsonb_build_object(
      'wait_time_hours', round(extract(epoch FROM (now() - _candidate.created_at)) / 3600, 2)),
    policy_version = COALESCE(_policy.version, 'v1'), acted_at = now()
  WHERE id = _entry_id;
  INSERT INTO public.waitlist_decisions(entry_id, action, score, policy_version, reason, metadata)
  VALUES (_entry_id, 'offered', _score, COALESCE(_policy.version, 'v1'),
    'Highest deterministic FairShare score among eligible users for the exact slot',
    jsonb_build_object('resource_id', _resource_id, 'starts_at', _starts_at, 'ends_at', _ends_at));
  INSERT INTO public.notifications(user_id, type, title, body, metadata)
  VALUES (_candidate.user_id, 'waitlist_available', 'A requested slot is available',
    'You have 30 minutes to claim the offered slot.',
    jsonb_build_object('waitlist_entry_id', _entry_id, 'resource_id', _resource_id,
      'starts_at', _starts_at, 'ends_at', _ends_at));
  RETURN jsonb_build_object('success', true, 'entry_id', _entry_id,
    'offer_expires_at', now() + interval '30 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking(
  _resource_id UUID,
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ,
  _purpose TEXT DEFAULT '',
  _notes TEXT DEFAULT '',
  _idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _org_id UUID;
  _policy public.fairshare_policy%ROWTYPE;
  _booking_id UUID;
  _usage_count INTEGER;
  _week_count INTEGER;
  _week_start TIMESTAMPTZ;
  _user_lock_key BIGINT;
  _issues TEXT[];
  _score NUMERIC(8,4);
  _wait_hours NUMERIC;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF char_length(COALESCE(_purpose, '')) > 1000 OR char_length(COALESCE(_notes, '')) > 5000
     OR (_idempotency_key IS NOT NULL AND char_length(_idempotency_key) NOT BETWEEN 8 AND 128) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid booking input');
  END IF;
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _booking_id FROM public.bookings
    WHERE idempotency_key = _idempotency_key AND user_id = _actor;
    IF _booking_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'booking_id', _booking_id, 'idempotent', true);
    END IF;
    IF EXISTS (SELECT 1 FROM public.bookings WHERE idempotency_key = _idempotency_key) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is unavailable');
    END IF;
  END IF;
  IF _starts_at IS NULL OR _ends_at IS NULL OR _starts_at < now() OR _ends_at <= _starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid booking time range');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text, 0));
  _user_lock_key := hashtextextended('booking-limit:' || _actor::text, 0);
  PERFORM pg_advisory_xact_lock(_user_lock_key);
  PERFORM 1 FROM public.resources WHERE id = _resource_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Resource not found'); END IF;
  _issues := public.booking_slot_issues(_resource_id, _starts_at, _ends_at, NULL);
  IF cardinality(_issues) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', array_to_string(_issues, '; '));
  END IF;

  _org_id := public.eligible_org_for_resource(_actor, _resource_id);
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User is not eligible to book this resource'); END IF;
  SELECT * INTO _policy FROM public.fairshare_policy WHERE is_active ORDER BY created_at DESC LIMIT 1;
  _week_start := date_trunc('week', _starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  SELECT count(*) INTO _week_count FROM public.bookings b
  WHERE b.user_id = _actor AND b.starts_at >= _week_start AND b.starts_at < _week_start + interval '1 week'
    AND b.status IN ('pending_approval', 'confirmed', 'rescheduling_requested', 'completed', 'no_show');
  IF _week_count >= COALESCE(_policy.max_bookings_per_week, 5) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Weekly FairShare booking limit reached');
  END IF;

  SELECT count(DISTINCT b.id) INTO _usage_count
  FROM public.bookings b
  JOIN public.checkin_events ci ON ci.booking_id = b.id AND ci.event_type = 'check_in'
  JOIN public.checkin_events co ON co.booking_id = b.id AND co.event_type = 'check_out'
  WHERE b.user_id = _actor AND b.resource_id = _resource_id AND b.status = 'completed'
    AND ci.recorded_at >= now() - interval '30 days' AND co.recorded_at > ci.recorded_at;
  SELECT COALESCE(extract(epoch FROM (now() - min(w.created_at))) / 3600, 0) INTO _wait_hours
  FROM public.waiting_list w
  WHERE w.user_id = _actor AND w.resource_id = _resource_id
    AND w.starts_at = _starts_at AND w.status IN ('waiting', 'offered');
  _score := round(
    COALESCE(_policy.weight_wait_time, 0.30) * LEAST(COALESCE(_wait_hours, 0) / 168.0, 1)
    + COALESCE(_policy.weight_prior_usage, 0.25) * (1.0 / (1 + _usage_count))
    + COALESCE(_policy.weight_need_urgency, 0.20) * 0.5
    + COALESCE(_policy.weight_owner_priority, 0.15)
      * CASE WHEN EXISTS (SELECT 1 FROM public.resources r
                          WHERE r.id = _resource_id AND r.org_id = _org_id) THEN 1 ELSE 0 END
    + COALESCE(_policy.weight_equal_access, 0.10), 4);

  INSERT INTO public.bookings(resource_id, user_id, org_id, starts_at, ends_at, purpose, notes,
    idempotency_key, fairshare_score, policy_version)
  VALUES (_resource_id, _actor, _org_id, _starts_at, _ends_at, COALESCE(_purpose, ''), COALESCE(_notes, ''),
    _idempotency_key, _score, COALESCE(_policy.version, 'v1'))
  ON CONFLICT (idempotency_key) DO NOTHING RETURNING id INTO _booking_id;
  IF _booking_id IS NULL AND _idempotency_key IS NOT NULL THEN
    SELECT id INTO _booking_id FROM public.bookings
    WHERE idempotency_key = _idempotency_key AND user_id = _actor;
    IF _booking_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'booking_id', _booking_id, 'idempotent', true);
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is unavailable');
  END IF;
  IF _booking_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Booking could not be created'); END IF;

  INSERT INTO public.booking_history(booking_id, previous_status, new_status, changed_by, reason)
  VALUES (_booking_id, NULL, 'pending_approval', _actor, 'Booking created');
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'booking_created', 'booking', _booking_id,
    jsonb_build_object('resource_id', _resource_id, 'starts_at', _starts_at, 'ends_at', _ends_at,
      'fairshare_score', _score, 'policy_version', COALESCE(_policy.version, 'v1')));
  RETURN jsonb_build_object('success', true, 'booking_id', _booking_id,
    'fairshare_score', _score, 'policy_version', COALESCE(_policy.version, 'v1'));
END;
$$;

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
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT resource_id INTO _resource_id FROM public.bookings WHERE id = _booking_id;
  IF _resource_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;
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
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Eligibility check failed'); END IF;
  SELECT * INTO _policy FROM public.fairshare_policy WHERE is_active ORDER BY created_at DESC LIMIT 1;
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

CREATE OR REPLACE FUNCTION public.join_waiting_list(
  _resource_id UUID,
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _org_id UUID;
  _entry_id UUID;
  _policy public.fairshare_policy%ROWTYPE;
  _usage_count INTEGER;
  _score NUMERIC(10,6);
  _offer_result JSONB;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF _starts_at IS NULL OR _ends_at IS NULL OR _ends_at <= _starts_at OR _starts_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid waitlist time range');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text, 0));
  PERFORM 1 FROM public.resources WHERE id = _resource_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Resource not found'); END IF;
  _org_id := public.eligible_org_for_resource(_actor, _resource_id);
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User is not eligible for this resource'); END IF;
  IF NOT public.booking_within_availability(_resource_id, _starts_at, _ends_at)
     OR EXISTS (SELECT 1 FROM public.maintenance_blocks mb WHERE mb.resource_id = _resource_id
       AND mb.starts_at < _ends_at AND mb.ends_at > _starts_at)
     OR EXISTS (SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = _resource_id
       AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())
       AND h.placed_at < _ends_at AND COALESCE(h.expires_at, 'infinity'::timestamptz) > _starts_at) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested slot is blocked by schedule, maintenance, or safety hold');
  END IF;
  SELECT * INTO _policy FROM public.fairshare_policy WHERE is_active ORDER BY created_at DESC LIMIT 1;
  SELECT count(DISTINCT b.id) INTO _usage_count
  FROM public.bookings b
  JOIN public.checkin_events ci ON ci.booking_id = b.id AND ci.event_type = 'check_in'
  JOIN public.checkin_events co ON co.booking_id = b.id AND co.event_type = 'check_out'
  WHERE b.user_id = _actor AND b.resource_id = _resource_id AND b.status = 'completed'
    AND ci.recorded_at >= now() - interval '30 days' AND co.recorded_at > ci.recorded_at;
  _score := round(COALESCE(_policy.weight_prior_usage, 0.25) / (1 + _usage_count)
    + COALESCE(_policy.weight_need_urgency, 0.20) * 0.5
    + COALESCE(_policy.weight_owner_priority, 0.15)
      * CASE WHEN _org_id = (SELECT org_id FROM public.resources WHERE id = _resource_id) THEN 1 ELSE 0 END
    + COALESCE(_policy.weight_equal_access, 0.10), 6);
  INSERT INTO public.waiting_list(resource_id, user_id, org_id, starts_at, ends_at, priority,
    status, allocation_score, policy_version, allocation_reason)
  VALUES (_resource_id, _actor, _org_id, _starts_at, _ends_at, _score, 'waiting', _score,
    COALESCE(_policy.version, 'v1'), jsonb_build_object('wait_time', 0, 'verified_usage_count', _usage_count,
      'owner_org', _org_id = (SELECT org_id FROM public.resources WHERE id = _resource_id)))
  ON CONFLICT DO NOTHING RETURNING id INTO _entry_id;
  IF _entry_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'An active waitlist request already exists for this slot');
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'waitlist_joined', 'waitlist_entry', _entry_id,
    jsonb_build_object('resource_id', _resource_id, 'starts_at', _starts_at));
  _offer_result := public.offer_waitlist_slot(_resource_id, _starts_at, _ends_at);
  RETURN jsonb_build_object('success', true, 'entry_id', _entry_id, 'allocation_score', _score,
    'policy_version', COALESCE(_policy.version, 'v1'),
    'offered_immediately', COALESCE((_offer_result->>'success')::boolean, false));
END;
$$;

-- Release newly available slots after rejection as well as cancellation.
CREATE OR REPLACE FUNCTION public.transition_booking_status(
  _booking_id UUID,
  _new_status TEXT,
  _reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text, 0));
  PERFORM 1 FROM public.resources WHERE id = _resource_id FOR UPDATE;
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;
  SELECT org_id INTO _resource_org FROM public.resources WHERE id = _resource_id;
  _is_booker := _booking.user_id = _actor;

  IF _booking.status = 'pending_approval' AND _new_status IN ('confirmed', 'rejected') THEN
    IF NOT public.is_org_member(_resource_org, _actor, '{owner,admin,manager}') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can review bookings');
    END IF;
  ELSIF _booking.status IN ('pending_approval', 'confirmed') AND _new_status = 'cancelled' THEN
    IF NOT (_is_booker OR public.is_org_member(_resource_org, _actor, '{owner,admin,manager}')) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorised to cancel this booking');
    END IF;
  ELSIF _booking.status = 'confirmed' AND _new_status = 'rescheduling_requested' THEN
    IF NOT _is_booker THEN RETURN jsonb_build_object('success', false, 'error', 'Only the booker can request rescheduling'); END IF;
  ELSIF _booking.status = 'confirmed' AND _new_status IN ('completed', 'no_show') THEN
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
  IF _new_status IN ('cancelled', 'rejected') THEN
    PERFORM public.offer_waitlist_slot(_resource_id, _booking.starts_at, _booking.ends_at);
  END IF;
  RETURN jsonb_build_object('success', true, 'previous_status', _booking.status, 'new_status', _new_status);
END;
$$;

-- One incident visibility boundary for both row metadata and private object storage.
DROP POLICY IF EXISTS "Org members can view incidents" ON public.incidents;
CREATE POLICY "Authorised users can view incidents" ON public.incidents
  FOR SELECT TO authenticated USING (
    reported_by = auth.uid() OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.resources r WHERE r.id = resource_id
        AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
    )
  );
DROP POLICY IF EXISTS "Incident participants can read evidence" ON storage.objects;
CREATE POLICY "Incident participants can read evidence" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'incident-evidence'
    AND CASE WHEN name ~ '^incidents/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$'
      THEN EXISTS (
        SELECT 1 FROM public.incidents i JOIN public.resources r ON r.id = i.resource_id
        WHERE i.id = split_part(name, '/', 2)::uuid
          AND (i.reported_by = auth.uid() OR i.assigned_to = auth.uid()
            OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}'))
      ) ELSE false END
  );
DROP POLICY IF EXISTS "Incident participants can upload evidence" ON storage.objects;
CREATE POLICY "Incident participants can upload evidence" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'incident-evidence'
    AND CASE WHEN name ~ '^incidents/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$'
      THEN EXISTS (
        SELECT 1 FROM public.incidents i JOIN public.resources r ON r.id = i.resource_id
        WHERE i.id = split_part(name, '/', 2)::uuid
          AND (i.reported_by = auth.uid() OR i.assigned_to = auth.uid()
            OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}'))
      ) ELSE false END
  );

-- Match the same participant/staff visibility used by the submission RPCs.
DROP POLICY IF EXISTS "Booking participants can view reports" ON public.condition_reports;
CREATE POLICY "Booking participants can view reports" ON public.condition_reports
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_id AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
    ) OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}')
    )
  );
DROP POLICY IF EXISTS "Booking participants can view checkins" ON public.checkin_events;
CREATE POLICY "Booking participants can view checkins" ON public.checkin_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.bookings b JOIN public.resources r ON r.id = b.resource_id
      WHERE b.id = booking_id AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
    ) OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}')
    )
  );
DROP POLICY IF EXISTS "Booking participants can view condition evidence" ON public.condition_evidence;
CREATE POLICY "Booking participants can view condition evidence" ON public.condition_evidence
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.condition_reports cr JOIN public.bookings b ON b.id = cr.booking_id
      JOIN public.resources r ON r.id = cr.resource_id
      WHERE cr.id = report_id AND (b.user_id = auth.uid()
        OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
        OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}'))
    )
  );

DROP POLICY IF EXISTS "Booking participants can read condition evidence" ON storage.objects;
CREATE POLICY "Booking participants can read condition evidence" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'condition-evidence'
    AND CASE WHEN name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$'
      THEN EXISTS (
        SELECT 1 FROM public.bookings b JOIN public.resources r ON r.id = b.resource_id
        WHERE b.id = split_part(name, '/', 1)::uuid
          AND (b.user_id = auth.uid()
            OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
            OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}'))
      ) ELSE false END
  );
DROP POLICY IF EXISTS "Booking participants can upload condition evidence" ON storage.objects;
CREATE POLICY "Booking participants can upload condition evidence" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'condition-evidence'
    AND CASE WHEN name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[A-Za-z0-9._-]+$'
      THEN EXISTS (
        SELECT 1 FROM public.bookings b JOIN public.resources r ON r.id = b.resource_id
        WHERE b.id = split_part(name, '/', 1)::uuid
          AND (b.user_id = auth.uid()
            OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
            OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}'))
      ) ELSE false END
  );

-- Require a completed booking and recorded checkout before post-use reporting.
CREATE OR REPLACE FUNCTION public.submit_condition_report(
  _booking_id UUID,
  _resource_id UUID,
  _report_type TEXT,
  _condition TEXT,
  _description TEXT DEFAULT '',
  _checklist JSONB DEFAULT '{}'::jsonb,
  _damage_flag BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
  IF _report_type NOT IN ('pre_use', 'post_use')
     OR _condition NOT IN ('excellent', 'good', 'fair', 'poor', 'damaged')
     OR char_length(COALESCE(_description, '')) > 5000
     OR jsonb_typeof(_checklist) <> 'object' OR octet_length(_checklist::text) > 20000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid condition report');
  END IF;
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR _booking.resource_id <> _resource_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking and resource do not match');
  END IF;
  SELECT org_id INTO _resource_org FROM public.resources WHERE id = _resource_id;
  IF NOT (_booking.user_id = _actor
      OR public.is_org_member(_resource_org, _actor, '{owner,admin,manager}')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorised to submit this report');
  END IF;
  IF _report_type = 'pre_use' THEN
    IF _booking.status <> 'confirmed' OR EXISTS (
      SELECT 1 FROM public.checkin_events WHERE booking_id = _booking_id AND event_type = 'check_in'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Pre-use report must be submitted before check-in on a confirmed booking');
    END IF;
  ELSE
    IF _booking.status <> 'completed'
       OR NOT EXISTS (SELECT 1 FROM public.checkin_events WHERE booking_id = _booking_id AND event_type = 'check_in')
       OR NOT EXISTS (SELECT 1 FROM public.checkin_events WHERE booking_id = _booking_id AND event_type = 'check_out') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Post-use report requires check-in, checkout, and a completed booking');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.condition_reports
      WHERE booking_id = _booking_id AND report_type = 'pre_use') THEN
      RETURN jsonb_build_object('success', false, 'error', 'A pre-use report is required for comparison');
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.condition_checklist_items ci
      WHERE ci.resource_id = _resource_id AND ci.is_active AND ci.required AND NOT (_checklist ? ci.item_key)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A required checklist item is missing');
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(_checklist) e
      WHERE NOT EXISTS (SELECT 1 FROM public.condition_checklist_items ci
        WHERE ci.resource_id = _resource_id AND ci.item_key = e.key AND ci.is_active)
        OR jsonb_typeof(e.value) <> 'string'
        OR e.value #>> '{}' NOT IN ('excellent', 'good', 'fair', 'poor', 'damaged', 'not_applicable')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Checklist contains an unknown item or rating');
  END IF;
  SELECT COALESCE(max(report_version), 0) + 1 INTO _version
  FROM public.condition_reports WHERE booking_id = _booking_id AND report_type = _report_type;
  INSERT INTO public.condition_reports(booking_id, resource_id, report_type, condition, description,
    reported_by, checklist, damage_flag, report_version)
  VALUES (_booking_id, _resource_id, _report_type, _condition, btrim(COALESCE(_description, '')),
    _actor, _checklist, _damage_flag, _version) RETURNING id INTO _report_id;

  IF _report_type = 'post_use' THEN
    SELECT * INTO _pre FROM public.condition_reports
    WHERE booking_id = _booking_id AND report_type = 'pre_use'
    ORDER BY report_version DESC LIMIT 1;
    IF FOUND THEN
      -- Policy: any one-step-or-greater worsening on the ordered 1-5 scale is a discrepancy.
      _discrepancy := _damage_flag
        OR CASE _condition
          WHEN 'excellent' THEN 1 WHEN 'good' THEN 2 WHEN 'fair' THEN 3 WHEN 'poor' THEN 4 WHEN 'damaged' THEN 5
        END > CASE _pre.condition
          WHEN 'excellent' THEN 1 WHEN 'good' THEN 2 WHEN 'fair' THEN 3 WHEN 'poor' THEN 4 WHEN 'damaged' THEN 5
        END
        OR EXISTS (
          SELECT 1 FROM jsonb_each(_checklist) post_item
          JOIN jsonb_each(_pre.checklist) pre_item ON pre_item.key = post_item.key
          WHERE post_item.value #>> '{}' IN ('excellent', 'good', 'fair', 'poor', 'damaged')
            AND pre_item.value #>> '{}' IN ('excellent', 'good', 'fair', 'poor', 'damaged')
            AND CASE post_item.value #>> '{}'
              WHEN 'excellent' THEN 1 WHEN 'good' THEN 2 WHEN 'fair' THEN 3 WHEN 'poor' THEN 4 WHEN 'damaged' THEN 5
            END > CASE pre_item.value #>> '{}'
              WHEN 'excellent' THEN 1 WHEN 'good' THEN 2 WHEN 'fair' THEN 3 WHEN 'poor' THEN 4 WHEN 'damaged' THEN 5
            END
        );
      IF _discrepancy THEN
        INSERT INTO public.incidents(resource_id, booking_id, reported_by, severity, title, description, condition_report_id)
        VALUES (_resource_id, _booking_id, _actor,
          CASE WHEN _damage_flag OR _condition IN ('poor', 'damaged') THEN 'high' ELSE 'medium' END,
          'Condition discrepancy requires review',
          COALESCE(NULLIF(btrim(_description), ''), 'Post-use condition worsened compared with the pre-use report.'),
          _report_id) RETURNING id INTO _incident_id;
        INSERT INTO public.incident_history(incident_id, actor_id, action, new_status, reason)
        VALUES (_incident_id, _actor, 'reported', 'open', 'Created from condition report discrepancy');
        INSERT INTO public.condition_report_discrepancies(pre_report_id, post_report_id, incident_id, detected_by, details)
        VALUES (_pre.id, _report_id, _incident_id, _actor,
          jsonb_build_object('pre_condition', _pre.condition, 'post_condition', _condition,
            'damage_flag', _damage_flag, 'policy', 'any rating deterioration on ordered 1-5 scale'));
        INSERT INTO public.notifications(user_id, type, title, body, metadata)
        SELECT om.user_id, 'incident_reported', 'Condition discrepancy reported',
          'A post-use report requires review.', jsonb_build_object('incident_id', _incident_id, 'booking_id', _booking_id)
        FROM public.org_members om WHERE om.org_id = _resource_org AND om.role IN ('owner', 'admin', 'manager');
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

-- Utilisation numerators and denominator use the same schedule minus maintenance/hold ranges.
CREATE OR REPLACE FUNCTION public.get_resource_utilization(
  _resource_id UUID,
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _org_id UUID;
  _capacity INTEGER;
  _result JSONB;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF _from IS NULL OR _to IS NULL OR _to <= _from OR _to - _from > interval '366 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid reporting period');
  END IF;
  SELECT org_id, capacity INTO _org_id, _capacity FROM public.resources WHERE id = _resource_id;
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Resource not found'); END IF;
  IF NOT public.is_org_member(_org_id, _actor, '{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can view utilization');
  END IF;

  WITH schedule AS (
    SELECT ((d.day::date + w.start_time) AT TIME ZONE 'UTC') AS starts_at,
      ((d.day::date + w.end_time) AT TIME ZONE 'UTC') AS ends_at
    FROM generate_series((_from AT TIME ZONE 'UTC')::date::timestamp,
      ((_to - interval '1 microsecond') AT TIME ZONE 'UTC')::date::timestamp,
      interval '1 day') d(day)
    JOIN public.availability_windows w ON w.resource_id = _resource_id
      AND w.day_of_week = extract(dow FROM d.day)::integer
    WHERE ((d.day::date + w.start_time) AT TIME ZONE 'UTC') < _to
      AND ((d.day::date + w.end_time) AT TIME ZONE 'UTC') > _from
  ), scheduled_union AS (
    SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM public.availability_windows WHERE resource_id = _resource_id
      )
        THEN tstzmultirange(tstzrange(_from, _to, '[)'))
        ELSE COALESCE(range_agg(tstzrange(greatest(starts_at, _from), least(ends_at, _to), '[)')),
          '{}'::tstzmultirange)
      END AS ranges,
      CASE WHEN NOT EXISTS (
        SELECT 1 FROM public.availability_windows WHERE resource_id = _resource_id
      )
        THEN greatest(1, ceil(extract(epoch FROM (_to - _from)) / 86400)::integer)
        ELSE count(*)
      END AS periods
    FROM schedule
  ), unavailable AS (
    SELECT starts_at, ends_at FROM public.maintenance_blocks
    WHERE resource_id = _resource_id AND starts_at < _to AND ends_at > _from
    UNION ALL
    SELECT h.placed_at,
      least(COALESCE(h.expires_at, 'infinity'::timestamptz), COALESCE(h.released_at, 'infinity'::timestamptz))
    FROM public.resource_safety_holds h
    WHERE h.resource_id = _resource_id AND h.placed_at < _to
      AND least(COALESCE(h.expires_at, 'infinity'::timestamptz), COALESCE(h.released_at, 'infinity'::timestamptz)) > _from
  ), unavailable_union AS (
    SELECT COALESCE(range_agg(tstzrange(greatest(starts_at, _from), least(ends_at, _to), '[)')),
      '{}'::tstzmultirange) AS ranges FROM unavailable
  ), available_segments AS (
    SELECT unnest(scheduled_union.ranges - unavailable_union.ranges) AS segment
    FROM scheduled_union CROSS JOIN unavailable_union
     ), available AS (
    SELECT
      COALESCE(
        sum(extract(epoch FROM (upper(segment) - lower(segment)))),
        0
      ) AS seconds,
      (SELECT periods FROM scheduled_union) AS periods
    FROM available_segments
  ), booked AS (
    SELECT
      COALESCE(
        sum(
          extract(
            epoch FROM (
              least(b.ends_at, upper(a.segment))
              - greatest(b.starts_at, lower(a.segment))
            )
          )
        ) FILTER (
          WHERE b.status IN ('confirmed', 'completed')
        ),
        0
      ) AS seconds,
      count(DISTINCT b.id) FILTER (
        WHERE b.status IN ('confirmed', 'completed')
      ) AS reservations
    FROM available_segments a
    JOIN public.bookings b
      ON b.resource_id = _resource_id
      AND b.starts_at < upper(a.segment)
      AND b.ends_at > lower(a.segment)
  ), cancelled AS (
    SELECT
      count(DISTINCT b.id) AS cancellations
    FROM public.bookings b
    WHERE b.resource_id = _resource_id
      AND b.status = 'cancelled'
      AND b.starts_at < _to
      AND b.ends_at > _from
  ), usage_events AS (
    SELECT b.id AS booking_id, min(ci.recorded_at) AS checked_in_at, max(co.recorded_at) AS checked_out_at
    FROM public.bookings b
    JOIN public.checkin_events ci ON ci.booking_id = b.id AND ci.event_type = 'check_in'
    JOIN public.checkin_events co ON co.booking_id = b.id AND co.event_type = 'check_out'
    WHERE b.resource_id = _resource_id AND b.status = 'completed'
    GROUP BY b.id
  ), actual_usage AS (
    SELECT COALESCE(sum(extract(epoch FROM (least(u.checked_out_at, upper(a.segment))
      - greatest(u.checked_in_at, lower(a.segment))))), 0) AS seconds,
      count(DISTINCT b.id) AS samples
    FROM available_segments a
    JOIN usage_events u ON u.checked_in_at < upper(a.segment) AND u.checked_out_at > lower(a.segment)
      AND u.checked_out_at > u.checked_in_at
    JOIN public.bookings b ON b.id = u.booking_id
  ), demand AS (
    SELECT count(DISTINCT user_id) AS users FROM public.waiting_list
    WHERE resource_id = _resource_id AND starts_at < _to AND ends_at > _from
      AND status IN ('waiting', 'offered')
  )
  SELECT jsonb_build_object(
    'success', true, 'resource_id', _resource_id, 'from', _from, 'to', _to,
    'availability_schedule_configured', EXISTS (
      SELECT 1 FROM public.availability_windows WHERE resource_id = _resource_id
    ),
    'available_minutes', round(available.seconds / 60.0, 2), 'capacity', COALESCE(_capacity, 1),
    'booked_minutes', round(booked.seconds / 60.0, 2),
    'booked_utilization', CASE WHEN available.seconds > 0 THEN round(booked.seconds
      / (available.seconds * GREATEST(COALESCE(_capacity, 1), 1)), 4) ELSE NULL END,
    'actual_usage_minutes', round(actual_usage.seconds / 60.0, 2),
    'actual_utilization', CASE WHEN available.seconds > 0 THEN round(actual_usage.seconds
      / (available.seconds * GREATEST(COALESCE(_capacity, 1), 1)), 4) ELSE NULL END,
    'completed_usage_samples', actual_usage.samples, 'reservation_count', booked.reservations,
    'cancellation_count', cancelled.cancellations, 'waitlist_demand_users', demand.users,
    'enough_usage_data', (available.periods >= 10 AND actual_usage.samples >= 5 AND _to - _from >= interval '14 days'),
    'underused', CASE WHEN available.periods >= 10 AND actual_usage.samples >= 5
      AND _to - _from >= interval '14 days' THEN actual_usage.seconds
        / NULLIF(available.seconds * GREATEST(COALESCE(_capacity, 1), 1), 0) < 0.20 ELSE NULL END,
    'demand_pattern_available', (demand.users >= 3), 'maintenance_and_safety_holds_excluded', true
  ) INTO _result FROM available, booked, cancelled, actual_usage, demand;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_resources(
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ,
  _minimum_capacity INTEGER DEFAULT 1,
  _location TEXT DEFAULT NULL,
  _resource_type TEXT DEFAULT NULL,
  _maximum_cost NUMERIC DEFAULT NULL,
  _limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  resource_id UUID,
  name TEXT,
  location TEXT,
  resource_type TEXT,
  capacity INTEGER,
  matches BOOLEAN,
  reasons TEXT[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE _actor UUID := auth.uid();
  _week_start TIMESTAMPTZ;
  _week_count INTEGER;
  _weekly_limit INTEGER;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _starts_at IS NULL OR _ends_at IS NULL OR _ends_at <= _starts_at
     OR _minimum_capacity IS NULL OR _minimum_capacity < 1 OR _limit NOT BETWEEN 1 AND 50
     OR _ends_at - _starts_at > interval '31 days' OR char_length(COALESCE(_location, '')) > 200
     OR (_resource_type IS NOT NULL AND _resource_type NOT IN ('exclusive', 'shared'))
     OR (_maximum_cost IS NOT NULL AND _maximum_cost < 0) THEN
    RAISE EXCEPTION 'Invalid resource matching filters';
  END IF;
  _week_start := date_trunc('week', _starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  SELECT COALESCE(max_bookings_per_week, 5) INTO _weekly_limit
  FROM public.fairshare_policy WHERE is_active ORDER BY created_at DESC LIMIT 1;
  _weekly_limit := COALESCE(_weekly_limit, 5);
  SELECT count(*) INTO _week_count FROM public.bookings b
  WHERE b.user_id = _actor AND b.starts_at >= _week_start AND b.starts_at < _week_start + interval '1 week'
    AND b.status IN ('pending_approval', 'confirmed', 'rescheduling_requested', 'completed', 'no_show');
  RETURN QUERY
  WITH candidates AS (
    SELECT r.id, r.name, r.location, r.resource_type, r.capacity,
      public.eligible_org_for_resource(_actor, r.id) AS eligible_org,
      public.booking_slot_issues(r.id, _starts_at, _ends_at, NULL) AS slot_issues
    FROM public.resources r JOIN public.organisations o ON o.id = r.org_id
    WHERE r.publication_status = 'published' AND o.verification_status = 'approved'
  ), evaluated AS (
    SELECT c.*,
      array_remove(c.slot_issues || ARRAY[
        CASE WHEN c.eligible_org IS NULL THEN 'Eligibility requirements are not met' END,
        CASE WHEN c.capacity IS NULL OR c.capacity < _minimum_capacity THEN 'Insufficient capacity' END,
        CASE WHEN _location IS NOT NULL AND c.location NOT ILIKE ('%' || _location || '%') THEN 'Location does not match' END,
        CASE WHEN _resource_type IS NOT NULL AND c.resource_type <> _resource_type THEN 'Resource type does not match' END,
        CASE WHEN _maximum_cost IS NOT NULL THEN 'Cost cannot be evaluated because resource costs are not configured' END
        ,CASE WHEN _week_count >= _weekly_limit THEN 'Weekly FairShare booking limit reached' END
      ], NULL) AS failure_reasons
    FROM candidates c
  )
  SELECT e.id, e.name, e.location, e.resource_type, e.capacity,
    cardinality(e.failure_reasons) = 0, e.failure_reasons
  FROM evaluated e
  ORDER BY (cardinality(e.failure_reasons) = 0) DESC, e.name, e.id
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.offer_waitlist_slot(UUID,TIMESTAMPTZ,TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reschedule_booking(UUID,TIMESTAMPTZ,TIMESTAMPTZ)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_waiting_list(UUID,TIMESTAMPTZ,TIMESTAMPTZ)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_booking_status(UUID,TEXT,TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_resource_utilization(UUID,TIMESTAMPTZ,TIMESTAMPTZ)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.match_resources(TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,TEXT,TEXT,NUMERIC,INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(UUID,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_waiting_list(UUID,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_booking_status(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resource_utilization(UUID,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_resources(TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,TEXT,TEXT,NUMERIC,INTEGER)
  TO authenticated;
