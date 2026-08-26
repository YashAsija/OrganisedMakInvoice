ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
CREATE POLICY "Allow public read for shared invoices" ON invoices FOR SELECT USING (is_public = true);
