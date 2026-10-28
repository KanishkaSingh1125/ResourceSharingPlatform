-- ============================================================
-- ShareSphere — Master Backend Schema
-- Migration: 20261028000002_master_backend.sql
-- ============================================================
-- Additive migration. Does NOT touch auth.users or public.profiles
-- (created in 20261028000001_create_profiles.sql).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ORGANISATIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  slug             TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  description      TEXT DEFAULT '',
  logo_url         TEXT,
  website          TEXT,
  contact_email    TEXT,
  contact_phone    TEXT,
  address          TEXT,
  verification_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (verification_status IN (
      'draft','submitted','under_review',
      'additional_information_required',
      'approved','rejected','suspended'
    )),
  created_by       UUID NOT NULL REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orgs_verification ON public.organisations(verification_status);
CREATE INDEX IF NOT EXISTS idx_orgs_created_by   ON public.organisations(created_by);
CREATE INDEX IF NOT EXISTS idx_orgs_slug         ON public.organisations(slug);

-- ────────────────────────────────────────────────────────────
-- 2. ORGANISATION MEMBERSHIPS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner','admin','manager','member')),
  invited_by  UUID REFERENCES public.profiles(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_om_org  ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_om_user ON public.org_members(user_id);

-- ────────────────────────────────────────────────────────────
-- 3. VERIFICATION DECISIONS (append-only history)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.verification_decisions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status     TEXT NOT NULL
    CHECK (new_status IN (
      'draft','submitted','under_review',
      'additional_information_required',
      'approved','rejected','suspended'
    )),
  reason         TEXT NOT NULL DEFAULT '',
  decided_by     UUID NOT NULL REFERENCES public.profiles(id),
  decided_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vd_org ON public.verification_decisions(org_id);

-- ────────────────────────────────────────────────────────────
-- 4. VERIFICATION DOCUMENTS (private storage metadata)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.verification_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.profiles(id),
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL CHECK (file_type IN (
    'registration_certificate','tax_document','insurance',
    'identity_proof','address_proof','other'
  )),
  mime_type     TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760), -- 10 MB max
  storage_path  TEXT NOT NULL,  -- path in private Supabase Storage bucket
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vdoc_org ON public.verification_documents(org_id);

-- ────────────────────────────────────────────────────────────
-- 5. RESOURCE CATEGORIES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.resource_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
  slug        TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon        TEXT DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default categories
INSERT INTO public.resource_categories (name, slug, description, icon, sort_order) VALUES
  ('Equipment',  'equipment',  'Tools and devices',           'wrench',    1),
  ('Space',      'space',      'Meeting rooms and venues',    'building',  2),
  ('Vehicle',    'vehicle',    'Cars, vans, trucks',          'car',       3),
  ('Technology', 'technology', 'Computers, projectors, etc.', 'monitor',   4),
  ('Other',      'other',      'Uncategorised resources',     'box',       5)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 6. RESOURCES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES public.resource_categories(id),
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  description     TEXT DEFAULT '',
  resource_type   TEXT NOT NULL DEFAULT 'exclusive'
    CHECK (resource_type IN ('exclusive','shared')),
  capacity        INT DEFAULT 1 CHECK (capacity > 0),
  location        TEXT DEFAULT '',
  image_urls      TEXT[] DEFAULT '{}',
  usage_rules     TEXT DEFAULT '',
  publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft','published','suspended','archived')),
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  max_booking_duration_hours INT DEFAULT 24 CHECK (max_booking_duration_hours > 0),
  min_notice_hours INT DEFAULT 1 CHECK (min_notice_hours >= 0),
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_res_org   ON public.resources(org_id);
CREATE INDEX IF NOT EXISTS idx_res_cat   ON public.resources(category_id);
CREATE INDEX IF NOT EXISTS idx_res_pub   ON public.resources(publication_status);

-- ────────────────────────────────────────────────────────────
-- 7. AVAILABILITY WINDOWS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.availability_windows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  CHECK (end_time > start_time),
  UNIQUE(resource_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_aw_res ON public.availability_windows(resource_id);

-- ────────────────────────────────────────────────────────────
-- 8. MAINTENANCE BLOCKS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL DEFAULT 'Scheduled maintenance',
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_mb_res   ON public.maintenance_blocks(resource_id);
CREATE INDEX IF NOT EXISTS idx_mb_range ON public.maintenance_blocks(resource_id, starts_at, ends_at);

-- ────────────────────────────────────────────────────────────
-- 9. ELIGIBILITY RULES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.eligibility_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  rule_type   TEXT NOT NULL CHECK (rule_type IN (
    'org_membership','org_verification','credential',
    'training','approval_required','org_restriction'
  )),
  rule_config JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  is_hard_block BOOLEAN NOT NULL DEFAULT false,  -- safety vs fairness
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_er_res ON public.eligibility_rules(resource_id);

-- ────────────────────────────────────────────────────────────
-- 10. USER CREDENTIALS / TRAINING RECORDS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL CHECK (char_length(credential_type) BETWEEN 1 AND 100),
  credential_name TEXT NOT NULL,
  issued_at       DATE,
  expires_at      DATE,
  verified        BOOLEAN NOT NULL DEFAULT false,
  verified_by     UUID REFERENCES public.profiles(id),
  document_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uc_user ON public.user_credentials(user_id);

-- ────────────────────────────────────────────────────────────
-- 11. BOOKINGS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id       UUID NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
  user_id           UUID NOT NULL REFERENCES public.profiles(id),
  org_id            UUID NOT NULL REFERENCES public.organisations(id),
  status            TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN (
      'pending_approval','confirmed','rejected',
      'cancelled','rescheduling_requested',
      'completed','no_show'
    )),
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  purpose           TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  idempotency_key   TEXT UNIQUE,  -- duplicate-submission protection
  approved_by       UUID REFERENCES public.profiles(id),
  cancelled_by      UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT,
  fairshare_score   NUMERIC(8,4),
  policy_version    TEXT DEFAULT 'v1',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_bk_resource   ON public.bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bk_user       ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bk_org        ON public.bookings(org_id);
CREATE INDEX IF NOT EXISTS idx_bk_status     ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bk_time_range ON public.bookings(resource_id, starts_at, ends_at);
-- Prevent double-booking for exclusive resources (active bookings only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bk_idempotency ON public.bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 12. BOOKING STATUS HISTORY (append-only)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.booking_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID NOT NULL REFERENCES public.profiles(id),
  reason          TEXT DEFAULT '',
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bh_booking ON public.booking_history(booking_id);

-- ────────────────────────────────────────────────────────────
-- 13. WAITING LIST
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.waiting_list (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id),
  org_id      UUID NOT NULL REFERENCES public.organisations(id),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  priority    NUMERIC(8,4) DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource_id, user_id, starts_at)
);

CREATE INDEX IF NOT EXISTS idx_wl_res ON public.waiting_list(resource_id, starts_at);

-- ────────────────────────────────────────────────────────────
-- 14. CHECK-IN / CHECK-OUT EVENTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.checkin_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('check_in','check_out')),
  recorded_by UUID NOT NULL REFERENCES public.profiles(id),
  notes       TEXT DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_booking ON public.checkin_events(booking_id);

-- ────────────────────────────────────────────────────────────
-- 15. CONDITION REPORTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.condition_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('pre_use','post_use')),
  condition   TEXT NOT NULL CHECK (condition IN ('excellent','good','fair','poor','damaged')),
  description TEXT DEFAULT '',
  image_urls  TEXT[] DEFAULT '{}',
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cr_booking ON public.condition_reports(booking_id);

-- ────────────────────────────────────────────────────────────
-- 16. INCIDENTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.incidents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id  UUID NOT NULL REFERENCES public.resources(id),
  booking_id   UUID REFERENCES public.bookings(id),
  reported_by  UUID NOT NULL REFERENCES public.profiles(id),
  severity     TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status       TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','investigating','resolved','closed')),
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description  TEXT NOT NULL,
  resolution   TEXT,
  resolved_by  UUID REFERENCES public.profiles(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inc_resource ON public.incidents(resource_id);
CREATE INDEX IF NOT EXISTS idx_inc_status   ON public.incidents(status);

-- ────────────────────────────────────────────────────────────
-- 17. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
    'booking_created','booking_confirmed','booking_rejected',
    'booking_cancelled','booking_reminder',
    'verification_update','membership_invite',
    'incident_reported','incident_resolved',
    'waitlist_available','general'
  )),
  title       TEXT NOT NULL,
  body        TEXT DEFAULT '',
  metadata    JSONB DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_user   ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_type   ON public.notifications(type);

-- ────────────────────────────────────────────────────────────
-- 18. AUDIT LOG (append-only)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor  ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_time   ON public.audit_log(created_at);

-- ────────────────────────────────────────────────────────────
-- 19. FAIRSHARE POLICY CONFIG
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fairshare_policy (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version          TEXT NOT NULL UNIQUE,
  weight_wait_time NUMERIC(5,2) NOT NULL DEFAULT 0.30,
  weight_prior_usage NUMERIC(5,2) NOT NULL DEFAULT 0.25,
  weight_need_urgency NUMERIC(5,2) NOT NULL DEFAULT 0.20,
  weight_owner_priority NUMERIC(5,2) NOT NULL DEFAULT 0.15,
  weight_equal_access NUMERIC(5,2) NOT NULL DEFAULT 0.10,
  max_bookings_per_week INT NOT NULL DEFAULT 5,
  description      TEXT DEFAULT '',
  is_active        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default policy
INSERT INTO public.fairshare_policy (version, description, is_active) VALUES
  ('v1', 'Default FairShare allocation policy', true)
ON CONFLICT (version) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 20. AUTO-UPDATE updated_at TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Reuse handle_updated_at() from profiles migration
DO $$ BEGIN
  CREATE TRIGGER on_orgs_updated BEFORE UPDATE ON public.organisations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER on_resources_updated BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER on_bookings_updated BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER on_incidents_updated BEFORE UPDATE ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- ROW LEVEL SECURITY — all client-exposed tables
-- ============================================================

-- ── Helper: check if user is member of org with required role ──
CREATE OR REPLACE FUNCTION public.is_org_member(
  _org_id UUID, _user_id UUID, _min_roles TEXT[] DEFAULT '{owner,admin,manager,member}'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = _user_id AND role = ANY(_min_roles)
  );
$$;

-- ── Helper: check if user is org admin+ ──
CREATE OR REPLACE FUNCTION public.is_org_admin(
  _org_id UUID, _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = _org_id AND user_id = _user_id AND role IN ('owner','admin')
  );
$$;


-- ── ORGANISATIONS ──
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved orgs" ON public.organisations;
CREATE POLICY "Anyone can view approved orgs" ON public.organisations
  FOR SELECT TO authenticated
  USING (verification_status = 'approved'
    OR created_by = auth.uid()
    OR public.is_org_member(id, auth.uid()));

DROP POLICY IF EXISTS "Creator can insert org" ON public.organisations;
CREATE POLICY "Creator can insert org" ON public.organisations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Org admins can update" ON public.organisations;
CREATE POLICY "Org admins can update" ON public.organisations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(id, auth.uid()))
  WITH CHECK (public.is_org_admin(id, auth.uid()));


-- ── ORG MEMBERS ──
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own org members" ON public.org_members;
CREATE POLICY "Members can view own org members" ON public.org_members
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can manage members" ON public.org_members;
CREATE POLICY "Admins can manage members" ON public.org_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can update members" ON public.org_members;
CREATE POLICY "Admins can update members" ON public.org_members
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()))
  WITH CHECK (public.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can remove members" ON public.org_members;
CREATE POLICY "Admins can remove members" ON public.org_members
  FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()) OR user_id = auth.uid());


-- ── VERIFICATION DECISIONS ──
ALTER TABLE public.verification_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_decisions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view own decisions" ON public.verification_decisions;
CREATE POLICY "Org members can view own decisions" ON public.verification_decisions
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id, auth.uid()));

-- Inserts handled by server-side function only (no direct INSERT policy)


-- ── VERIFICATION DOCUMENTS ──
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins can view docs" ON public.verification_documents;
CREATE POLICY "Org admins can view docs" ON public.verification_documents
  FOR SELECT TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()));

DROP POLICY IF EXISTS "Org admins can upload docs" ON public.verification_documents;
CREATE POLICY "Org admins can upload docs" ON public.verification_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(org_id, auth.uid()) AND uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Org admins can delete docs" ON public.verification_documents;
CREATE POLICY "Org admins can delete docs" ON public.verification_documents
  FOR DELETE TO authenticated
  USING (public.is_org_admin(org_id, auth.uid()));


-- ── RESOURCE CATEGORIES ──
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.resource_categories;
CREATE POLICY "Anyone can view categories" ON public.resource_categories
  FOR SELECT TO authenticated USING (true);


-- ── RESOURCES ──
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published resources visible to all" ON public.resources;
CREATE POLICY "Published resources visible to all" ON public.resources
  FOR SELECT TO authenticated
  USING (publication_status = 'published'
    OR public.is_org_member(org_id, auth.uid()));

DROP POLICY IF EXISTS "Org managers can create resources" ON public.resources;
CREATE POLICY "Org managers can create resources" ON public.resources
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id, auth.uid(), '{owner,admin,manager}')
    AND created_by = auth.uid());

DROP POLICY IF EXISTS "Org managers can update resources" ON public.resources;
CREATE POLICY "Org managers can update resources" ON public.resources
  FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id, auth.uid(), '{owner,admin,manager}'))
  WITH CHECK (public.is_org_member(org_id, auth.uid(), '{owner,admin,manager}'));


-- ── AVAILABILITY WINDOWS ──
ALTER TABLE public.availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_windows FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view availability" ON public.availability_windows;
CREATE POLICY "Anyone can view availability" ON public.availability_windows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Resource managers can manage availability" ON public.availability_windows;
CREATE POLICY "Resource managers can manage availability" ON public.availability_windows
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = resource_id
      AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
  ));


-- ── MAINTENANCE BLOCKS ──
ALTER TABLE public.maintenance_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_blocks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view maintenance blocks" ON public.maintenance_blocks;
CREATE POLICY "Anyone can view maintenance blocks" ON public.maintenance_blocks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Resource managers can manage maintenance" ON public.maintenance_blocks;
CREATE POLICY "Resource managers can manage maintenance" ON public.maintenance_blocks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = resource_id
      AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
  ));


-- ── ELIGIBILITY RULES ──
ALTER TABLE public.eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_rules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view eligibility rules" ON public.eligibility_rules;
CREATE POLICY "Anyone can view eligibility rules" ON public.eligibility_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Resource managers can manage rules" ON public.eligibility_rules;
CREATE POLICY "Resource managers can manage rules" ON public.eligibility_rules
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = resource_id
      AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
  ));


-- ── USER CREDENTIALS ──
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credentials" ON public.user_credentials;
CREATE POLICY "Users can view own credentials" ON public.user_credentials
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can add own credentials" ON public.user_credentials;
CREATE POLICY "Users can add own credentials" ON public.user_credentials
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own credentials" ON public.user_credentials;
CREATE POLICY "Users can update own credentials" ON public.user_credentials
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ── BOOKINGS ──
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.is_org_member(org_id, auth.uid(), '{owner,admin,manager}'));

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND status = 'pending_approval');

DROP POLICY IF EXISTS "Booking participants can update" ON public.bookings;
CREATE POLICY "Booking participants can update" ON public.bookings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()
    OR public.is_org_member(org_id, auth.uid(), '{owner,admin,manager}'))
  WITH CHECK (user_id = auth.uid()
    OR public.is_org_member(org_id, auth.uid(), '{owner,admin,manager}'));


-- ── BOOKING HISTORY ──
ALTER TABLE public.booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants can view history" ON public.booking_history;
CREATE POLICY "Booking participants can view history" ON public.booking_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND (b.user_id = auth.uid()
        OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}'))
  ));

DROP POLICY IF EXISTS "System can insert history" ON public.booking_history;
CREATE POLICY "System can insert history" ON public.booking_history
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());


-- ── WAITING LIST ──
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own waitlist" ON public.waiting_list;
CREATE POLICY "Users can view own waitlist" ON public.waiting_list
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.is_org_member(org_id, auth.uid(), '{owner,admin,manager}'));

DROP POLICY IF EXISTS "Users can join waitlist" ON public.waiting_list;
CREATE POLICY "Users can join waitlist" ON public.waiting_list
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave waitlist" ON public.waiting_list;
CREATE POLICY "Users can leave waitlist" ON public.waiting_list
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ── CHECKIN EVENTS ──
ALTER TABLE public.checkin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants can view checkins" ON public.checkin_events;
CREATE POLICY "Booking participants can view checkins" ON public.checkin_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND (b.user_id = auth.uid()
        OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}'))
  ));

DROP POLICY IF EXISTS "Participants can record checkins" ON public.checkin_events;
CREATE POLICY "Participants can record checkins" ON public.checkin_events
  FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid());


-- ── CONDITION REPORTS ──
ALTER TABLE public.condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants can view reports" ON public.condition_reports;
CREATE POLICY "Booking participants can view reports" ON public.condition_reports
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND (b.user_id = auth.uid()
        OR public.is_org_member(b.org_id, auth.uid(), '{owner,admin,manager}'))
  ));

DROP POLICY IF EXISTS "Participants can add reports" ON public.condition_reports;
CREATE POLICY "Participants can add reports" ON public.condition_reports
  FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());


-- ── INCIDENTS ──
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view incidents" ON public.incidents;
CREATE POLICY "Org members can view incidents" ON public.incidents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = resource_id
      AND public.is_org_member(r.org_id, auth.uid())
  ) OR reported_by = auth.uid());

DROP POLICY IF EXISTS "Users can report incidents" ON public.incidents;
CREATE POLICY "Users can report incidents" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Org managers can update incidents" ON public.incidents;
CREATE POLICY "Org managers can update incidents" ON public.incidents
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = resource_id
      AND public.is_org_member(r.org_id, auth.uid(), '{owner,admin,manager}')
  ));


-- ── NOTIFICATIONS ──
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- notifications created by service logic


-- ── AUDIT LOG ──
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audit entries" ON public.audit_log;
CREATE POLICY "Users can view own audit entries" ON public.audit_log
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

DROP POLICY IF EXISTS "System can insert audit entries" ON public.audit_log;
CREATE POLICY "System can insert audit entries" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);  -- audit entries appended by service logic


-- ── FAIRSHARE POLICY ──
ALTER TABLE public.fairshare_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fairshare_policy FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active policy" ON public.fairshare_policy;
CREATE POLICY "Anyone can view active policy" ON public.fairshare_policy
  FOR SELECT TO authenticated USING (true);


-- ============================================================
-- GRANTS — least privilege
-- ============================================================

REVOKE ALL ON public.organisations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organisations TO authenticated;

REVOKE ALL ON public.org_members FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;

REVOKE ALL ON public.verification_decisions FROM anon, authenticated;
GRANT SELECT ON public.verification_decisions TO authenticated;

REVOKE ALL ON public.verification_documents FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.verification_documents TO authenticated;

REVOKE ALL ON public.resource_categories FROM anon, authenticated;
GRANT SELECT ON public.resource_categories TO authenticated;

REVOKE ALL ON public.resources FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.resources TO authenticated;

REVOKE ALL ON public.availability_windows FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_windows TO authenticated;

REVOKE ALL ON public.maintenance_blocks FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_blocks TO authenticated;

REVOKE ALL ON public.eligibility_rules FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eligibility_rules TO authenticated;

REVOKE ALL ON public.user_credentials FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_credentials TO authenticated;

REVOKE ALL ON public.bookings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;

REVOKE ALL ON public.booking_history FROM anon, authenticated;
GRANT SELECT, INSERT ON public.booking_history TO authenticated;

REVOKE ALL ON public.waiting_list FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.waiting_list TO authenticated;

REVOKE ALL ON public.checkin_events FROM anon, authenticated;
GRANT SELECT, INSERT ON public.checkin_events TO authenticated;

REVOKE ALL ON public.condition_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.condition_reports TO authenticated;

REVOKE ALL ON public.incidents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.incidents TO authenticated;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

REVOKE ALL ON public.fairshare_policy FROM anon, authenticated;
GRANT SELECT ON public.fairshare_policy TO authenticated;


-- ============================================================
-- SECURITY FUNCTIONS — server-enforced state transitions
-- ============================================================

-- ── Verification state transition ──
CREATE OR REPLACE FUNCTION public.transition_verification_status(
  _org_id UUID,
  _new_status TEXT,
  _reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _current_status TEXT;
  _actor UUID;
  _is_member BOOLEAN;
BEGIN
  _actor := auth.uid();
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get current status with row lock
  SELECT verification_status INTO _current_status
  FROM public.organisations WHERE id = _org_id FOR UPDATE;

  IF _current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organisation not found');
  END IF;

  -- Check membership
  SELECT public.is_org_admin(_org_id, _actor) INTO _is_member;

  -- Validate transitions
  -- Org admin can: draft→submitted
  -- Reviewer (non-member) can: submitted→under_review, under_review→approved/rejected/additional_information_required, any→suspended
  IF _current_status = 'draft' AND _new_status = 'submitted' THEN
    IF NOT _is_member THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only org admins can submit for verification');
    END IF;

  ELSIF _current_status = 'submitted' AND _new_status = 'under_review' THEN
    IF _is_member THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot review your own organisation');
    END IF;

  ELSIF _current_status = 'under_review' AND _new_status IN ('approved', 'rejected', 'additional_information_required') THEN
    IF _is_member THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot approve/reject your own organisation');
    END IF;

  ELSIF _current_status = 'additional_information_required' AND _new_status = 'submitted' THEN
    IF NOT _is_member THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only org admins can resubmit');
    END IF;

  ELSIF _new_status = 'suspended' THEN
    IF _is_member THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot suspend your own organisation');
    END IF;

  ELSE
    RETURN jsonb_build_object('success', false, 'error',
      format('Invalid transition: %s → %s', _current_status, _new_status));
  END IF;

  -- Apply transition
  UPDATE public.organisations SET verification_status = _new_status WHERE id = _org_id;

  -- Record decision
  INSERT INTO public.verification_decisions (org_id, previous_status, new_status, reason, decided_by)
  VALUES (_org_id, _current_status, _new_status, _reason, _actor);

  -- Audit log
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'verification_status_change', 'organisation', _org_id,
    jsonb_build_object('from', _current_status, 'to', _new_status, 'reason', _reason));

  RETURN jsonb_build_object('success', true, 'previous_status', _current_status, 'new_status', _new_status);
END;
$$;


-- ── Booking state transition (concurrency-safe) ──
CREATE OR REPLACE FUNCTION public.create_booking(
  _resource_id UUID,
  _starts_at TIMESTAMPTZ,
  _ends_at TIMESTAMPTZ,
  _purpose TEXT DEFAULT '',
  _notes TEXT DEFAULT '',
  _idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _actor UUID;
  _resource RECORD;
  _org RECORD;
  _conflict_count INT;
  _booking_id UUID;
  _member_org_id UUID;
BEGIN
  _actor := auth.uid();
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Idempotency check
  IF _idempotency_key IS NOT NULL THEN
    SELECT id INTO _booking_id FROM public.bookings WHERE idempotency_key = _idempotency_key;
    IF _booking_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'booking_id', _booking_id, 'idempotent', true);
    END IF;
  END IF;

  -- Validate time range
  IF _ends_at <= _starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'End time must be after start time');
  END IF;
  IF _starts_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot book in the past');
  END IF;

  -- Load resource with lock
  SELECT r.*, o.verification_status AS org_verification
  INTO _resource
  FROM public.resources r
  JOIN public.organisations o ON o.id = r.org_id
  WHERE r.id = _resource_id
  FOR UPDATE OF r;

  IF _resource IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource not found');
  END IF;

  IF _resource.publication_status != 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource is not available for booking');
  END IF;

  IF _resource.org_verification != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organisation is not verified');
  END IF;

  -- Check duration limit
  IF EXTRACT(EPOCH FROM (_ends_at - _starts_at)) / 3600 > _resource.max_booking_duration_hours THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Booking exceeds maximum duration of %s hours', _resource.max_booking_duration_hours));
  END IF;

  -- Check notice period
  IF EXTRACT(EPOCH FROM (_starts_at - now())) / 3600 < _resource.min_notice_hours THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Minimum notice of %s hours required', _resource.min_notice_hours));
  END IF;

  -- Check maintenance blocks
  IF EXISTS (
    SELECT 1 FROM public.maintenance_blocks
    WHERE resource_id = _resource_id
      AND starts_at < _ends_at AND ends_at > _starts_at
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource is under maintenance during this period');
  END IF;

  -- Check for conflicting bookings (exclusive resources)
  IF _resource.resource_type = 'exclusive' THEN
    SELECT COUNT(*) INTO _conflict_count
    FROM public.bookings
    WHERE resource_id = _resource_id
      AND status IN ('pending_approval', 'confirmed')
      AND starts_at < _ends_at AND ends_at > _starts_at;

    IF _conflict_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Time slot conflicts with existing booking');
    END IF;
  ELSE
    -- Shared resource: check capacity
    SELECT COUNT(*) INTO _conflict_count
    FROM public.bookings
    WHERE resource_id = _resource_id
      AND status IN ('pending_approval', 'confirmed')
      AND starts_at < _ends_at AND ends_at > _starts_at;

    IF _conflict_count >= _resource.capacity THEN
      RETURN jsonb_build_object('success', false, 'error', 'Resource at maximum capacity for this time slot');
    END IF;
  END IF;

  -- Find the user's org membership (for the booking org_id)
  SELECT org_id INTO _member_org_id
  FROM public.org_members
  WHERE user_id = _actor
  LIMIT 1;

  IF _member_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must belong to an organisation to book resources');
  END IF;

  -- Create booking
  INSERT INTO public.bookings (
    resource_id, user_id, org_id, status,
    starts_at, ends_at, purpose, notes,
    idempotency_key, policy_version
  ) VALUES (
    _resource_id, _actor, _member_org_id, 'pending_approval',
    _starts_at, _ends_at, _purpose, _notes,
    _idempotency_key, 'v1'
  ) RETURNING id INTO _booking_id;

  -- Record history
  INSERT INTO public.booking_history (booking_id, previous_status, new_status, changed_by, reason)
  VALUES (_booking_id, NULL, 'pending_approval', _actor, 'Booking created');

  -- Audit
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'booking_created', 'booking', _booking_id,
    jsonb_build_object('resource_id', _resource_id, 'starts_at', _starts_at, 'ends_at', _ends_at));

  RETURN jsonb_build_object('success', true, 'booking_id', _booking_id);
END;
$$;


-- ── Booking status transition ──
CREATE OR REPLACE FUNCTION public.transition_booking_status(
  _booking_id UUID,
  _new_status TEXT,
  _reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _actor UUID;
  _booking RECORD;
  _is_owner BOOLEAN;
  _is_booker BOOLEAN;
BEGIN
  _actor := auth.uid();
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock and load booking
  SELECT * INTO _booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF _booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  _is_booker := (_booking.user_id = _actor);
  SELECT public.is_org_member(_booking.org_id, _actor, '{owner,admin,manager}') INTO _is_owner;

  -- Validate transitions
  CASE
    WHEN _booking.status = 'pending_approval' AND _new_status = 'confirmed' THEN
      -- Only resource-owning org can confirm
      IF NOT EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = _booking.resource_id
          AND public.is_org_member(r.org_id, _actor, '{owner,admin,manager}')
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can confirm bookings');
      END IF;

    WHEN _booking.status = 'pending_approval' AND _new_status = 'rejected' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = _booking.resource_id
          AND public.is_org_member(r.org_id, _actor, '{owner,admin,manager}')
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can reject bookings');
      END IF;

    WHEN _booking.status IN ('pending_approval', 'confirmed') AND _new_status = 'cancelled' THEN
      IF NOT (_is_booker OR _is_owner) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorised to cancel this booking');
      END IF;

    WHEN _booking.status = 'confirmed' AND _new_status = 'rescheduling_requested' THEN
      IF NOT _is_booker THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the booker can request rescheduling');
      END IF;

    WHEN _booking.status = 'confirmed' AND _new_status = 'completed' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = _booking.resource_id
          AND public.is_org_member(r.org_id, _actor, '{owner,admin,manager}')
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can mark complete');
      END IF;

    WHEN _booking.status = 'confirmed' AND _new_status = 'no_show' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.resources r
        WHERE r.id = _booking.resource_id
          AND public.is_org_member(r.org_id, _actor, '{owner,admin,manager}')
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only resource managers can mark no-show');
      END IF;

    ELSE
      RETURN jsonb_build_object('success', false, 'error',
        format('Invalid transition: %s → %s', _booking.status, _new_status));
  END CASE;

  -- Apply transition
  UPDATE public.bookings
  SET status = _new_status,
      approved_by = CASE WHEN _new_status = 'confirmed' THEN _actor ELSE approved_by END,
      cancelled_by = CASE WHEN _new_status = 'cancelled' THEN _actor ELSE cancelled_by END,
      cancellation_reason = CASE WHEN _new_status = 'cancelled' THEN _reason ELSE cancellation_reason END
  WHERE id = _booking_id;

  -- Record history
  INSERT INTO public.booking_history (booking_id, previous_status, new_status, changed_by, reason)
  VALUES (_booking_id, _booking.status, _new_status, _actor, _reason);

  -- Audit
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, 'booking_status_change', 'booking', _booking_id,
    jsonb_build_object('from', _booking.status, 'to', _new_status, 'reason', _reason));

  RETURN jsonb_build_object('success', true, 'previous_status', _booking.status, 'new_status', _new_status);
END;
$$;


-- ── Auto-create org membership when org is created ──
CREATE OR REPLACE FUNCTION public.handle_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');

  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (NEW.created_by, 'organisation_created', 'organisation', NEW.id,
    jsonb_build_object('name', NEW.name, 'slug', NEW.slug));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_created ON public.organisations;
CREATE TRIGGER on_org_created
  AFTER INSERT ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_org();


-- ── Prevent members from self-promoting to owner/admin ──
CREATE OR REPLACE FUNCTION public.protect_member_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _actor UUID;
  _actor_role TEXT;
BEGIN
  _actor := auth.uid();

  -- If the member is modifying their own role
  IF NEW.user_id = _actor AND TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change your own role';
    END IF;
  END IF;

  -- On INSERT: new member cannot be inserted as owner (only trigger does that)
  IF TG_OP = 'INSERT' AND NEW.role = 'owner' AND _actor IS NOT NULL THEN
    -- Allow only if this is from the org creation trigger (actor = invited_by = NULL scenario)
    IF NEW.invited_by IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot directly assign owner role';
    END IF;
  END IF;

  -- On UPDATE: only owners can promote to admin
  IF TG_OP = 'UPDATE' AND NEW.role IN ('owner', 'admin') AND NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT role INTO _actor_role FROM public.org_members
    WHERE org_id = NEW.org_id AND user_id = _actor;
    IF _actor_role != 'owner' THEN
      RAISE EXCEPTION 'Only owners can promote members to admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_member_role_change ON public.org_members;
CREATE TRIGGER on_member_role_change
  BEFORE INSERT OR UPDATE ON public.org_members
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_member_role_escalation();


-- ── Prevent direct verification_status changes via UPDATE ──
CREATE OR REPLACE FUNCTION public.protect_org_verification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'Use transition_verification_status() to change verification status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_verification_protect ON public.organisations;
CREATE TRIGGER on_org_verification_protect
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_org_verification_status();


-- ── Prevent direct booking status changes via UPDATE ──
CREATE OR REPLACE FUNCTION public.protect_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Use transition_booking_status() to change booking status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_status_protect ON public.bookings;
CREATE TRIGGER on_booking_status_protect
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_booking_status();
