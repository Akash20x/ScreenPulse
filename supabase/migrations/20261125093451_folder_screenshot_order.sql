alter table public.screenshots add column folder_sort_order numeric;

with ordered as (
  select id, row_number() over (partition by user_id, folder_id order by captured_at desc, id desc) as position
  from public.screenshots where folder_id is not null
)
update public.screenshots s set folder_sort_order = ordered.position from ordered where s.id = ordered.id;

create index screenshots_folder_sort_idx on public.screenshots (user_id, folder_id, folder_sort_order, id);

create function public.assign_screenshot_folder_order() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.folder_id is not null and (tg_op = 'INSERT' or new.folder_id is distinct from old.folder_id) then
    perform pg_advisory_xact_lock(hashtextextended(new.folder_id::text, 0));
    select coalesce(min(folder_sort_order), 1) - 1 into new.folder_sort_order from public.screenshots where folder_id = new.folder_id and user_id = new.user_id;
  elsif new.folder_id is null then
    new.folder_sort_order := null;
  end if;
  return new;
end $$;

create trigger screenshot_folder_order before insert or update of folder_id on public.screenshots
for each row execute function public.assign_screenshot_folder_order();

create function public.place_folder_screenshot(p_user_id uuid, p_folder_id uuid, p_screenshot_id uuid, p_reference_id uuid, p_direction text)
returns integer language plpgsql set search_path = '' as $$
declare reference_order numeric; adjacent_order numeric; new_order numeric; item_index integer;
begin
  if p_direction not in ('before', 'after') then raise exception 'Invalid position'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_folder_id::text, 0));
  select folder_sort_order into reference_order from public.screenshots where id = p_reference_id and user_id = p_user_id and folder_id = p_folder_id and storage_status = 'stored' for update;
  if reference_order is null then raise exception 'Reference screenshot is no longer available'; end if;
  if not exists (select 1 from public.screenshots where id = p_screenshot_id and user_id = p_user_id and folder_id = p_folder_id and storage_status = 'uploading') then raise exception 'Screenshot is no longer available'; end if;
  if p_direction = 'before' then
    select max(folder_sort_order) into adjacent_order from public.screenshots where user_id = p_user_id and folder_id = p_folder_id and storage_status = 'stored' and folder_sort_order < reference_order;
    new_order := case when adjacent_order is null then reference_order - 1 else (reference_order + adjacent_order) / 2 end;
  else
    select min(folder_sort_order) into adjacent_order from public.screenshots where user_id = p_user_id and folder_id = p_folder_id and storage_status = 'stored' and folder_sort_order > reference_order;
    new_order := case when adjacent_order is null then reference_order + 1 else (reference_order + adjacent_order) / 2 end;
  end if;
  update public.screenshots set folder_sort_order = new_order, storage_status = 'stored' where id = p_screenshot_id and user_id = p_user_id and folder_id = p_folder_id;
  select count(*) into item_index from public.screenshots where user_id = p_user_id and folder_id = p_folder_id and storage_status = 'stored' and folder_sort_order < new_order;
  return item_index;
end $$;
revoke all on function public.place_folder_screenshot(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.place_folder_screenshot(uuid, uuid, uuid, uuid, text) to service_role;
