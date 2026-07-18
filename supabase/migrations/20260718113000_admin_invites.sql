create or replace function public.revenue_upsert_invites(invite_emails text[], invite_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if invite_role not in ('admin', 'finance', 'viewer') then raise exception 'Invalid role'; end if;
  if coalesce(array_length(invite_emails, 1), 0) = 0 or array_length(invite_emails, 1) > 50 then raise exception 'Invite between 1 and 50 users'; end if;

  insert into public.revenue_invited_users (email, role, active)
  select lower(email)::extensions.citext, invite_role, true from unnest(invite_emails) email
  on conflict (email) do update set role = excluded.role, active = true;

  update public.revenue_profiles
  set role = invite_role, active = true
  where email = any(invite_emails::extensions.citext[]);
end;
$$;

revoke all on function public.revenue_upsert_invites(text[], text) from public;
grant execute on function public.revenue_upsert_invites(text[], text) to service_role;
