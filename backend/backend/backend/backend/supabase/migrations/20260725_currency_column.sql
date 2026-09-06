-- Migration: Add currency column to company_settings if not already present
-- Without this, the currency CODE (e.g. 'INR', 'USD') was never persisted to the DB,
-- only currency_symbol was stored, causing mismatches on new devices.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
