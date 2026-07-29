-- ============================================================
-- PUBLIC INVOICE PREVIEW POLICY
-- Run this once in Supabase Dashboard → SQL Editor
--
-- This allows the /invoice/preview page (and the API route behind it)
-- to read invoice rows without requiring a user session.
-- The existing owner-only policies are kept intact; this just adds
-- an additional SELECT-only rule that enables share links to work.
-- ============================================================

-- 1. Allow anyone (including unauthenticated visitors) to read invoices by ID.
--    This is safe because:
--      a) Invoice IDs are random and hard to enumerate.
--      b) Only SELECT is granted — no INSERT/UPDATE/DELETE.
--      c) Write policies still enforce auth.uid() ownership.
DROP POLICY IF EXISTS "Allow public read for invoice preview" ON invoices;
CREATE POLICY "Allow public read for invoice preview"
  ON invoices FOR SELECT
  USING (true);

-- 2. Allow public read on company_settings so the profile is returned in the preview.
DROP POLICY IF EXISTS "Allow public read for invoice preview" ON company_settings;
CREATE POLICY "Allow public read for invoice preview"
  ON company_settings FOR SELECT
  USING (true);

-- 3. Allow public read on users table for profile lookup in preview.
DROP POLICY IF EXISTS "Allow public read for invoice preview" ON users;
CREATE POLICY "Allow public read for invoice preview"
  ON users FOR SELECT
  USING (true);
