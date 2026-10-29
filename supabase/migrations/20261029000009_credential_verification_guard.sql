-- Prevent users from self-verifying credentials used by booking eligibility.
-- Trusted service-role/database administration remains responsible for verification.

DROP POLICY IF EXISTS "Users can update own credentials" ON public.user_credentials;
REVOKE UPDATE ON public.user_credentials FROM authenticated;

CREATE OR REPLACE FUNCTION public.force_self_reported_credentials_unverified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.verified := false;
    NEW.verified_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_self_reported_credential_unverified ON public.user_credentials;
CREATE TRIGGER on_self_reported_credential_unverified
  BEFORE INSERT ON public.user_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.force_self_reported_credentials_unverified();
