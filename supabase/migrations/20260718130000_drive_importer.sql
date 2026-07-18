create table public.revenue_drive_credentials (
  id boolean primary key default true check (id),
  google_email extensions.citext not null,
  refresh_token_encrypted text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.revenue_drive_credentials enable row level security;

create or replace function public.revenue_import_workbook(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_id uuid;
  target_report_id uuid;
  product_id uuid;
  item jsonb;
  actual jsonb := payload -> 'actual';
  plan jsonb := payload -> 'plan';
begin
  insert into public.revenue_source_files (drive_file_id, file_name, checksum, modified_at, imported_at, status, error_message)
  values (payload ->> 'driveFileId', payload ->> 'fileName', payload ->> 'checksum', (payload ->> 'modifiedAt')::timestamptz, now(), 'processing', null)
  on conflict (drive_file_id) do update set file_name = excluded.file_name, checksum = excluded.checksum, modified_at = excluded.modified_at, status = 'processing', error_message = null
  returning id into source_id;

  insert into public.revenue_monthly_reports (source_file_id, report_month, branch, scenario, revenue, revenue_per_day, tables_count, revenue_per_table, gross_profit, gross_margin, operating_costs, ebitda, ebitda_margin, tax, net_profit, net_margin, updated_at)
  values (source_id, (payload ->> 'reportMonth')::date, 'Central branch', 'actual', (actual ->> 'revenue')::numeric, (actual ->> 'revenuePerDay')::numeric, (actual ->> 'tables')::integer, (actual ->> 'revenuePerTable')::numeric, (actual ->> 'grossProfit')::numeric, (actual ->> 'grossMargin')::numeric, (actual ->> 'operatingCosts')::numeric, (actual ->> 'ebitda')::numeric, (actual ->> 'ebitdaMargin')::numeric, (actual ->> 'tax')::numeric, (actual ->> 'netProfit')::numeric, (actual ->> 'netMargin')::numeric, now())
  on conflict (report_month, branch, scenario) do update set source_file_id = excluded.source_file_id, revenue = excluded.revenue, revenue_per_day = excluded.revenue_per_day, tables_count = excluded.tables_count, revenue_per_table = excluded.revenue_per_table, gross_profit = excluded.gross_profit, gross_margin = excluded.gross_margin, operating_costs = excluded.operating_costs, ebitda = excluded.ebitda, ebitda_margin = excluded.ebitda_margin, tax = excluded.tax, net_profit = excluded.net_profit, net_margin = excluded.net_margin, updated_at = now()
  returning id into target_report_id;

  if plan is not null and jsonb_typeof(plan) = 'object' then
    insert into public.revenue_monthly_reports (source_file_id, report_month, branch, scenario, revenue, revenue_per_day, tables_count, revenue_per_table, gross_profit, gross_margin, operating_costs, ebitda, ebitda_margin, tax, net_profit, net_margin, updated_at)
    values (source_id, (payload ->> 'reportMonth')::date, 'Central branch', 'plan', (plan ->> 'revenue')::numeric, (plan ->> 'revenuePerDay')::numeric, (plan ->> 'tables')::integer, (plan ->> 'revenuePerTable')::numeric, (plan ->> 'grossProfit')::numeric, (plan ->> 'grossMargin')::numeric, (plan ->> 'operatingCosts')::numeric, (plan ->> 'ebitda')::numeric, (plan ->> 'ebitdaMargin')::numeric, (plan ->> 'tax')::numeric, (plan ->> 'netProfit')::numeric, (plan ->> 'netMargin')::numeric, now())
    on conflict (report_month, branch, scenario) do update set source_file_id = excluded.source_file_id, revenue = excluded.revenue, revenue_per_day = excluded.revenue_per_day, tables_count = excluded.tables_count, revenue_per_table = excluded.revenue_per_table, gross_profit = excluded.gross_profit, gross_margin = excluded.gross_margin, operating_costs = excluded.operating_costs, ebitda = excluded.ebitda, ebitda_margin = excluded.ebitda_margin, tax = excluded.tax, net_profit = excluded.net_profit, net_margin = excluded.net_margin, updated_at = now();
  end if;

  delete from public.revenue_product_monthly where report_id = target_report_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'products', '[]'::jsonb)) loop
    insert into public.revenue_products (external_code, name)
    values (item ->> 'code', item ->> 'name')
    on conflict (external_code) do update set name = excluded.name
    returning id into product_id;
    insert into public.revenue_product_monthly (report_id, product_id, units_sold, gross_revenue, returned_units, return_value, net_revenue)
    values (target_report_id, product_id, (item ->> 'unitsSold')::numeric, (item ->> 'grossRevenue')::numeric, (item ->> 'returnedUnits')::numeric, (item ->> 'returnValue')::numeric, (item ->> 'netRevenue')::numeric);
  end loop;

  update public.revenue_source_files set status = 'imported', imported_at = now() where id = source_id;
  insert into public.revenue_import_runs (source_file_id, finished_at, status, rows_imported, checks)
  values (source_id, now(), 'completed', jsonb_array_length(coalesce(payload -> 'products', '[]'::jsonb)) + 1, jsonb_build_object('checksum', payload ->> 'checksum', 'reportMonth', payload ->> 'reportMonth'));
  return target_report_id;
end;
$$;

revoke all on function public.revenue_import_workbook(jsonb) from public;
grant execute on function public.revenue_import_workbook(jsonb) to service_role;

create or replace function public.revenue_dashboard_report(primary_month date, comparison_month date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare current_row record;
declare previous_row record;
declare plan_row record;
begin
  select r.*, f.file_name into current_row from public.revenue_monthly_reports r left join public.revenue_source_files f on f.id = r.source_file_id where r.report_month = primary_month and r.scenario = 'actual' order by r.branch limit 1;
  if current_row.id is null then return null; end if;
  select * into previous_row from public.revenue_monthly_reports where report_month = comparison_month and scenario = 'actual' order by branch limit 1;
  if previous_row.id is null then previous_row := current_row; end if;
  select * into plan_row from public.revenue_monthly_reports where report_month = primary_month and scenario = 'plan' order by branch limit 1;

  return jsonb_build_object(
    'period', to_char(primary_month, 'FMMonth YYYY'), 'source', current_row.file_name,
    'actual', jsonb_build_object('revenue', current_row.revenue, 'revenuePerDay', current_row.revenue_per_day, 'tables', current_row.tables_count, 'revenuePerTable', current_row.revenue_per_table, 'grossProfit', current_row.gross_profit, 'grossMargin', current_row.gross_margin, 'opex', current_row.operating_costs, 'ebitda', current_row.ebitda, 'ebitdaMargin', current_row.ebitda_margin, 'tax', current_row.tax, 'netProfit', current_row.net_profit, 'netMargin', current_row.net_margin),
    'previous', jsonb_build_object('revenue', previous_row.revenue, 'tables', previous_row.tables_count, 'revenuePerTable', previous_row.revenue_per_table, 'grossProfit', previous_row.gross_profit, 'grossMargin', previous_row.gross_margin, 'opex', previous_row.operating_costs, 'ebitda', previous_row.ebitda, 'ebitdaMargin', previous_row.ebitda_margin, 'netProfit', previous_row.net_profit, 'netMargin', previous_row.net_margin),
    'plan', case when plan_row.id is null then null else jsonb_build_object('revenue', plan_row.revenue, 'tables', plan_row.tables_count, 'revenuePerTable', plan_row.revenue_per_table, 'grossProfit', plan_row.gross_profit, 'grossMargin', plan_row.gross_margin, 'opex', plan_row.operating_costs, 'ebitda', plan_row.ebitda, 'ebitdaMargin', plan_row.ebitda_margin, 'netProfit', plan_row.net_profit, 'netMargin', plan_row.net_margin) end,
    'revenueMix', (select coalesce(jsonb_agg(jsonb_build_object('name', category, 'revenue', revenue, 'share', share, 'cogs', cogs_rate) order by revenue desc), '[]'::jsonb) from public.revenue_report_categories where report_id = current_row.id),
    'costDrivers', (select coalesce(jsonb_agg(item order by change_amount desc), '[]'::jsonb) from (select jsonb_build_object('name', c.category_name, 'current', c.amount, 'previous', p.amount) item, c.amount - p.amount change_amount from public.revenue_expense_lines c join public.revenue_expense_lines p on p.category_code = c.category_code and p.report_id = previous_row.id where c.report_id = current_row.id order by change_amount desc limit 5) drivers),
    'topProducts', (select coalesce(jsonb_agg(item order by (item ->> 'revenue')::numeric desc), '[]'::jsonb) from (select jsonb_build_object('code', p.external_code, 'name', p.name, 'units', pm.units_sold, 'revenue', pm.net_revenue) item from public.revenue_product_monthly pm join public.revenue_products p on p.id = pm.product_id where pm.report_id = current_row.id order by pm.net_revenue desc limit 5) ranked),
    'review', jsonb_build_object('summary', coalesce((select content from public.revenue_report_notes where report_id = current_row.id and section = 'KQKD' and note_type = 'actual' order by sort_order limit 1), ''), 'actions', (select coalesce(jsonb_agg(content order by sort_order), '[]'::jsonb) from public.revenue_report_notes where report_id = current_row.id and note_type = 'action'))
  );
end;
$$;

grant execute on function public.revenue_dashboard_report(date, date) to authenticated;
