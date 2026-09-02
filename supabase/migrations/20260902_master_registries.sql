-- Migration: Add master_registries JSONB column to company_settings for cross-device master databases synchronization
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS master_registries JSONB DEFAULT '{}'::jsonb;

-- Grant permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON public.company_settings TO authenticated;
