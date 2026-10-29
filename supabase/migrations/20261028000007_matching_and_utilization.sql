-- Deterministic resource matching and usage-aware utilisation.
CREATE OR REPLACE FUNCTION public.get_resource_utilization(
  _resource_id UUID,
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _org_id UUID;
  _capacity INTEGER;
  _result JSONB;
BEGIN
  IF _actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF _from IS NULL OR _to IS NULL OR _to <= _from OR _to - _from > interval '366 days' THEN
    RETURN jsonb_build_object('success',false,'error','Invalid reporting period');
  END IF;
  SELECT org_id,capacity INTO _org_id,_capacity FROM public.resources WHERE id = _resource_id;
  IF _org_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Resource not found'); END IF;
  IF NOT public.is_org_member(_org_id,_actor,'{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success',false,'error','Only resource managers can view utilization');
  END IF;
  WITH schedule AS (
    SELECT greatest(_from, ((d.day::date + w.start_time) AT TIME ZONE 'UTC')) AS period_start,
      least(_to, ((d.day::date + w.end_time) AT TIME ZONE 'UTC')) AS period_end
    FROM generate_series((_from AT TIME ZONE 'UTC')::date,
      ((_to - interval '1 second') AT TIME ZONE 'UTC')::date, interval '1 day') d(day)
    JOIN public.availability_windows w ON w.resource_id = _resource_id
      AND w.day_of_week = extract(dow FROM d.day)::integer
    WHERE ((d.day::date + w.start_time) AT TIME ZONE 'UTC') < _to
      AND ((d.day::date + w.end_time) AT TIME ZONE 'UTC') > _from
  ), available AS (
    SELECT COALESCE(sum(greatest(0, extract(epoch FROM (s.period_end-s.period_start)) - COALESCE(blocked.seconds,0))),0) AS seconds,
      count(*) AS periods
    FROM schedule s
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(extract(epoch FROM upper(piece)-lower(piece))),0) AS seconds
      FROM (
        SELECT unnest(range_agg(tstzrange(greatest(b.starts_at,s.period_start), least(b.ends_at,s.period_end),'[)'))) AS piece
        FROM (
          SELECT starts_at,ends_at FROM public.maintenance_blocks WHERE resource_id = _resource_id
          UNION ALL
          SELECT placed_at,coalesce(expires_at,'infinity'::timestamptz)
          FROM public.resource_safety_holds WHERE resource_id = _resource_id AND released_at IS NULL
            AND (expires_at IS NULL OR expires_at > _from)
        ) b WHERE b.starts_at < s.period_end AND b.ends_at > s.period_start
      ) merged
    ) blocked ON true
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
  

  ), usage AS (
    SELECT COALESCE(sum(extract(epoch FROM (out_event.recorded_at-in_event.recorded_at))),0) AS seconds,
      count(*) AS samples
    FROM public.bookings b
    JOIN public.checkin_events in_event ON in_event.booking_id = b.id AND in_event.event_type = 'check_in'
    JOIN public.checkin_events out_event ON out_event.booking_id = b.id AND out_event.event_type = 'check_out'
    WHERE b.resource_id = _resource_id AND b.status = 'completed'
      AND in_event.recorded_at < _to AND out_event.recorded_at > _from
  ), demand AS (
    SELECT count(DISTINCT user_id) AS users FROM public.waiting_list
    WHERE resource_id = _resource_id AND starts_at < _to AND ends_at > _from
      AND status IN ('waiting','offered')
  )
  SELECT jsonb_build_object(
    'success',true,'resource_id',_resource_id,'from',_from,'to',_to,
    'available_minutes',round(available.seconds/60.0,2),
    'capacity',COALESCE(_capacity,1),
    'booked_minutes',round(booked.seconds/60.0,2),
    'booked_utilization',CASE WHEN available.seconds > 0 THEN round(booked.seconds/
      (available.seconds * GREATEST(COALESCE(_capacity,1),1)),4) ELSE NULL END,
    'actual_usage_minutes',round(usage.seconds/60.0,2),
    'actual_utilization',CASE WHEN available.seconds > 0 THEN round(usage.seconds/
      (available.seconds * GREATEST(COALESCE(_capacity,1),1)),4) ELSE NULL END,
    'completed_usage_samples',usage.samples,'reservation_count',booked.reservations,
    'cancellation_count',booked.cancellations,'waitlist_demand_users',demand.users,
    'enough_usage_data',(available.periods >= 10 AND usage.samples >= 5 AND _to - _from >= interval '14 days'),
    'underused',CASE WHEN available.periods >= 10 AND usage.samples >= 5 AND _to - _from >= interval '14 days'
      THEN usage.seconds/NULLIF(available.seconds * GREATEST(COALESCE(_capacity,1),1),0) < 0.20 ELSE NULL END,
    'demand_pattern_available',(demand.users >= 3),
    'maintenance_and_safety_holds_excluded',true
  ) INTO _result FROM available,booked,usage,demand;
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
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _starts_at IS NULL OR _ends_at IS NULL OR _ends_at <= _starts_at
     OR _ends_at - _starts_at > interval '31 days'
     OR _minimum_capacity IS NULL OR _minimum_capacity < 1
     OR _limit NOT BETWEEN 1 AND 50
     OR char_length(COALESCE(_location,'')) > 200
     OR (_resource_type IS NOT NULL AND _resource_type NOT IN ('exclusive','shared'))
     OR (_maximum_cost IS NOT NULL AND _maximum_cost < 0) THEN
    RAISE EXCEPTION 'Invalid resource matching filters';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT r.id,r.name,r.location,r.resource_type,r.capacity,r.org_id,
      public.check_user_resource_eligibility(_actor,r.id,eo.org_id) AS eligible,
      public.booking_within_availability(r.id,_starts_at,_ends_at) AS within_schedule,
      EXISTS (SELECT 1 FROM public.maintenance_blocks mb WHERE mb.resource_id = r.id
        AND mb.starts_at < _ends_at AND mb.ends_at > _starts_at) AS in_maintenance,
      EXISTS (SELECT 1 FROM public.resource_safety_holds h WHERE h.resource_id = r.id
        AND h.released_at IS NULL AND (h.expires_at IS NULL OR h.expires_at > now())
        AND h.placed_at < _ends_at AND coalesce(h.expires_at,'infinity'::timestamptz) > _starts_at) AS on_hold,
      (SELECT count(*) FROM public.bookings b WHERE b.resource_id = r.id
        AND b.status IN ('pending_approval','confirmed') AND b.starts_at < _ends_at AND b.ends_at > _starts_at) AS conflicts,
      o.verification_status
    FROM public.resources r
    JOIN public.organisations o ON o.id = r.org_id
    LEFT JOIN LATERAL (SELECT public.eligible_org_for_resource(_actor,r.id) AS org_id) eo ON true
    WHERE r.publication_status = 'published' AND o.verification_status = 'approved'
  ), evaluated AS (
    SELECT c.*,
      array_remove(ARRAY[
        CASE WHEN c.eligible IS DISTINCT FROM true THEN 'Eligibility requirements are not met' END,
        CASE WHEN c.capacity IS NULL OR c.capacity < _minimum_capacity THEN 'Insufficient capacity' END,
        CASE WHEN _location IS NOT NULL AND c.location NOT ILIKE ('%' || _location || '%') THEN 'Location does not match' END,
        CASE WHEN _resource_type IS NOT NULL AND c.resource_type <> _resource_type THEN 'Resource type does not match' END,
        CASE WHEN NOT c.within_schedule THEN 'Outside configured availability' END,
        CASE WHEN c.in_maintenance THEN 'Blocked by maintenance' END,
        CASE WHEN c.on_hold THEN 'Under an active safety hold' END,
        CASE WHEN (c.resource_type = 'exclusive' AND c.conflicts > 0)
          OR (c.resource_type = 'shared' AND c.conflicts >= COALESCE(c.capacity,1)) THEN 'Unavailable due to overlapping bookings' END,
        CASE WHEN _maximum_cost IS NOT NULL THEN 'Cost cannot be evaluated because resource costs are not configured' END
      ],NULL) AS failure_reasons
    FROM candidates c
  )
  SELECT e.id,e.name,e.location,e.resource_type,e.capacity,
    cardinality(e.failure_reasons) = 0,e.failure_reasons
  FROM evaluated e
  ORDER BY (cardinality(e.failure_reasons) = 0) DESC, e.name, e.id
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_resource_utilization(UUID,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.match_resources(TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,TEXT,TEXT,NUMERIC,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_resource_utilization(UUID,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_resources(TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,TEXT,TEXT,NUMERIC,INTEGER) TO authenticated;
