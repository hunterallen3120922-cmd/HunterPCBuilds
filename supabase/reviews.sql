-- HunterPCBuilds: Reviews (your eBay feedback) for the home page. Run after the earlier files. Safe to run again.
-- Paste this whole file into Supabase → SQL Editor → New query, and press Run.

-- ─── Reviews ─────────────────────────────────────────────────────────────────
-- One row per review. Add them in the admin portal's Reviews tab (you can paste your eBay feedback page there).
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  source       text not null default 'ebay' check (source in ('ebay', 'in person', 'facebook', 'other')),
  rating       text not null default 'positive' check (rating in ('positive', 'neutral', 'negative')),
  comment      text not null check (char_length(comment) between 1 and 1000),
  buyer        text check (char_length(buyer) <= 40),          -- as eBay shows it, e.g. "n***f"
  item         text check (char_length(item) <= 200),          -- what they bought
  item_number  text check (char_length(item_number) <= 20),    -- eBay item number, used to skip repeats when you paste again
  price        numeric(10, 2),
  reviewed_on  date not null default current_date,
  published    boolean not null default true,                 -- false = hidden from the site
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.reviews enable row level security;
grant select on public.reviews to anon;

drop policy if exists "anyone can see published reviews" on public.reviews;
create policy "anyone can see published reviews" on public.reviews for select using (published or public.is_admin());
drop policy if exists "admins can add reviews" on public.reviews;
create policy "admins can add reviews" on public.reviews for insert with check (public.is_admin());
drop policy if exists "admins can edit reviews" on public.reviews;
create policy "admins can edit reviews" on public.reviews for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can delete reviews" on public.reviews;
create policy "admins can delete reviews" on public.reviews for delete using (public.is_admin());

drop trigger if exists touch_updated_at on public.reviews;
create trigger touch_updated_at before update on public.reviews for each row execute function public.touch_updated_at();

-- ─── eBay summary ────────────────────────────────────────────────────────────
-- One row: your eBay username (for the "See all on eBay" link), positive %, and feedback count.
create table if not exists public.review_stats (
  id              integer primary key default 1 check (id = 1),
  ebay_username   text check (char_length(ebay_username) <= 64),
  positive_pct    numeric(5, 2) check (positive_pct between 0 and 100),
  feedback_count  integer check (feedback_count >= 0),
  updated_at      timestamptz not null default now()
);
insert into public.review_stats (id) values (1) on conflict (id) do nothing;
alter table public.review_stats enable row level security;
grant select on public.review_stats to anon;

drop policy if exists "anyone can see review stats" on public.review_stats;
create policy "anyone can see review stats" on public.review_stats for select using (true);
drop policy if exists "admins can edit review stats" on public.review_stats;
create policy "admins can edit review stats" on public.review_stats for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can add review stats" on public.review_stats;
create policy "admins can add review stats" on public.review_stats for insert with check (public.is_admin());

drop trigger if exists touch_updated_at on public.review_stats;
create trigger touch_updated_at before update on public.review_stats for each row execute function public.touch_updated_at();
