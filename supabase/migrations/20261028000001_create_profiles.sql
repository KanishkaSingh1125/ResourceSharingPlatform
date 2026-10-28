-- ============================================================
-- ShareSphere — Profiles table + Row Level Security
-- Migration: 20261028000001_create_profiles.sql
-- ============================================================
-- This migration creates the public.profiles table, a trigger
-- to auto-create a profile on signup, and RLS policies that
-- enforce per-user data isolation.
-- ============================================================

-- ── 1. Create profiles table ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'deactivated')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- ── 2. Auto-update updated_at on row change ──────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ── 3. Auto-create profile on signup ─────────────────────────
-- This trigger fires AFTER a new row is inserted into auth.users.
-- It safely reads display_name from raw_user_meta_data and falls
-- back to empty string if metadata is absent or malformed.
-- SECURITY DEFINER runs as the function owner (postgres), which
-- has INSERT rights. The function does NOT accept any user input
-- for account_status — it is always hardcoded to 'active'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _display_name TEXT;
BEGIN
  -- Safely extract display_name from signup metadata
  BEGIN
    _display_name := COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    _display_name := '';
  END;

  INSERT INTO public.profiles (id, display_name, email, account_status)
  VALUES (
    NEW.id,
    _display_name,
    COALESCE(NEW.email, ''),
    'active'  -- HARDCODED: users cannot set their own status
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Enable Row Level Security ─────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (defense-in-depth)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- ── 5. RLS Policies ──────────────────────────────────────────

-- Policy: Users can read ONLY their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update ONLY their own profile,
-- and ONLY the permitted columns (display_name, avatar_url).
-- account_status, email, id, created_at are NOT updatable via this policy.
-- We use a column-level approach: the UPDATE is allowed, but a trigger
-- prevents changes to protected fields.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 6. Protect privileged columns from user modification ─────
-- Even though RLS limits updates to own rows, we add a trigger
-- to prevent users from modifying account_status, email, or id.
-- Email changes must go through Supabase Auth's email-change flow.

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prevent modification of protected fields
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify profile id';
  END IF;

  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'Cannot modify account_status';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email directly. Use the email change flow.';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_protect_fields ON public.profiles;
CREATE TRIGGER on_profile_protect_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- ── 7. Revoke direct table access, grant only through RLS ────
-- The anon role should have NO access to profiles.
-- Authenticated users get SELECT and UPDATE only (INSERT is handled by trigger).

REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- ── Security Review Notes ────────────────────────────────────
-- ✅ RLS enabled and forced
-- ✅ Users can only SELECT/UPDATE their own row
-- ✅ account_status is hardcoded in trigger, not settable by users
-- ✅ Protected-field trigger prevents privilege escalation
-- ✅ anon role has zero access
-- ✅ Profile creation uses SECURITY DEFINER with hardcoded status
-- ✅ Trigger handles missing/malformed metadata gracefully
-- ✅ Email changes require Supabase Auth flow, not direct UPDATE
-- ✅ No service-role key used in frontend
