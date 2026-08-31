ALTER TABLE gemini_quota_tracking DROP CONSTRAINT gemini_quota_tracking_pkey;
ALTER TABLE gemini_quota_tracking ADD COLUMN IF NOT EXISTS model_name TEXT NOT NULL DEFAULT 'gemini-2.5-flash-lite';
ALTER TABLE gemini_quota_tracking ADD PRIMARY KEY (date, model_name);
