create table if not exists public.fallback_logs (
    id uuid primary key default gen_random_uuid(),
    question text not null,
    top_matches jsonb,
    threshold float,
    session_id uuid references public.chat_sessions(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);
