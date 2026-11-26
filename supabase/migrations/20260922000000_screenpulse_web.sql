create extension if not exists pgcrypto;

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete restrict,
  capture_id text not null check (char_length(capture_id) between 1 and 200),
  page_url text not null,
  page_title text,
  mime_type text not null check (mime_type = 'image/jpeg'),
  captured_at timestamptz not null,
  storage_path text not null unique,
  storage_status text not null default 'uploading' check (storage_status in ('uploading', 'stored', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id, capture_id)
);

create index screenshots_user_captured_at_idx on public.screenshots (user_id, captured_at desc);
create index screenshots_device_capture_idx on public.screenshots (device_id, capture_id);

alter table public.devices enable row level security;
alter table public.screenshots enable row level security;

create policy "Users can view their own devices" on public.devices for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own devices" on public.devices for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can revoke their own devices" on public.devices for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own devices" on public.devices for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can view their own screenshots" on public.screenshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can delete their own screenshots" on public.screenshots for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

create policy "Users can read their screenshot objects" on storage.objects for select to authenticated using (
  bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy "Users can delete their screenshot objects" on storage.objects for delete to authenticated using (
  bucket_id = 'screenshots' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
