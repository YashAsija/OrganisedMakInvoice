-- Add clientCompanyName column to invoices table.
-- The BILLED TO section in the invoice editor has a "Company Name" field
-- that was stored in state as clientCompanyName but the DB column was missing.
-- This caused the value to be stripped from the upsert payload and never saved,
-- meaning the field appeared blank when editing an existing document.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS "clientCompanyName" TEXT;