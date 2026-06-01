-- Gym Genius — add running efforts
-- Adds a `runs` JSONB array to each user's row. Additive and idempotent.
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.

alter table public.gym_data
  add column if not exists runs jsonb not null default '[]'::jsonb;
