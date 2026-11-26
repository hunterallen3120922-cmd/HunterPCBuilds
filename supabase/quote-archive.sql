-- 11: lets you archive finished quotes (the Archived section in the Quotes tab),
-- and keeps empty part rows (like a GPU line you haven't picked yet) when you save an unfinished quote.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
alter table public.quotes add column if not exists archived_at timestamptz;
alter table public.quote_items drop constraint if exists quote_items_name_check;
alter table public.quote_items add constraint quote_items_name_check check (char_length(name) <= 200);
