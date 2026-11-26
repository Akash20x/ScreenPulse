alter table public.screenshot_folders add column is_default boolean not null default false;
create unique index screenshot_folders_one_default on public.screenshot_folders(user_id) where is_default;

create function public.ensure_default_screenshot_folder(p_user_id uuid) returns uuid
language plpgsql set search_path = '' as $$
declare result uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('default-folder:' || p_user_id::text, 0));
  select id into result from public.screenshot_folders where user_id = p_user_id and is_default;
  if result is null then
    insert into public.screenshot_folders(user_id, name, is_default)
    values (p_user_id, '__default__' || gen_random_uuid()::text, true) returning id into result;
  end if;
  return result;
end $$;
revoke all on function public.ensure_default_screenshot_folder(uuid) from public, anon, authenticated;
grant execute on function public.ensure_default_screenshot_folder(uuid) to service_role;

do $$ declare owner_id uuid; default_id uuid; begin
  for owner_id in select distinct user_id from public.screenshots where folder_id is null loop
    default_id := public.ensure_default_screenshot_folder(owner_id);
    update public.screenshots set folder_id = default_id where user_id = owner_id and folder_id is null;
  end loop;
end $$;

create function public.ensure_screenshot_folder() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.folder_id is null then
    new.folder_id := public.ensure_default_screenshot_folder(new.user_id);
  elsif not exists (select 1 from public.screenshot_folders where id = new.folder_id and user_id = new.user_id) then
    raise exception 'Invalid screenshot folder';
  end if;
  return new;
end $$;
revoke all on function public.ensure_screenshot_folder() from public, anon, authenticated;
create trigger a_screenshot_default_folder before insert or update of folder_id, user_id on public.screenshots
for each row execute function public.ensure_screenshot_folder();

create function public.protect_default_screenshot_folder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.is_default and exists (select 1 from public.screenshots where folder_id = old.id) then
    raise exception 'The default folder cannot be deleted while it contains screenshots';
  end if;
  return old;
end $$;
create trigger protect_default_screenshot_folder before delete on public.screenshot_folders
for each row execute function public.protect_default_screenshot_folder();

create function public.create_named_screenshot_folder(p_user_id uuid, p_name text) returns uuid
language plpgsql set search_path = '' as $$
declare result uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('default-folder:' || p_user_id::text, 0));
  if not exists (select 1 from public.screenshot_folders where user_id = p_user_id and not is_default) then
    update public.screenshot_folders set name = p_name, is_default = false, updated_at = now()
    where user_id = p_user_id and is_default returning id into result;
  end if;
  if result is null then
    insert into public.screenshot_folders(user_id, name) values (p_user_id, p_name) returning id into result;
  end if;
  return result;
end $$;
revoke all on function public.create_named_screenshot_folder(uuid, text) from public, anon, authenticated;
grant execute on function public.create_named_screenshot_folder(uuid, text) to service_role;
