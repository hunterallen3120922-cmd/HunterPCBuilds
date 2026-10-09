-- HunterPCBuilds admin portal: database setup.
-- Paste this whole file into Supabase → SQL Editor → New query, and press Run. Safe to run again.
--
-- What it creates:
--   builds    your PC builds (shown on the site: home carousel, Past builds, PC Builds photo slideshow)
--   requests  every build/repair request sent from the site's forms (only you can read them)
--   admins    who can use the admin portal (the first login you create becomes the admin automatically)
--   build-photos  a storage bucket for build photos (anyone can view, only you can upload)

-- ─── Admins ──────────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- The first user account becomes the admin (later accounts do not).
create or replace function public.claim_first_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admins) then
    insert into public.admins (user_id) values (new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_claim_admin on auth.users;
create trigger on_auth_user_created_claim_admin
  after insert on auth.users for each row execute function public.claim_first_admin();

-- If you already created your login before running this file, make it the admin now.
insert into public.admins (user_id)
select id from auth.users
where not exists (select 1 from public.admins)
order by created_at limit 1;

drop policy if exists "admins can see admins" on public.admins;
create policy "admins can see admins" on public.admins for select using (public.is_admin());

-- ─── Builds ──────────────────────────────────────────────────────────────────
create table if not exists public.builds (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 120),
  specs        text[] not null default '{}',
  price        text check (char_length(price) <= 40),
  photos       text[] not null default '{}',      -- storage paths in build-photos; the first is the cover
  featured     boolean not null default false,    -- show in the home page carousel
  in_gallery   boolean not null default true,     -- show in Past builds on the PC Builds page
  in_slideshow boolean not null default true,     -- show in the photo slideshow at the top of the PC Builds page
  published    boolean not null default true,     -- false = hidden from the site (draft)
  sort_order   integer not null default 0,        -- lower comes first
  created_at   timestamptz not null default now()
);
alter table public.builds enable row level security;

drop policy if exists "anyone can see published builds" on public.builds;
create policy "anyone can see published builds" on public.builds
  for select using (published or public.is_admin());
drop policy if exists "admins can add builds" on public.builds;
create policy "admins can add builds" on public.builds for insert with check (public.is_admin());
drop policy if exists "admins can edit builds" on public.builds;
create policy "admins can edit builds" on public.builds for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can delete builds" on public.builds;
create policy "admins can delete builds" on public.builds for delete using (public.is_admin());

-- ─── Requests ────────────────────────────────────────────────────────────────
create table if not exists public.requests (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type       text not null check (type in ('build', 'repair')),
  name       text check (char_length(name) <= 200),
  email      text check (char_length(email) <= 320),
  phone      text check (char_length(phone) <= 60),
  fields     jsonb not null default '{}' check (pg_column_size(fields) < 30000),  -- every answer, labeled
  status     text not null default 'new' check (status in ('new', 'quoted', 'scheduled', 'done', 'archived')),
  notes      text check (char_length(notes) <= 5000)                              -- your private notes
);
alter table public.requests enable row level security;

-- The site's forms can add requests (as "new", with no notes) but nobody except you can read them.
drop policy if exists "the site can send requests" on public.requests;
create policy "the site can send requests" on public.requests
  for insert to anon, authenticated with check (status = 'new' and notes is null);
drop policy if exists "admins can read requests" on public.requests;
create policy "admins can read requests" on public.requests for select using (public.is_admin());
drop policy if exists "admins can update requests" on public.requests;
create policy "admins can update requests" on public.requests for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins can delete requests" on public.requests;
create policy "admins can delete requests" on public.requests for delete using (public.is_admin());

-- ─── Photo storage ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('build-photos', 'build-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "admins can upload build photos" on storage.objects;
create policy "admins can upload build photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'build-photos' and public.is_admin());
drop policy if exists "admins can change build photos" on storage.objects;
create policy "admins can change build photos" on storage.objects
  for update to authenticated using (bucket_id = 'build-photos' and public.is_admin());
drop policy if exists "admins can delete build photos" on storage.objects;
create policy "admins can delete build photos" on storage.objects
  for delete to authenticated using (bucket_id = 'build-photos' and public.is_admin());
drop policy if exists "admins can list build photos" on storage.objects;
create policy "admins can list build photos" on storage.objects
  for select to authenticated using (bucket_id = 'build-photos' and public.is_admin());
