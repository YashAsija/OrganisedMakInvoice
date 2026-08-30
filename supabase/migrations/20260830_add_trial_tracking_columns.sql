-- Add trial tracking columns to public.subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_used_plans text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

-- Verify columns created correctly
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' AND table_schema = 'public'
ORDER BY ordinal_position;
