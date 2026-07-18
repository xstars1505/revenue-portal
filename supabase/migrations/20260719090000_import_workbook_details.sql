create or replace function public.revenue_import_workbook_details(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_report_id uuid;
  item jsonb;
  item_index integer := 0;
begin
  select id into target_report_id
  from public.revenue_monthly_reports
  where report_month = (payload ->> 'reportMonth')::date
    and branch = 'Central branch'
    and scenario = 'actual';

  if target_report_id is null then
    raise exception 'Imported report was not found';
  end if;

  delete from public.revenue_report_categories where report_id = target_report_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'categories', '[]'::jsonb)) loop
    insert into public.revenue_report_categories (report_id, category, revenue, share, cogs, cogs_rate)
    values (target_report_id, item ->> 'category', (item ->> 'revenue')::numeric, (item ->> 'share')::numeric, (item ->> 'cogs')::numeric, (item ->> 'cogsRate')::numeric);
  end loop;

  delete from public.revenue_expense_lines where report_id = target_report_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'expenses', '[]'::jsonb)) loop
    insert into public.revenue_expense_lines (report_id, category_code, category_name, amount)
    values (target_report_id, item ->> 'code', item ->> 'name', (item ->> 'amount')::numeric);
  end loop;

  delete from public.revenue_report_notes where report_id = target_report_id;
  if coalesce(payload #>> '{review,summary}', '') <> '' then
    insert into public.revenue_report_notes (report_id, section, note_type, content, sort_order)
    values (target_report_id, 'KQKD', 'actual', payload #>> '{review,summary}', 0);
  end if;
  for item in select value from jsonb_array_elements(coalesce(payload #> '{review,actions}', '[]'::jsonb)) loop
    insert into public.revenue_report_notes (report_id, section, note_type, content, sort_order)
    values (target_report_id, 'KQKD', 'action', item #>> '{}', item_index);
    item_index := item_index + 1;
  end loop;
end;
$$;

revoke all on function public.revenue_import_workbook_details(jsonb) from public;
grant execute on function public.revenue_import_workbook_details(jsonb) to service_role;
