-- Subscriptions and User Gateway Schema Migration for Razorpay + Paddle Integration

-- 1. Create gateway enum type if it does not exist
DO $$ BEGIN
    CREATE TYPE payment_gateway AS ENUM ('razorpay', 'paddle');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    gateway payment_gateway NOT NULL,
    gateway_subscription_id TEXT NOT NULL UNIQUE,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add index on gateway_subscription_id & user_id for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_gateway_sub_id ON public.subscriptions(gateway_subscription_id);

-- 4. Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription data
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- 5. Add subscription columns to public.users table if it exists
DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gateway payment_gateway;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gateway_subscription_id TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_id TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;
