-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Quota Tracking Table
CREATE TABLE IF NOT EXISTS gemini_quota_tracking (
    date DATE PRIMARY KEY,
    requests INT DEFAULT 0,
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Chat Cache Table
CREATE TABLE IF NOT EXISTS chat_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_embedding vector(768),
    reply TEXT,
    route TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for similarity search
CREATE INDEX IF NOT EXISTS chat_cache_embedding_idx ON chat_cache USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);

-- 3. Match Cache RPC
CREATE OR REPLACE FUNCTION match_chat_cache(
  query_embedding vector(768),
  match_threshold float,
  recent_days int DEFAULT 7
)
RETURNS TABLE (
  id uuid,
  reply text,
  route text,
  similarity float,
  created_at timestamp with time zone
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cc.id,
    cc.reply,
    cc.route,
    1 - (cc.query_embedding <=> query_embedding) as similarity,
    cc.created_at
  FROM chat_cache cc
  WHERE 1 - (cc.query_embedding <=> query_embedding) > match_threshold
    AND cc.created_at > (now() - interval '30 days')
  ORDER BY cc.query_embedding <=> query_embedding
  LIMIT 1;
$$;
