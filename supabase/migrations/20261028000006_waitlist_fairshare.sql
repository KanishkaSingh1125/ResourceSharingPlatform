-- Persistent waitlist offers and deterministic FairShare allocation.
ALTER TABLE public.waiting_list
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS allocation_score NUMERIC(10,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS allocation_reason JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS acted_at TIMESTAMPTZ;
ALTER TABLE public.waiting_list DROP CONSTRAINT IF EXISTS waiting_list_status_check;
ALTER TABLE public.waiting_list ADD CONSTRAINT waiting_list_status_check
  CHECK (status IN ('waiting','offered','claimed','expired','withdrawn'));
ALTER TABLE public.waiting_list DROP CONSTRAINT IF EXISTS waiting_list_resource_id_user_id_starts_at_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_one_active_request
  ON public.waiting_list(resource_id, user_id, starts_at, ends_at)
  WHERE status IN ('waiting','offered');
CREATE INDEX IF NOT EXISTS idx_waitlist_queue
  ON public.waiting_list(resource_id, starts_at, ends_at, status, allocation_score DESC, created_at);

CREATE TABLE IF NOT EXISTS public.waitlist_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.waiting_list(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('offered','claimed','expired','withdrawn','override')),
  score NUMERIC(10,6),
  policy_version TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waitlist_decisions_entry ON public.waitlist_decisions(entry_id, created_at);
ALTER TABLE public.waitlist_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_decisions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Waitlist participants view decisions" ON public.waitlist_decisions;
CREATE POLICY "Waitlist participants view decisions" ON public.waitlist_decisions
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.waiting_list w JOIN public.resources r ON r.id = w.resource_id
    WHERE w.id = entry_id AND (w.user_id = auth.uid()
      OR public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}'))
  ));
REVOKE ALL ON public.waitlist_decisions FROM anon, authenticated;
GRANT SELECT ON public.waitlist_decisions TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.waiting_list FROM authenticated;
GRANT SELECT ON public.waiting_list TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bookings, public.booking_history FROM authenticated;
GRANT SELECT ON public.bookings, public.booking_history TO authenticated;
DROP POLICY IF EXISTS "System can insert history" ON public.booking_history;
DROP POLICY IF EXISTS "Users can join waitlist" ON public.waiting_list;
DROP POLICY IF EXISTS "Users can leave waitlist" ON public.waiting_list;

CREATE OR REPLACE FUNCTION public.check_user_resource_eligibility(_user_id UUID, _resource_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resources r JOIN public.organisations o ON o.id = r.org_id
    JOIN public.org_members m ON m.org_id = _org_id AND m.user_id = _user_id
    WHERE r.id = _resource_id AND r.publication_status = 'published'
      AND o.verification_status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = r.id
          AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.eligibility_rules er
        WHERE er.resource_id = r.id AND er.is_hard_block AND NOT CASE er.rule_type
          WHEN 'org_verification' THEN o.verification_status = 'approved'
          WHEN 'org_membership' THEN m.org_id = r.org_id
          WHEN 'org_restriction' THEN
            CASE WHEN jsonb_typeof(er.rule_config -> 'allowed_org_ids') = 'array'
              THEN jsonb_array_length(er.rule_config -> 'allowed_org_ids') = 0
                OR (er.rule_config -> 'allowed_org_ids') ? _org_id::text
              ELSE true
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
REVOKE ALL ON FUNCTION public.check_user_resource_eligibility(UUID,UUID,UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.eligible_org_for_resource(_user_id UUID, _resource_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.org_id FROM public.org_members m
  WHERE m.user_id = _user_id
    AND public.check_user_resource_eligibility(_user_id, _resource_id, m.org_id)
  ORDER BY (m.role IN ('owner','admin','manager')) DESC, m.joined_at, m.org_id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.eligible_org_for_resource(UUID,UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.booking_within_availability(_resource_id UUID, _starts_at TIMESTAMPTZ, _ends_at TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.availability_windows WHERE resource_id = _resource_id)
    OR NOT EXISTS (
      SELECT 1 FROM generate_series((_starts_at AT TIME ZONE 'UTC')::date,
                                    ((_ends_at - interval '1 second') AT TIME ZONE 'UTC')::date,
                                    interval '1 day') d(day)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.availability_windows w
        WHERE w.resource_id = _resource_id
          AND w.day_of_week = extract(dow FROM d.day)::integer
          AND (_starts_at AT TIME ZONE 'UTC')::time >= w.start_time
          AND (_ends_at AT TIME ZONE 'UTC')::time <= w.end_time
          AND (_starts_at AT TIME ZONE 'UTC')::date = d.day::date
          AND (_ends_at AT TIME ZONE 'UTC')::date = d.day::date
      )
    );
$$;
REVOKE ALL ON FUNCTION public.booking_within_availability(UUID,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_booking(
  _resource_id UUID,
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ,
  _purpose TEXT DEFAULT '',
  _notes TEXT DEFAULT '',
  _idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _resource public.resources%ROWTYPE;
  _org_id UUID;
  _policy public.fairshare_policy%ROWTYPE;
  _booking_id UUID;
  _conflict_count INTEGER;
  _offered_count INTEGER;
  _score NUMERIC(8,4);
  _usage_count INTEGER;
  _wait_hours NUMERIC;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF char_length(COALESCE(_purpose,'')) > 1000 OR char_length(COALESCE(_notes,'')) > 5000
     OR (_idempotency_key IS NOT NULL AND char_length(_idempotency_key) NOT BETWEEN 8 AND 128) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid booking input');
  END IF;
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _booking_id FROM public.bookings
    WHERE idempotency_key = _idempotency_key AND user_id = _actor;
    IF _booking_id IS NOT NULL THEN RETURN jsonb_build_object('success', true, 'booking_id', _booking_id, 'idempotent', true); END IF;
    IF EXISTS (SELECT 1 FROM public.bookings WHERE idempotency_key = _idempotency_key) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is unavailable');
    END IF;
  END IF;
  IF _starts_at IS NULL OR _ends_at IS NULL OR _ends_at <= _starts_at OR _starts_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid booking time range');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text, 0));
  SELECT * INTO _resource FROM public.resources WHERE id = _resource_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Resource not found'); END IF;
  IF _resource.publication_status <> 'published' THEN RETURN jsonb_build_object('success', false, 'error', 'Resource is not available for booking'); END IF;
  IF (_ends_at - _starts_at) > make_interval(hours => _resource.max_booking_duration_hours) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking exceeds the maximum duration');
  END IF;
  IF _starts_at < now() + make_interval(hours => _resource.min_notice_hours) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum booking notice has not been met');
  END IF;
  IF NOT public.booking_within_availability(_resource_id, _starts_at, _ends_at) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested time is outside the resource availability schedule');
  END IF;
  IF EXISTS (SELECT 1 FROM public.maintenance_blocks mb WHERE mb.resource_id = _resource_id
    AND mb.starts_at < _ends_at AND mb.ends_at > _starts_at) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource is under maintenance during this period');
  END IF;
  IF EXISTS (SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = _resource_id
    AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())
    AND h.placed_at < _ends_at AND COALESCE(h.expires_at, 'infinity'::timestamptz) > _starts_at) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource is under an active safety hold');
  END IF;
  _org_id := public.eligible_org_for_resource(_actor, _resource_id);
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User is not eligible to book this resource'); END IF;
  SELECT count(*) INTO _offered_count FROM public.waiting_list w WHERE w.resource_id = _resource_id
    AND w.status = 'offered' AND w.offer_expires_at > now()
    AND w.starts_at < _ends_at AND w.ends_at > _starts_at;
  SELECT count(*) INTO _conflict_count FROM public.bookings b WHERE b.resource_id = _resource_id
    AND b.status IN ('pending_approval','confirmed') AND b.starts_at < _ends_at AND b.ends_at > _starts_at;
  IF (_resource.resource_type = 'exclusive' AND (_conflict_count > 0 OR _offered_count > 0))
     OR (_resource.resource_type = 'shared' AND _conflict_count + _offered_count >= _resource.capacity) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested time conflicts with existing bookings or capacity');
  END IF;

  SELECT count(*) INTO _usage_count FROM public.bookings b WHERE b.user_id = _actor
    AND b.resource_id = _resource_id AND b.status IN ('completed','confirmed')
    AND b.starts_at >= now() - interval '30 days';
  SELECT COALESCE(extract(epoch FROM (now() - min(w.created_at))) / 3600, 0) INTO _wait_hours
    FROM public.waiting_list w WHERE w.user_id = _actor AND w.resource_id = _resource_id
      AND w.starts_at = _starts_at AND w.status IN ('waiting','offered');
  SELECT * INTO _policy FROM public.fairshare_policy WHERE is_active ORDER BY created_at DESC LIMIT 1;
  _score := round(
    COALESCE(_policy.weight_wait_time,0.30) * LEAST(COALESCE(_wait_hours,0) / 168.0, 1)
    + COALESCE(_policy.weight_prior_usage,0.25) * (1.0 / (1 + _usage_count))
    + COALESCE(_policy.weight_need_urgency,0.20) * 0.5
    + COALESCE(_policy.weight_owner_priority,0.15) * CASE WHEN _resource.org_id = _org_id THEN 1 ELSE 0 END
    + COALESCE(_policy.weight_equal_access,0.10) * 1.0, 4);
  INSERT INTO public.bookings(resource_id, user_id, org_id, starts_at, ends_at, purpose, notes,
    idempotency_key, fairshare_score, policy_version)
  VALUES (_resource_id, _actor, _org_id, _starts_at, _ends_at, COALESCE(_purpose,''), COALESCE(_notes,''),
    _idempotency_key, _score, COALESCE(_policy.version,'v1'))
  ON CONFLICT (idempotency_key) DO NOTHING RETURNING id INTO _booking_id;
  IF _booking_id IS NULL AND _idempotency_key IS NOT NULL THEN
    SELECT id INTO _booking_id FROM public.bookings
    WHERE idempotency_key = _idempotency_key AND user_id = _actor;
    IF _booking_id IS NOT NULL THEN RETURN jsonb_build_object('success', true, 'booking_id', _booking_id, 'idempotent', true); END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Idempotency key is unavailable');
  END IF;
  IF _booking_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Booking could not be created'); END IF;
  INSERT INTO public.booking_history(booking_id, previous_status, new_status, changed_by, reason)
  VALUES (_booking_id, NULL, 'pending_approval', _actor, 'Booking created');
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'booking_created', 'booking', _booking_id,
    jsonb_build_object('resource_id', _resource_id, 'starts_at', _starts_at, 'ends_at', _ends_at,
      'fairshare_score', _score, 'policy_version', COALESCE(_policy.version,'v1')));
  RETURN jsonb_build_object('success', true, 'booking_id', _booking_id, 'fairshare_score', _score,
    'policy_version', COALESCE(_policy.version,'v1'));
END;
$$;

CREATE OR REPLACE FUNCTION public.offer_waitlist_slot(_resource_id UUID, _starts_at TIMESTAMPTZ, _ends_at TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _resource public.resources%ROWTYPE;
  _candidate public.waiting_list%ROWTYPE;
  _entry_id UUID;
  _org_id UUID;
  _score NUMERIC(10,6);
  _policy_version TEXT;
  _wait_weight NUMERIC(5,2) := 0.30;
  _conflicts INTEGER;
  _active_offers INTEGER;
BEGIN
  IF _ends_at <= _starts_at THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid time range'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text || _starts_at::text || _ends_at::text, 0));
  SELECT * INTO _resource FROM public.resources WHERE id = _resource_id FOR UPDATE;
  IF NOT FOUND OR _resource.publication_status <> 'published' THEN RETURN jsonb_build_object('success', false, 'error', 'Resource unavailable'); END IF;
  WITH expired AS (
    UPDATE public.waiting_list SET status = 'expired', acted_at = now()
    WHERE resource_id = _resource_id AND starts_at = _starts_at AND ends_at = _ends_at
      AND status = 'offered' AND offer_expires_at <= now()
    RETURNING id, allocation_score, policy_version
  )
  INSERT INTO public.waitlist_decisions(entry_id,action,score,policy_version,reason)
  SELECT id,'expired',allocation_score,policy_version,'Offer expired before the next allocation'
  FROM expired;
  IF EXISTS (SELECT 1 FROM public.maintenance_blocks WHERE resource_id = _resource_id
    AND starts_at < _ends_at AND ends_at > _starts_at)
    OR EXISTS (SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = _resource_id
      AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())
      AND h.placed_at < _ends_at AND COALESCE(h.expires_at,'infinity'::timestamptz) > _starts_at) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot is blocked by maintenance or a safety hold');
  END IF;
  SELECT count(*) INTO _conflicts FROM public.bookings b WHERE b.resource_id = _resource_id
    AND b.status IN ('pending_approval','confirmed') AND b.starts_at < _ends_at AND b.ends_at > _starts_at;
  IF (_resource.resource_type = 'exclusive' AND _conflicts > 0)
     OR (_resource.resource_type = 'shared' AND _conflicts >= _resource.capacity) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot is not available');
  END IF;
  SELECT count(*) INTO _active_offers FROM public.waiting_list w WHERE w.resource_id = _resource_id
    AND w.status = 'offered' AND w.offer_expires_at > now()
    AND w.starts_at < _ends_at AND w.ends_at > _starts_at;
  IF (_resource.resource_type = 'exclusive' AND _active_offers > 0)
     OR (_resource.resource_type = 'shared' AND _active_offers >= _resource.capacity) THEN
    RETURN jsonb_build_object('success',false,'error','All available capacity is currently offered');
  END IF;
  SELECT version,weight_wait_time INTO _policy_version,_wait_weight
  FROM public.fairshare_policy WHERE is_active ORDER BY created_at DESC LIMIT 1;
  SELECT w.* INTO _candidate FROM public.waiting_list w
  WHERE w.resource_id = _resource_id AND w.starts_at = _starts_at AND w.ends_at = _ends_at
    AND (w.status = 'waiting' OR (w.status = 'offered' AND w.offer_expires_at <= now()))
    AND public.check_user_resource_eligibility(w.user_id, _resource_id, w.org_id)
  ORDER BY w.allocation_score + _wait_weight * LEAST(extract(epoch FROM (now()-w.created_at))/3600/168,1) DESC,
    w.created_at, w.id
  LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'No eligible waitlist entry'); END IF;
  _score := round(_candidate.allocation_score + _wait_weight *
    LEAST(extract(epoch FROM (now()-_candidate.created_at))/3600/168,1),6);
  UPDATE public.waiting_list SET status = 'offered', offer_expires_at = now() + interval '30 minutes',
    allocation_score = _score, allocation_reason = allocation_reason || jsonb_build_object(
      'wait_time_hours',round(extract(epoch FROM (now()-_candidate.created_at))/3600,2)),
    policy_version = COALESCE(_policy_version,'v1'), acted_at = now()
  WHERE id = _candidate.id RETURNING id INTO _entry_id;
  INSERT INTO public.waitlist_decisions(entry_id, action, score, policy_version, reason, metadata)
  VALUES (_entry_id, 'offered', _score, COALESCE(_policy_version,'v1'),
    'Highest deterministic FairShare score among eligible users for the exact slot',
    jsonb_build_object('resource_id',_resource_id,'starts_at',_starts_at,'ends_at',_ends_at));
  INSERT INTO public.notifications(user_id, type, title, body, metadata)
  VALUES (_candidate.user_id, 'waitlist_available', 'A requested slot is available',
    'You have 30 minutes to claim the offered slot.', jsonb_build_object('waitlist_entry_id',_entry_id,
      'resource_id',_resource_id,'starts_at',_starts_at,'ends_at',_ends_at));
  RETURN jsonb_build_object('success', true, 'entry_id', _entry_id, 'offer_expires_at', now() + interval '30 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.join_waiting_list(_resource_id UUID, _starts_at TIMESTAMPTZ, _ends_at TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
  IF _starts_at IS NULL OR _ends_at <= _starts_at OR _starts_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid waitlist time range');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text || _starts_at::text || _ends_at::text, 0));
  _org_id := public.eligible_org_for_resource(_actor, _resource_id);
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User is not eligible for this resource'); END IF;
  IF NOT public.booking_within_availability(_resource_id,_starts_at,_ends_at)
    OR EXISTS (SELECT 1 FROM public.maintenance_blocks WHERE resource_id = _resource_id
      AND starts_at < _ends_at AND ends_at > _starts_at)
    OR EXISTS (SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = _resource_id
      AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())
      AND h.placed_at < _ends_at AND COALESCE(h.expires_at,'infinity'::timestamptz) > _starts_at) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested slot is not eligible for waitlisting');
  END IF;
  SELECT * INTO _policy FROM public.fairshare_policy WHERE is_active ORDER BY created_at DESC LIMIT 1;
  SELECT count(*) INTO _usage_count FROM public.bookings b WHERE b.user_id = _actor
    AND b.resource_id = _resource_id AND b.status IN ('confirmed','completed')
    AND b.starts_at >= now() - interval '30 days';
  _score := round(COALESCE(_policy.weight_wait_time,0.30) * 0
    + COALESCE(_policy.weight_prior_usage,0.25) / (1 + _usage_count)
    + COALESCE(_policy.weight_need_urgency,0.20) * 0.5
    + COALESCE(_policy.weight_owner_priority,0.15) * CASE WHEN _org_id = (SELECT org_id FROM public.resources WHERE id = _resource_id) THEN 1 ELSE 0 END
    + COALESCE(_policy.weight_equal_access,0.10), 6);
  INSERT INTO public.waiting_list(resource_id,user_id,org_id,starts_at,ends_at,priority,status,
    allocation_score,policy_version,allocation_reason)
  VALUES (_resource_id,_actor,_org_id,_starts_at,_ends_at,_score,'waiting',_score,
    COALESCE(_policy.version,'v1'),jsonb_build_object('wait_time',0,'prior_usage',_usage_count,
      'owner_org',_org_id = (SELECT org_id FROM public.resources WHERE id = _resource_id)))
  ON CONFLICT DO NOTHING RETURNING id INTO _entry_id;
  IF _entry_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','An active waitlist request already exists for this slot'); END IF;
  INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,metadata)
  VALUES (_actor,'waitlist_joined','waitlist_entry',_entry_id,jsonb_build_object('resource_id',_resource_id,'starts_at',_starts_at));
  _offer_result := public.offer_waitlist_slot(_resource_id,_starts_at,_ends_at);
  RETURN jsonb_build_object('success',true,'entry_id',_entry_id,'allocation_score',_score,
    'policy_version',COALESCE(_policy.version,'v1'),
    'offered_immediately',COALESCE((_offer_result->>'success')::boolean,false));
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_waitlist_offer(_entry_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _entry public.waiting_list%ROWTYPE;
  _booking_result JSONB;
  _next_offer JSONB;
  _booking_id UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT resource_id INTO _entry.resource_id FROM public.waiting_list WHERE id = _entry_id;
  IF _entry.resource_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Waitlist entry not found'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_entry.resource_id::text,0));
  PERFORM 1 FROM public.resources WHERE id = _entry.resource_id FOR UPDATE;
  SELECT * INTO _entry FROM public.waiting_list WHERE id = _entry_id FOR UPDATE;
  IF _entry.user_id <> _actor OR _entry.status <> 'offered' OR _entry.offer_expires_at <= now() THEN
    IF _entry.status = 'offered' AND _entry.offer_expires_at <= now() THEN
      UPDATE public.waiting_list SET status = 'expired', acted_at = now() WHERE id = _entry_id;
      INSERT INTO public.waitlist_decisions(entry_id,actor_id,action,score,policy_version,reason)
      VALUES (_entry_id,_actor,'expired',_entry.allocation_score,_entry.policy_version,'Offer expired before claim');
    END IF;
    RETURN jsonb_build_object('success',false,'error','Offer is not active or is not assigned to this user');
  END IF;
  IF NOT public.check_user_resource_eligibility(_actor,_entry.resource_id,_entry.org_id) THEN
    RETURN jsonb_build_object('success',false,'error','Current eligibility check failed');
  END IF;
  UPDATE public.waiting_list SET status = 'claimed', acted_at = now() WHERE id = _entry_id;
  _booking_result := public.create_booking(_entry.resource_id,_entry.starts_at,_entry.ends_at,
    'Claimed waitlist offer','', 'waitlist:' || _entry_id::text);
  IF NOT COALESCE((_booking_result->>'success')::boolean,false) THEN
    UPDATE public.waiting_list SET status = 'offered', acted_at = NULL WHERE id = _entry_id;
    RETURN _booking_result;
  END IF;
  _booking_id := (_booking_result->>'booking_id')::uuid;
  INSERT INTO public.waitlist_decisions(entry_id,actor_id,action,score,policy_version,reason,metadata)
  VALUES (_entry_id,_actor,'claimed',_entry.allocation_score,_entry.policy_version,'Eligible user claimed offer',
    jsonb_build_object('booking_id',_booking_id));
  _next_offer := public.offer_waitlist_slot(_entry.resource_id,_entry.starts_at,_entry.ends_at);
  RETURN jsonb_build_object('success',true,'booking_id',_booking_id,'entry_id',_entry_id,
    'next_offer_created',COALESCE((_next_offer->>'success')::boolean,false));
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_waiting_list(_entry_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _entry public.waiting_list%ROWTYPE;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO _entry FROM public.waiting_list WHERE id = _entry_id FOR UPDATE;
  IF NOT FOUND OR _entry.user_id <> _actor OR _entry.status NOT IN ('waiting','offered') THEN
    RETURN jsonb_build_object('success',false,'error','Active waitlist entry not found');
  END IF;
  UPDATE public.waiting_list SET status = 'withdrawn', acted_at = now() WHERE id = _entry_id;
  INSERT INTO public.waitlist_decisions(entry_id,actor_id,action,score,policy_version,reason)
  VALUES (_entry_id,_actor,'withdrawn',_entry.allocation_score,_entry.policy_version,'User withdrew request');
  RETURN jsonb_build_object('success',true,'entry_id',_entry_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.prioritize_waitlist_entry(_entry_id UUID, _reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _entry public.waiting_list%ROWTYPE;
  _org_id UUID;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF char_length(btrim(_reason)) < 5 THEN RETURN jsonb_build_object('success',false,'error','Override reason is required'); END IF;
  SELECT * INTO _entry FROM public.waiting_list WHERE id = _entry_id FOR UPDATE;
  IF NOT FOUND OR _entry.status <> 'waiting' THEN RETURN jsonb_build_object('success',false,'error','Waiting entry not found'); END IF;
  SELECT org_id INTO _org_id FROM public.resources WHERE id = _entry.resource_id;
  IF NOT public.is_org_member(_org_id,_actor,'{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success',false,'error','Only resource managers can override allocation');
  END IF;
  UPDATE public.waiting_list SET allocation_score = allocation_score + 1,
    allocation_reason = allocation_reason || jsonb_build_object('override_reason',btrim(_reason),'overridden_by',_actor)
  WHERE id = _entry_id;
  INSERT INTO public.waitlist_decisions(entry_id,actor_id,action,score,policy_version,reason)
  VALUES (_entry_id,_actor,'override',_entry.allocation_score + 1,_entry.policy_version,btrim(_reason));
  INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,metadata)
  VALUES (_actor,'waitlist_allocation_override','waitlist_entry',_entry_id,jsonb_build_object('reason',btrim(_reason)));
  RETURN jsonb_build_object('success',true,'entry_id',_entry_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_waitlist_slot(_resource_id UUID,_starts_at TIMESTAMPTZ,_ends_at TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE _actor UUID := auth.uid(); _org_id UUID;
BEGIN
  SELECT org_id INTO _org_id FROM public.resources WHERE id = _resource_id;
  IF _actor IS NULL OR NOT public.is_org_member(_org_id,_actor,'{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success',false,'error','Only resource managers can allocate this slot');
  END IF;
  RETURN public.offer_waitlist_slot(_resource_id,_starts_at,_ends_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(_booking_id UUID,_starts_at TIMESTAMPTZ,_ends_at TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _resource_id UUID;
  _booking public.bookings%ROWTYPE;
  _resource public.resources%ROWTYPE;
  _org_id UUID;
  _conflicts INTEGER;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT resource_id INTO _resource_id FROM public.bookings WHERE id = _booking_id;
  IF _resource_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Booking not found'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_resource_id::text,0));
  PERFORM 1 FROM public.resources WHERE id = _resource_id FOR UPDATE;
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR _booking.user_id <> _actor
     OR _booking.status NOT IN ('confirmed','rescheduling_requested') THEN
    RETURN jsonb_build_object('success',false,'error','Booking cannot be rescheduled by this user');
  END IF;
  IF _ends_at IS NULL OR _starts_at IS NULL OR _ends_at <= _starts_at OR _starts_at < now() THEN
    RETURN jsonb_build_object('success',false,'error','Invalid replacement time range');
  END IF;
  SELECT * INTO _resource FROM public.resources WHERE id = _booking.resource_id;
  IF (_ends_at - _starts_at) > make_interval(hours => _resource.max_booking_duration_hours)
     OR _starts_at < now() + make_interval(hours => _resource.min_notice_hours)
     OR NOT public.booking_within_availability(_booking.resource_id,_starts_at,_ends_at) THEN
    RETURN jsonb_build_object('success',false,'error','Replacement slot violates duration, notice, or availability rules');
  END IF;
  IF EXISTS (SELECT 1 FROM public.maintenance_blocks mb WHERE mb.resource_id = _booking.resource_id
    AND mb.starts_at < _ends_at AND mb.ends_at > _starts_at)
    OR EXISTS (SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = _booking.resource_id
      AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())
      AND h.placed_at < _ends_at AND COALESCE(h.expires_at,'infinity'::timestamptz) > _starts_at) THEN
    RETURN jsonb_build_object('success',false,'error','Replacement slot is blocked by maintenance or a safety hold');
  END IF;
  _org_id := public.eligible_org_for_resource(_actor,_booking.resource_id);
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Eligibility check failed'); END IF;
  SELECT count(*) INTO _conflicts FROM public.bookings b WHERE b.resource_id = _booking.resource_id
    AND b.id <> _booking_id AND b.status IN ('pending_approval','confirmed')
    AND b.starts_at < _ends_at AND b.ends_at > _starts_at;
  IF (_resource.resource_type = 'exclusive' AND _conflicts > 0)
      OR (_resource.resource_type = 'exclusive' AND _active_offers > 0)
      OR (_resource.resource_type = 'shared' AND _conflicts + _active_offers >= _resource.capacity) THEN
    RETURN jsonb_build_object('success',false,'error','Replacement slot conflicts with another booking');
  END IF;
  UPDATE public.bookings SET starts_at = _starts_at, ends_at = _ends_at, org_id = _org_id,
    updated_at = now() WHERE id = _booking_id;
  INSERT INTO public.booking_history(booking_id,previous_status,new_status,changed_by,reason)
  VALUES (_booking_id,_booking.status,'confirmed',_actor,'Booking rescheduled');
  INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,metadata)
  VALUES (_actor,'booking_rescheduled','booking',_booking_id,jsonb_build_object(
    'previous_starts_at',_booking.starts_at,'previous_ends_at',_booking.ends_at,
    'starts_at',_starts_at,'ends_at',_ends_at));
  IF _booking.status = 'rescheduling_requested' THEN
    PERFORM set_config('sharesphere.allow_booking_status_transition','on',true);
    UPDATE public.bookings SET status = 'confirmed' WHERE id = _booking_id;
    PERFORM set_config('sharesphere.allow_booking_status_transition','off',true);
  END IF;
  PERFORM public.offer_waitlist_slot(_booking.resource_id,_booking.starts_at,_booking.ends_at);
  RETURN jsonb_build_object('success',true,'booking_id',_booking_id,'starts_at',_starts_at,'ends_at',_ends_at);
END;
$$;

REVOKE ALL ON FUNCTION public.offer_waitlist_slot(UUID,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_booking(UUID,TIMESTAMPTZ,TIMESTAMPTZ,TEXT,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_booking(UUID,TIMESTAMPTZ,TIMESTAMPTZ,TEXT,TEXT,TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.join_waiting_list(UUID,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.claim_waitlist_offer(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.leave_waiting_list(UUID) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.prioritize_waitlist_entry(UUID,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.allocate_waitlist_slot(UUID,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.reschedule_booking(UUID,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.join_waiting_list(UUID,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_waitlist_offer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_waiting_list(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prioritize_waitlist_entry(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_waitlist_slot(UUID,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(UUID,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;
