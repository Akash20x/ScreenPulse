create table public.screenshot_public_shares (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  screenshot_id uuid not null references public.screenshots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  notes_snapshot text,
  analysis_snapshot text,
  created_at timestamptz not null default now()
);
create index screenshot_public_shares_owner_idx on public.screenshot_public_shares(user_id, screenshot_id, expires_at);
alter table public.screenshot_public_shares enable row level security;
revoke all on public.screenshot_public_shares from anon, authenticated;

create function public.replace_screenshot_share(p_user_id uuid, p_screenshot_id uuid, p_token_hash text, p_expires_at timestamptz, p_include_notes boolean, p_include_analysis boolean)
returns uuid language plpgsql set search_path = '' as $$
declare shot public.screenshots%rowtype; share_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('screenshot-share:' || p_screenshot_id::text, 0));
  select * into shot from public.screenshots where id = p_screenshot_id and user_id = p_user_id and storage_status = 'stored' for update;
  if not found then raise exception 'Screenshot not found'; end if;
  update public.screenshot_public_shares set revoked_at = now() where user_id = p_user_id and screenshot_id = p_screenshot_id and revoked_at is null;
  insert into public.screenshot_public_shares(user_id, screenshot_id, token_hash, expires_at, notes_snapshot, analysis_snapshot)
  values (p_user_id, p_screenshot_id, p_token_hash, p_expires_at, case when p_include_notes then shot.user_notes end, case when p_include_analysis then shot.analysis_description end)
  returning id into share_id;
  return share_id;
end $$;
revoke all on function public.replace_screenshot_share(uuid, uuid, text, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function public.replace_screenshot_share(uuid, uuid, text, timestamptz, boolean, boolean) to service_role;
