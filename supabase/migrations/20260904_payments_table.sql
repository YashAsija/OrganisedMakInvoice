-- Create payments table for logging settlements and reconciling invoices / purchases
create table if not exists payments (
  id text primary key default ('pmt_' || replace(gen_random_uuid()::text, '-', '')),
  user_id uuid references auth.users(id) on delete cascade,
  "userId" text,
  document_id text not null,
  amount numeric(12,2) not null default 0,
  payment_date date default current_date,
  payment_method text not null default 'cash',
  reference_number text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure missing columns are added if table pre-existed
alter table payments add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table payments add column if not exists "userId" text;
alter table payments add column if not exists document_id text;
alter table payments add column if not exists amount numeric(12,2) default 0;
alter table payments add column if not exists payment_date date;
alter table payments add column if not exists payment_method text default 'cash';
alter table payments add column if not exists reference_number text;
alter table payments add column if not exists notes text;

-- Row Level Security
alter table payments enable row level security;

-- RLS Policy supporting both user_id and userId
drop policy if exists "Users can manage their own payments" on payments;
create policy "Users can manage their own payments"
  on payments for all
  using (auth.uid() = user_id or auth.uid()::text = "userId")
  with check (auth.uid() = user_id or auth.uid()::text = "userId");

-- High performance indices
create index if not exists payments_user_id_idx on payments(user_id);
create index if not exists payments_document_id_idx on payments(document_id);
create index if not exists payments_payment_date_idx on payments(payment_date);
