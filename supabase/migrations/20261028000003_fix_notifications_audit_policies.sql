-- 20261028000003_fix_notifications_audit_policies.sql
-- Corrective migration to restrict INSERT on notifications and audit_log to service_role only

-- ── NOTIFICATIONS INSERT POLICY FIX ──
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── AUDIT LOG INSERT POLICY FIX ──
DROP POLICY IF EXISTS "System can insert audit entries" ON public.audit_log;
CREATE POLICY "System can insert audit entries" ON public.audit_log
  FOR INSERT TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Note: Existing SELECT policies remain unchanged.
