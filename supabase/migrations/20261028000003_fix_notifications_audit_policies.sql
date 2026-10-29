
-- Corrective migration for notifications and audit_log policies

DROP POLICY IF EXISTS "System can insert notifications"
  ON public.notifications;

DROP POLICY IF EXISTS "System can insert audit entries"
  ON public.audit_log;
