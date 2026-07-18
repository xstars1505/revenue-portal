insert into public.revenue_invited_users (email, role, active)
values ('baminh.letran@gmail.com', 'admin', true)
on conflict (email) do update set role = excluded.role, active = true;

insert into public.revenue_profiles (user_id, email, display_name, role, active)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', email), 'admin', true
from auth.users
where lower(email) = 'baminh.letran@gmail.com'
on conflict (user_id) do update set role = excluded.role, active = true;
