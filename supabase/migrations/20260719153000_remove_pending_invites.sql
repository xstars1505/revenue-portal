create or replace function public.revenue_remove_pending_invite(invite_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare auth_user_id uuid;
begin
  select id into auth_user_id
  from auth.users
  where lower(email) = lower(invite_email)
    and email_confirmed_at is null
  for update;

  if exists (
    select 1 from auth.users
    where lower(email) = lower(invite_email)
      and email_confirmed_at is not null
  ) or exists (
    select 1 from public.revenue_profiles
    where email = lower(invite_email)::extensions.citext
      and active
  ) then
    raise exception 'Accepted invitations cannot be removed';
  end if;

  delete from public.revenue_invited_users
  where email = lower(invite_email)::extensions.citext;
  if not found then raise exception 'Pending invitation not found'; end if;

  if auth_user_id is not null then delete from auth.users where id = auth_user_id; end if;
end;
$$;

revoke all on function public.revenue_remove_pending_invite(text) from public;
grant execute on function public.revenue_remove_pending_invite(text) to service_role;
