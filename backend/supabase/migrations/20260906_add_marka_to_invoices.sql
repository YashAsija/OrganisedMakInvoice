-- Supabase Migration: Add marka column to invoices table and reload schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS "marka" TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
