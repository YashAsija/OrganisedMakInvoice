-- Add shippedToCompanyName column to invoices table
-- This column stores the company name for the "Shipped To" section of invoices.
-- It was missing from the DB schema, causing it to be stripped from the save payload
-- and never persisted, resulting in it not appearing in document previews.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS "shippedToCompanyName" TEXT;
