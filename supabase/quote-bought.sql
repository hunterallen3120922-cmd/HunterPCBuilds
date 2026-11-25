-- 10: lets a quote remember which parts you've already bought (the "Bought" tick).
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
alter table public.quote_items add column if not exists bought boolean not null default false;
