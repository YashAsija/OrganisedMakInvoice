-- Create Support Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open', -- Open, In Progress, Resolved, Closed
    priority TEXT NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Urgent
    category TEXT NOT NULL DEFAULT 'General',
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Ticket Messages table for replies/convo threads
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL, -- 'user' | 'admin'
    sender_id UUID, -- References auth.users(id) if 'user'
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Admin Audit Log table for logins
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL, -- 'success' | 'failed'
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and Lock down for Service Role (Admin endpoints) only
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin role access only — tickets"
  ON public.tickets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin role access only — ticket_messages"
  ON public.ticket_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin role access only — admin_audit_logs"
  ON public.admin_audit_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add admin_notes column to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_notes TEXT;
