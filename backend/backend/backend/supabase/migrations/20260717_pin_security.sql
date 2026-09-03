create table if not exists user_pin_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hashed_pin text not null,
  salt text not null,
  is_pin_enabled boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table user_pin_security enable row level security;

create policy "Users manage their own pin"
  on user_pin_security
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RPC to verify pin server-side so raw comparison logic isn't only client-side
create or replace function verify_user_pin(input_hashed_pin text)
returns boolean
language plpgsql
security definer
as $$
declare
  stored_hash text;
begin
  select hashed_pin into stored_hash
  from user_pin_security
  where user_id = auth.uid();

  if stored_hash is null then
    return false;
  end if;

  return stored_hash = input_hashed_pin;
end;
$$;
