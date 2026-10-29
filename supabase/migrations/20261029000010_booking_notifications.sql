-- Generate persistent booking notifications from committed database events.
-- Notification inserts happen in a SECURITY DEFINER trigger; clients cannot forge them.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_event_key
  ON public.notifications(event_key) WHERE event_key IS NOT NULL;

REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _actor UUID := auth.uid();
  _resource_org_id UUID;
  _notification_type TEXT;
  _title TEXT;
  _body TEXT;
  _event_key TEXT;
BEGIN
  SELECT org_id INTO _resource_org_id
  FROM public.resources WHERE id = NEW.resource_id;

  IF TG_OP = 'INSERT' THEN
    _event_key := 'booking:' || NEW.id::text || ':created:';
    INSERT INTO public.notifications(user_id, type, title, body, metadata, event_key)
    SELECT om.user_id, 'booking_created', 'New booking request',
      'A resource booking is awaiting review.',
      jsonb_build_object('booking_id', NEW.id, 'resource_id', NEW.resource_id), _event_key || om.user_id::text
    FROM public.org_members om
    WHERE om.org_id = _resource_org_id
      AND om.role IN ('owner', 'admin', 'manager')
      AND om.user_id <> NEW.user_id
    ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;
    INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (_actor, 'booking_created_notification_emitted', 'booking', NEW.id,
      jsonb_build_object('resource_id', NEW.resource_id));
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'confirmed' THEN
      _notification_type := 'booking_confirmed';
      _title := 'Booking confirmed';
      _body := 'Your booking request was approved.';
    WHEN 'rejected' THEN
      _notification_type := 'booking_rejected';
      _title := 'Booking not approved';
      _body := 'Your booking request was not approved.';
    WHEN 'cancelled' THEN
      _notification_type := 'booking_cancelled';
      _title := 'Booking cancelled';
      _body := COALESCE(NULLIF(NEW.cancellation_reason, ''), 'Your booking was cancelled.');
    ELSE
      RETURN NEW;
  END CASE;

  _event_key := 'booking:' || NEW.id::text || ':status:' || NEW.status || ':' || NEW.updated_at::text;
  INSERT INTO public.notifications(user_id, type, title, body, metadata, event_key)
  SELECT NEW.user_id, _notification_type, _title, _body,
    jsonb_build_object('booking_id', NEW.id, 'resource_id', NEW.resource_id), _event_key
  WHERE _actor IS DISTINCT FROM NEW.user_id
  ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;

  IF _actor IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, metadata)
    VALUES (_actor, 'booking_status_notification_emitted', 'booking', NEW.id,
      jsonb_build_object('status', NEW.status, 'recipient_id', NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_notification ON public.bookings;
CREATE TRIGGER on_booking_notification
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_changes();
