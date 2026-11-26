create table public.screenshot_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.screenshots
  add column folder_id uuid references public.screenshot_folders(id) on delete set null,
  add column user_notes text;

create index screenshots_user_folder_captured_at_idx
  on public.screenshots (user_id, folder_id, captured_at desc);

alter table public.screenshot_folders enable row level security;
revoke all on table public.screenshot_folders from anon, authenticated;
grant select, insert, update, delete on table public.screenshot_folders to authenticated;

create policy "Users can view their own screenshot folders" on public.screenshot_folders for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own screenshot folders" on public.screenshot_folders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own screenshot folders" on public.screenshot_folders for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own screenshot folders" on public.screenshot_folders for delete to authenticated using ((select auth.uid()) = user_id);
