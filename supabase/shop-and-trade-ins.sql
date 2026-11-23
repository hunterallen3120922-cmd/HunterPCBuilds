-- HunterPCBuilds: Shop items + trade-ins in Quotes. Run after the quotes files (5 and 6). Safe to run again.
-- Paste this whole file into Supabase → SQL Editor → New query, and press Run.

-- ─── Shop items ──────────────────────────────────────────────────────────────
-- What shows on the site's Shop page. Photos go in the build-photos bucket (under shop/).
create table if not exists public.shop_items (
  id          uuid primary key default gen_random_uuid(),
  tab         text not null default 'pcs' check (tab in ('pcs', 'laptops', 'parts')),
  name        text not null check (char_length(name) between 1 and 120),
  price       numeric(10, 2) not null default 0 check (price >= 0),
  condition   text check (char_length(condition) <= 60),               -- "New build", "Refurbished · A grade", "Used · tested"
  note        text check (char_length(note) <= 40),                    -- small tag on the photo, e.g. "1440p gaming"
  specs       text[] not null default '{}',
  photos      text[] not null default '{}',                            -- storage paths; the first is the cover
  status      text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  published   boolean not null default true,                           -- false = hidden from the site
  cost        numeric(10, 2),                                          -- private: what it cost you (never shown on the site)
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.shop_items enable row level security;

-- Visitors can see published items, but not your cost: the site only reads the public columns.
revoke select on public.shop_items from anon;
grant select (id, tab, name, price, condition, note, specs, photos, status, published, sort_order, created_at) on public.shop_items to anon;

drop policy if exists "anyone can see published shop items" on public.shop_items;
create policy "anyone can see published shop items" on public.shop_items
  for select using (published or public.is_admin());
drop policy if exists "admins can add shop items" on public.shop_items;
create policy "admins can add shop items" on public.shop_items for insert with check (public.is_admin());
drop policy if exists "admins can edit shop items" on public.shop_items;
create policy "admins can edit shop items" on public.shop_items for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can delete shop items" on public.shop_items;
create policy "admins can delete shop items" on public.shop_items for delete using (public.is_admin());

drop trigger if exists touch_updated_at on public.shop_items;
create trigger touch_updated_at before update on public.shop_items for each row execute function public.touch_updated_at();

-- ─── Trade-ins land in Quotes ────────────────────────────────────────────────
-- A trade-in request from the site becomes a quote with purpose 'trade_in'.
alter table public.quotes add column if not exists trade_in jsonb check (trade_in is null or pg_column_size(trade_in) < 20000); -- what they sent
alter table public.quotes add column if not exists offer    numeric(10, 2);                                                       -- your offer
alter table public.quotes drop constraint if exists quotes_purpose_check;
alter table public.quotes add constraint quotes_purpose_check check (purpose in ('customer', 'resale', 'trade_in'));

-- The site's trade-in form can add a new trade-in quote, and nothing else. Only you can read them.
drop policy if exists "the site can send trade-ins" on public.quotes;
create policy "the site can send trade-ins" on public.quotes
  for insert to anon, authenticated
  with check (purpose = 'trade_in' and status = 'draft' and job_id is null and notes is null and offer is null);
grant insert on public.quotes to anon;
