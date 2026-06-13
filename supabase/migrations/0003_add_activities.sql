-- Gym Genius — add flexible activities (Padel, HIIT, jump rope, etc.)
-- Adds an `activities` JSONB array to each user's row. Additive and idempotent.
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.

alter table public.gym_data
  add column if not exists activities jsonb not null default '[]'::jsonb;
