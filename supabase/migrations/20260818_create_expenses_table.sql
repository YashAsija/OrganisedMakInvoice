-- Create or update expenses table with complete backward & forward column support
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  "userId" text,
  expense_date date,
  date text,
  category text not null default 'General',
  vendor text not null default 'Vendor',
  description text,
  amount numeric(12,2) not null default 0,
  payment_mode text not null default 'Cash',
  reference_number text,
  status text not null default 'paid',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure missing columns are added if expenses table pre-existed
alter table expenses add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table expenses add column if not exists "userId" text;
alter table expenses add column if not exists expense_date date;
alter table expenses add column if not exists date text;
alter table expenses add column if not exists vendor text default 'Vendor';
alter table expenses add column if not exists payment_mode text default 'Cash';
alter table expenses add column if not exists reference_number text;
alter table expenses add column if not exists status text default 'paid';

-- Row Level Security
alter table expenses enable row level security;

-- RLS Policy supporting both user_id and userId
drop policy if exists "Users can manage their own expenses" on expenses;
create policy "Users can manage their own expenses"
  on expenses for all
  using (auth.uid() = user_id or auth.uid()::text = "userId")
  with check (auth.uid() = user_id or auth.uid()::text = "userId");

-- Indexes for high performance
create index if not exists expenses_user_id_idx on expenses(user_id);
create index if not exists expenses_userid_idx on expenses("userId");
create index if not exists expenses_expense_date_idx on expenses(expense_date);
