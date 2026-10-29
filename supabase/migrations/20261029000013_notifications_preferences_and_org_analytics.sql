-- Per-user notification preferences and organisation-scoped aggregate analytics.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled_types TEXT[] NOT NULL DEFAULT ARRAY[
    'booking_created','booking_confirmed','booking_rejected','booking_cancelled','booking_reminder',
    'verification_update','membership_invite','incident_reported','incident_resolved','waitlist_available','general'
  ]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (enabled_types <@ ARRAY[
    'booking_created','booking_confirmed','booking_rejected','booking_cancelled','booking_reminder',
    'verification_update','membership_invite','incident_reported','incident_resolved','waitlist_available','general'
  ]::TEXT[])
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.notification_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
DROP TRIGGER IF EXISTS on_notification_preferences_updated ON public.notification_preferences;
CREATE TRIGGER on_notification_preferences_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.apply_notification_preferences()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _enabled_types TEXT[];
BEGIN
  SELECT enabled_types INTO _enabled_types FROM public.notification_preferences
  WHERE user_id = NEW.user_id;
  IF FOUND AND NOT (NEW.type = ANY(_enabled_types)) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_notification_preference_filter ON public.notifications;
CREATE TRIGGER on_notification_preference_filter
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.apply_notification_preferences();

CREATE OR REPLACE FUNCTION public.get_org_sharing_analytics(
  _org_id UUID,
  _from TIMESTAMPTZ,
  _to TIMESTAMPTZ
)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _actor UUID := auth.uid();
  _resource RECORD;
  _utilization JSONB;
  _resource_count INTEGER;
  _published_count INTEGER;
  _booking_count INTEGER;
  _completed_count INTEGER;
  _cancelled_count INTEGER;
  _verified_usage_count INTEGER;
  _available_minutes NUMERIC := 0;
  _booked_minutes NUMERIC := 0;
  _actual_usage_minutes NUMERIC := 0;
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF _from IS NULL OR _to IS NULL OR _to <= _from OR _to - _from > interval '366 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid reporting period');
  END IF;
  IF NOT public.is_org_member(_org_id, _actor, '{owner,admin,manager}') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only organisation managers can view these analytics');
  END IF;

  SELECT count(*)::integer,
    count(*) FILTER (WHERE publication_status = 'published')::integer
  INTO _resource_count, _published_count
  FROM public.resources WHERE org_id = _org_id;

  SELECT count(*) FILTER (WHERE status IN ('pending_approval','confirmed','completed','no_show'))::integer,
    count(*) FILTER (WHERE status = 'completed')::integer,
    count(*) FILTER (WHERE status = 'cancelled')::integer
  INTO _booking_count, _completed_count, _cancelled_count
  FROM public.bookings b JOIN public.resources r ON r.id = b.resource_id
  WHERE r.org_id = _org_id AND b.starts_at < _to AND b.ends_at > _from;

  SELECT count(DISTINCT b.id)::integer INTO _verified_usage_count
  FROM public.bookings b JOIN public.resources r ON r.id = b.resource_id
  JOIN public.checkin_events ci ON ci.booking_id = b.id AND ci.event_type = 'check_in'
  JOIN public.checkin_events co ON co.booking_id = b.id AND co.event_type = 'check_out'
  WHERE r.org_id = _org_id AND b.status = 'completed'
    AND ci.recorded_at < _to AND co.recorded_at > _from AND co.recorded_at > ci.recorded_at;

  FOR _resource IN SELECT id FROM public.resources WHERE org_id = _org_id LOOP
    _utilization := public.get_resource_utilization(_resource.id, _from, _to);
    IF COALESCE((_utilization->>'success')::boolean, false) THEN
      _available_minutes := _available_minutes + COALESCE((_utilization->>'available_minutes')::numeric, 0);
      _booked_minutes := _booked_minutes + COALESCE((_utilization->>'booked_minutes')::numeric, 0);
      _actual_usage_minutes := _actual_usage_minutes + COALESCE((_utilization->>'actual_usage_minutes')::numeric, 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'organisation_id', _org_id, 'from', _from, 'to', _to,
    'resource_count', _resource_count, 'published_resource_count', _published_count,
    'booking_count', _booking_count, 'completed_booking_count', _completed_count,
    'cancelled_booking_count', _cancelled_count, 'verified_usage_booking_count', _verified_usage_count,
    'available_minutes', round(_available_minutes, 2), 'booked_minutes', round(_booked_minutes, 2),
    'actual_usage_minutes', round(_actual_usage_minutes, 2),
    'booked_utilization', CASE WHEN _available_minutes > 0 THEN round(_booked_minutes / _available_minutes, 4) ELSE NULL END,
    'actual_utilization', CASE WHEN _available_minutes > 0 THEN round(_actual_usage_minutes / _available_minutes, 4) ELSE NULL END,
    'usage_is_measured', true, 'estimated_savings', NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_org_sharing_analytics(UUID,TIMESTAMPTZ,TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_sharing_analytics(UUID,TIMESTAMPTZ,TIMESTAMPTZ)
  TO authenticated;
