create or replace function public.revenue_remove_user(target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target_role text;
begin
  select role into target_role
  from public.revenue_invited_users
  where email = lower(target_email)::extensions.citext
  for update;

  if not found then raise exception 'User not found'; end if;
  if target_role = 'admin' then raise exception 'Administrators cannot be removed'; end if;

  delete from public.revenue_invited_users
  where email = lower(target_email)::extensions.citext;

  delete from auth.users
  where lower(email) = lower(target_email);
end;
$$;

revoke all on function public.revenue_remove_user(text) from public;
grant execute on function public.revenue_remove_user(text) to service_role;
