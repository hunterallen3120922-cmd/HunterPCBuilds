-- HunterPCBuilds: 3D prints page. Run after 7-shop-and-trade-ins.sql. Safe to run again.
-- Paste this whole file into Supabase → SQL Editor → New query, and press Run.

-- ─── Print Shop + past prints, managed in the admin Shop tab ─────────────────
-- 'prints' = ready-made prints for sale on the 3D Prints page. 'past_prints' = the "Prints I've made" gallery.
alter table public.shop_items drop constraint if exists shop_items_tab_check;
alter table public.shop_items add constraint shop_items_tab_check check (tab in ('pcs', 'laptops', 'parts', 'prints', 'past_prints'));
alter table public.shop_items add column if not exists colors text[] not null default '{}';  -- color choices for a print
grant select (colors) on public.shop_items to anon;

-- ─── Custom print requests land in Quotes ────────────────────────────────────
alter table public.quotes add column if not exists print_job jsonb check (print_job is null or pg_column_size(print_job) < 20000); -- what they asked for
alter table public.quotes drop constraint if exists quotes_purpose_check;
alter table public.quotes add constraint quotes_purpose_check check (purpose in ('customer', 'resale', 'trade_in', 'print'));

-- The site's custom print form can add a new print quote, and nothing else. Only you can read them.
drop policy if exists "the site can send print requests" on public.quotes;
create policy "the site can send print requests" on public.quotes
  for insert to anon, authenticated
  with check (purpose = 'print' and status = 'draft' and job_id is null and notes is null and offer is null);
grant insert on public.quotes to anon;

-- ─── Photos and model files people attach ────────────────────────────────────
-- A private bucket: visitors can upload (25 MB max, images and 3D model files only) but never see or change files.
-- You open them from the request in the admin Quotes tab.
insert into storage.buckets (id, name, public, file_size_limit)
values ('print-uploads', 'print-uploads', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "the site can upload print files" on storage.objects;
create policy "the site can upload print files" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'print-uploads'
    and (storage.foldername(name))[1] = 'requests'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'gif', 'stl', '3mf', 'obj', 'step', 'stp')
  );
drop policy if exists "admins can see print files" on storage.objects;
create policy "admins can see print files" on storage.objects
  for select using (bucket_id = 'print-uploads' and public.is_admin());
drop policy if exists "admins can delete print files" on storage.objects;
create policy "admins can delete print files" on storage.objects
  for delete using (bucket_id = 'print-uploads' and public.is_admin());
