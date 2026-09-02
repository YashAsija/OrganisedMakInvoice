-- SQL Migration: subscription_usage table and user_id foreign key constraint

CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID REFERENCES public.users(uid) ON DELETE CASCADE,
  plan_type             TEXT,
  plan_name             TEXT,
  action                TEXT, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'renewed'
  authorized_token_node TEXT,
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  documents_used        INTEGER DEFAULT 0,
  reports_used          INTEGER DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users read own usage" ON public.subscription_usage;
CREATE POLICY "Users read own usage" ON public.subscription_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own usage" ON public.subscription_usage;
CREATE POLICY "Users insert own usage" ON public.subscription_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own usage" ON public.subscription_usage;
CREATE POLICY "Users update own usage" ON public.subscription_usage
  FOR ALL USING (auth.uid() = user_id);

-- Enable Realtime for subscription_usage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscription_usage'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_usage;
  END IF;
END $$;
