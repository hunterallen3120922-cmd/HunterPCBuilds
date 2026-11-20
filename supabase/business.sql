-- HunterPCBuilds admin portal: business tracking (jobs, expenses, 3D printing, inventory).
-- Paste this whole file into Supabase → SQL Editor → New query, and press Run. Safe to run again.
-- Run schema.sql first (it creates the admins table and is_admin()).
--
-- Everything here is private: only your admin login can read or change it. Nothing shows on the public site.
--
-- What it creates:
--   jobs       every PC build, upgrade, repair, rental or resale: who it was for, money in, money out
--   expenses   business costs that aren't part of one job (tools, shipping supplies, fees, software…)
--   printers   your 3D printers and what you paid for them (for payoff tracking)
--   prints     every 3D print you sold
--   inventory  parts you have on hand

-- Keeps updated_at current on every change (used later to sync with the master Google Sheet).
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Jobs ────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 200),
  customer    text check (char_length(customer) <= 200),
  kind        text not null default 'build' check (kind in ('build', 'upgrade', 'repair', 'rental', 'resale', 'personal', 'other')),
  status      text not null default 'done' check (status in ('quote', 'in progress', 'done', 'cancelled')),
  channel     text check (char_length(channel) <= 60),          -- in person, eBay, Marketplace…
  date        date,                                              -- when it was sold / finished
  revenue     numeric(10, 2) not null default 0,                 -- what you were paid
  cost        numeric(10, 2) not null default 0,                 -- what you spent on it
  profit      numeric(10, 2) generated always as (revenue - cost) stored,
  notes       text check (char_length(notes) <= 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Expenses ────────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default current_date,
  category    text not null default 'other' check (char_length(category) <= 60),
  description text not null check (char_length(description) between 1 and 300),
  amount      numeric(10, 2) not null check (amount >= 0),
  notes       text check (char_length(notes) <= 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── 3D printing ─────────────────────────────────────────────────────────────
create table if not exists public.printers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 120),
  purchase_price numeric(10, 2) not null default 0,
  purchased_on   date,
  notes          text check (char_length(notes) <= 5000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.prints (
  id            uuid primary key default gen_random_uuid(),
  date          date not null default current_date,
  customer      text check (char_length(customer) <= 200),
  item          text not null check (char_length(item) between 1 and 300),
  printer_id    uuid references public.printers on delete set null,
  material      text check (char_length(material) <= 40),     -- PLA, PETG…
  grams         numeric(10, 2),
  price         numeric(10, 2) not null default 0,            -- what you charged
  filament_cost numeric(10, 2) not null default 0,
  profit        numeric(10, 2) generated always as (price - filament_cost) stored,
  notes         text check (char_length(notes) <= 5000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Inventory ───────────────────────────────────────────────────────────────
create table if not exists public.inventory (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'Other' check (char_length(category) <= 60),
  name        text not null check (char_length(name) between 1 and 200),
  cost        numeric(10, 2) not null default 0,               -- what you paid for one
  qty         integer not null default 1 check (qty >= 0),
  status      text not null default 'on hand' check (status in ('on hand', 'used', 'sold')),
  notes       text check (char_length(notes) <= 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Rules: only your admin login can see or change any of it ────────────────
do $$
declare t text;
begin
  foreach t in array array['jobs', 'expenses', 'printers', 'prints', 'inventory'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admins only" on public.%I', t);
    execute format('create policy "admins only" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ─── Added in phase 2: parts lists and build details ─────────────────────────
-- Safe to run again (and safe on a database that already ran the part above).

alter table public.jobs add column if not exists started_on   date;                                   -- when the job / build sheet began
alter table public.jobs add column if not exists sheet_url    text check (char_length(sheet_url) <= 500); -- the old Google Sheet it came from
alter table public.jobs add column if not exists batch        text check (char_length(batch) <= 120);  -- e.g. "eBay mini PCs, batch 2"
alter table public.jobs add column if not exists needs_review boolean not null default false;          -- something to double-check

-- Every part in a job, with a category so you can see what you spend on each kind of part.
create table if not exists public.job_parts (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs on delete cascade,
  category    text not null default 'Other' check (char_length(category) between 1 and 40),
  name        text not null check (char_length(name) between 1 and 200),
  price       numeric(10, 2) not null default 0,          -- price for one, before tax
  qty         integer not null default 1 check (qty >= 0),
  source      text check (char_length(source) <= 80),     -- eBay, Amazon, on hand, customer's…
  status      text not null default 'bought' check (status in ('needed', 'ordered', 'bought', 'have', 'customer''s')),
  sort        integer not null default 0,
  notes       text check (char_length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists job_parts_job_id on public.job_parts (job_id);
create index if not exists job_parts_category on public.job_parts (category);

alter table public.job_parts enable row level security;
drop policy if exists "admins only" on public.job_parts;
create policy "admins only" on public.job_parts for all using (public.is_admin()) with check (public.is_admin());
drop trigger if exists touch_updated_at on public.job_parts;
create trigger touch_updated_at before update on public.job_parts for each row execute function public.touch_updated_at();
