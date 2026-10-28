-- supabase/seed.sql
-- ShareSphere — Example seed data
-- ============================================================
-- This file is for local development only.
-- Run with: supabase db seed  (requires Supabase CLI)
--
-- It inserts safe example rows so you can explore the app
-- without setting up real data manually.
-- ============================================================

-- NOTE: Do NOT run this against a production database.
--       All IDs below are illustrative UUIDs; adjust as needed.

-- ── Example organisation ─────────────────────────────────────────────────────
-- INSERT INTO organisations (id, name, description, status, admin_id, created_at)
-- VALUES (
--   'aaaaaaaa-0000-0000-0000-000000000001',
--   'Community Hub',
--   'A local organisation that shares resources with the community.',
--   'approved',
--   'bbbbbbbb-0000-0000-0000-000000000001',  -- replace with a real user UUID
--   NOW()
-- );

-- ── Example resource ─────────────────────────────────────────────────────────
-- INSERT INTO resources (id, org_id, title, description, category, status, created_at)
-- VALUES (
--   'cccccccc-0000-0000-0000-000000000001',
--   'aaaaaaaa-0000-0000-0000-000000000001',
--   'Projector',
--   'Full-HD projector available for events.',
--   'equipment',
--   'available',
--   NOW()
-- );

-- Uncomment and adapt the statements above once your database
-- schema migrations have been applied.
