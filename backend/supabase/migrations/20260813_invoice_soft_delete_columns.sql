-- Migration: Add soft-delete columns to invoices table
-- Safe to run even if columns already exist (IF NOT EXISTS guards)

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS "isDeleted" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletedAt" timestamptz;

-- Index for fast Bin queries (filter by user + deleted status)
CREATE INDEX IF NOT EXISTS invoices_soft_delete_idx ON invoices ("userId", "isDeleted");
