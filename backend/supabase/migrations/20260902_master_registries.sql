-- Migration: Complete Cross-Device Synchronization for Master Registries, Clients, and Vendors
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Add master_registries JSONB column to company_settings if not exists
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS master_registries JSONB DEFAULT '{}'::jsonb;

-- 2. Ensure RLS is active on company_settings and user has full access to their own data
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own company settings" ON public.company_settings;
CREATE POLICY "Users can view their own company settings"
ON public.company_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own company settings" ON public.company_settings;
CREATE POLICY "Users can insert their own company settings"
ON public.company_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own company settings" ON public.company_settings;
CREATE POLICY "Users can update their own company settings"
ON public.company_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Ensure RLS on clients table allows SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage their own clients"
ON public.clients FOR ALL
TO authenticated
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- 4. Enable Supabase Realtime for company_settings and clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'company_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_settings;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
  END IF;
END $$;

-- 5. Set REPLICA IDENTITY FULL for complete Realtime update/delete event payloads
ALTER TABLE public.company_settings REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;

-- 6. Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
