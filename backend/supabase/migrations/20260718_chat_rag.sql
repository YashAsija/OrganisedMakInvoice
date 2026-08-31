-- Enable pgvector extension
create extension if not exists vector;

-- Table to store knowledge base chunks
create table if not exists public.kb_embeddings (
    id uuid primary key default gen_random_uuid(),
    content text not null,
    metadata jsonb default '{}'::jsonb,
    embedding vector(768) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for vector search (HNSW index for cosine distance)
create index on public.kb_embeddings using hnsw (embedding vector_cosine_ops);

-- Table for chat sessions
create table if not exists public.chat_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null, -- Optional: null for anonymous
    language text default 'en',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table for chat messages
create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references public.chat_sessions(id) on delete cascade not null,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PostgreSQL function for similarity search
create or replace function match_kb_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.kb_embeddings kb
  where 1 - (kb.embedding <=> query_embedding) > match_threshold
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS policies
alter table public.kb_embeddings enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Public can read kb_embeddings
DROP POLICY IF EXISTS "Allow public read-only access to kb_embeddings" ON public.kb_embeddings;
create policy "Allow public read-only access to kb_embeddings"
  on public.kb_embeddings for select using (true);

-- Users can read/write their own chat sessions
DROP POLICY IF EXISTS "Users can read own chat sessions" ON public.chat_sessions;
create policy "Users can read own chat sessions"
  on public.chat_sessions for select using (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.chat_sessions;
create policy "Users can insert own chat sessions"
  on public.chat_sessions for insert with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
create policy "Users can update own chat sessions"
  on public.chat_sessions for update using (auth.uid() = user_id);

-- Users can read/write messages in their own sessions
DROP POLICY IF EXISTS "Users can read messages in their own sessions" ON public.chat_messages;
create policy "Users can read messages in their own sessions"
  on public.chat_messages for select using (
    exists (select 1 from public.chat_sessions where id = chat_messages.session_id and user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert messages in their own sessions" ON public.chat_messages;
create policy "Users can insert messages in their own sessions"
  on public.chat_messages for insert with check (
    exists (select 1 from public.chat_sessions where id = chat_messages.session_id and user_id = auth.uid())
  );
