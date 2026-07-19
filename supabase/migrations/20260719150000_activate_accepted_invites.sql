create or replace function public.revenue_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare invite public.revenue_invited_users%rowtype;
begin
  select * into invite from public.revenue_invited_users where email = new.email::extensions.citext and active;
  if found and new.email_confirmed_at is not null then
    insert into public.revenue_profiles (user_id, email, display_name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), invite.role)
    on conflict (user_id) do update set display_name = excluded.display_name, role = excluded.role, active = true;
  end if;
  return new;
end;
$$;

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
  set role = invite_role
  where email = any(invite_emails::extensions.citext[]);
end;
$$;

update public.revenue_profiles profile
set active = false
from auth.users auth_user
where profile.user_id = auth_user.id
  and auth_user.invited_at is not null
  and auth_user.email_confirmed_at is null;
