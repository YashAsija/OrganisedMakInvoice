-- Supabase Migrations for Real-time Multi-device Subscription & Usage Sync

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway                 TEXT CHECK (gateway IN ('razorpay', 'paddle')) NOT NULL,
  gateway_sub_id          TEXT,
  plan_key                TEXT CHECK (plan_key IN ('starter', 'basic', 'professional', 'enterprise')) NOT NULL DEFAULT 'starter',
  billing_cycle           TEXT CHECK (billing_cycle IN ('monthly', 'yearly_recurring', 'yearly_onetime')) NOT NULL DEFAULT 'monthly',
  status                  TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')) NOT NULL DEFAULT 'active',
  auto_renew              BOOLEAN NOT NULL DEFAULT true,
  current_period_end      TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  upgraded_from           UUID REFERENCES subscriptions(id),
  upgraded_at             TIMESTAMPTZ,
  user_email              TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS subscription_usage (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  documents_used    INTEGER NOT NULL DEFAULT 0,
  reports_used      INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies — users can only read their own data
DROP POLICY IF EXISTS "Users read own subscription" ON subscriptions;
CREATE POLICY "Users read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own usage" ON subscription_usage;
CREATE POLICY "Users read own usage" ON subscription_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Enable Realtime on both tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'subscription_usage'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE subscription_usage;
  END IF;
END $$;
