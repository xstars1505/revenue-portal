revoke execute on function public.revenue_handle_new_user() from public, anon, authenticated;
revoke execute on function public.revenue_import_workbook(jsonb) from public, anon, authenticated;
revoke execute on function public.revenue_import_workbook_details(jsonb) from public, anon, authenticated;
revoke execute on function public.revenue_is_invited() from public, anon;
revoke execute on function public.revenue_remove_pending_invite(text) from public, anon, authenticated;
revoke execute on function public.revenue_remove_user(text) from public, anon, authenticated;
revoke execute on function public.revenue_upsert_invites(text[], text) from public, anon, authenticated;

grant execute on function public.revenue_is_invited() to authenticated;
grant execute on function public.revenue_import_workbook(jsonb) to service_role;
grant execute on function public.revenue_import_workbook_details(jsonb) to service_role;
grant execute on function public.revenue_remove_pending_invite(text) to service_role;
grant execute on function public.revenue_remove_user(text) to service_role;
grant execute on function public.revenue_upsert_invites(text[], text) to service_role;
