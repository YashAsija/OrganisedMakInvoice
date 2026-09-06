-- Supabase Migration: Add deliveryNote column and reload schema
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "deliveryNote" text;
NOTIFY pgrst, 'reload schema';
