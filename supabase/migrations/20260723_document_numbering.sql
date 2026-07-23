-- Migration: Add document numbering fields for proforma invoice, debit note, credit note, and quote
-- These columns store the user-configured prefix and starting number for each document type.

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS proforma_prefix TEXT DEFAULT 'PRO',
  ADD COLUMN IF NOT EXISTS starting_proforma_number TEXT DEFAULT '1',
  ADD COLUMN IF NOT EXISTS debit_note_prefix TEXT DEFAULT 'DN',
  ADD COLUMN IF NOT EXISTS starting_debit_note_number TEXT DEFAULT '1',
  ADD COLUMN IF NOT EXISTS credit_note_prefix TEXT DEFAULT 'CN',
  ADD COLUMN IF NOT EXISTS starting_credit_note_number TEXT DEFAULT '1',
  ADD COLUMN IF NOT EXISTS quote_prefix TEXT DEFAULT 'EST',
  ADD COLUMN IF NOT EXISTS starting_quote_number TEXT DEFAULT '1';
