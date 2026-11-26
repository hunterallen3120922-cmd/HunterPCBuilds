-- 11: lets you archive finished quotes (the Archived section in the Quotes tab).
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
alter table public.quotes add column if not exists archived_at timestamptz;
