CREATE TABLE IF NOT EXISTS rate_limit_events (
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_events (ip, endpoint, hit_at);
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only — rate_limit_events" ON rate_limit_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
