-- Gym Genius — initial schema
-- One row per authenticated user holding the whole app state as JSONB.
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.

create table if not exists public.gym_data (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  exercises    jsonb       not null default '{}'::jsonb,
  prs          jsonb       not null default '{}'::jsonb,
  body_weights jsonb       not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

-- Lock the table down: every request must be authenticated and may only
-- touch its own row. The public anon key is safe to ship because these
-- policies enforce per-user isolation at the database level.
alter table public.gym_data enable row level security;

drop policy if exists "Users read own gym data"   on public.gym_data;
drop policy if exists "Users insert own gym data" on public.gym_data;
drop policy if exists "Users update own gym data" on public.gym_data;

create policy "Users read own gym data"
  on public.gym_data for select
  using (auth.uid() = user_id);

create policy "Users insert own gym data"
  on public.gym_data for insert
  with check (auth.uid() = user_id);

create policy "Users update own gym data"
  on public.gym_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh on every write (handy for debugging sync).
create or replace function public.gym_data_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gym_data_set_updated_at on public.gym_data;
create trigger gym_data_set_updated_at
  before update on public.gym_data
  for each row execute function public.gym_data_touch_updated_at();
