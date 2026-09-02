-- Root Cause 3 Migration: Supabase Table Unique Constraint & Realtime Settings

-- 1. Drop duplicate active subscriptions first, keeping latest
DELETE FROM subscriptions a
USING subscriptions b
WHERE a.created_at < b.created_at AND a.user_id = b.user_id;

-- 2. Add unique constraint so upsert on user_id works correctly
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);

-- 3. Ensure Realtime is enabled on subscriptions and subscription_usage
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

-- 4. Ensure RLS policy allows users to read their own row
DROP POLICY IF EXISTS "Users read own subscription" ON subscriptions;
CREATE POLICY "Users read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
