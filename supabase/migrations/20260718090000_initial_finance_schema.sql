create extension if not exists citext with schema extensions;

create table public.revenue_invited_users (
  email extensions.citext primary key,
  role text not null default 'viewer' check (role in ('admin', 'finance', 'viewer')),
  active boolean not null default true,
  invited_at timestamptz not null default now()
);

create table public.revenue_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'finance', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.revenue_source_files (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text unique,
  file_name text not null,
  checksum text,
  modified_at timestamptz,
  imported_at timestamptz,
  parser_version text not null default '1',
  status text not null default 'pending' check (status in ('pending', 'processing', 'imported', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create table public.revenue_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  source_file_id uuid references public.revenue_source_files(id) on delete set null,
  report_month date not null,
  branch text not null default 'Central branch',
  scenario text not null default 'actual' check (scenario in ('actual', 'plan')),
  revenue numeric(18,2) not null check (revenue >= 0),
  revenue_per_day numeric(18,2),
  tables_count integer check (tables_count >= 0),
  revenue_per_table numeric(18,2),
  gross_profit numeric(18,2) not null,
  gross_margin numeric(9,6) not null,
  operating_costs numeric(18,2) not null,
  ebitda numeric(18,2) not null,
  ebitda_margin numeric(9,6) not null,
  tax numeric(18,2),
  net_profit numeric(18,2) not null,
  net_margin numeric(9,6) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_month, branch, scenario)
);

create table public.revenue_report_categories (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.revenue_monthly_reports(id) on delete cascade,
  category text not null,
  revenue numeric(18,2) not null,
  share numeric(9,6) not null,
  cogs numeric(18,2) not null,
  cogs_rate numeric(9,6) not null,
  unique (report_id, category)
);

create table public.revenue_expense_lines (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.revenue_monthly_reports(id) on delete cascade,
  category_code text not null,
  category_name text not null,
  amount numeric(18,2) not null,
  unique (report_id, category_code)
);

create table public.revenue_products (
  id uuid primary key default gen_random_uuid(),
  external_code text not null unique,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

create table public.revenue_product_monthly (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.revenue_monthly_reports(id) on delete cascade,
  product_id uuid not null references public.revenue_products(id) on delete cascade,
  units_sold numeric(14,2) not null default 0,
  gross_revenue numeric(18,2) not null default 0,
  returned_units numeric(14,2) not null default 0,
  return_value numeric(18,2) not null default 0,
  net_revenue numeric(18,2) not null default 0,
  unique (report_id, product_id)
);

create table public.revenue_report_notes (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.revenue_monthly_reports(id) on delete cascade,
  section text not null,
  note_type text not null default 'actual' check (note_type in ('actual', 'action')),
  content text not null,
  sort_order integer not null default 0
);

create table public.revenue_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_file_id uuid references public.revenue_source_files(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  rows_imported integer not null default 0,
  checks jsonb not null default '{}'::jsonb,
  error_message text
);

create index revenue_monthly_reports_month_idx on public.revenue_monthly_reports (report_month desc, scenario);
create index revenue_product_monthly_report_idx on public.revenue_product_monthly (report_id, net_revenue desc);
create index revenue_expense_lines_report_idx on public.revenue_expense_lines (report_id);

create or replace function public.revenue_is_invited()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.revenue_invited_users
    where email = (select auth.jwt() ->> 'email')::extensions.citext and active
  );
$$;

revoke all on function public.revenue_is_invited() from public;
grant execute on function public.revenue_is_invited() to authenticated;

create or replace function public.revenue_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare invite public.revenue_invited_users%rowtype;
begin
  select * into invite from public.revenue_invited_users where email = new.email::extensions.citext and active;
  if found then
    insert into public.revenue_profiles (user_id, email, display_name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), invite.role)
    on conflict (user_id) do update set display_name = excluded.display_name, role = excluded.role, active = true;
  end if;
  return new;
end;
$$;

create trigger revenue_on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.revenue_handle_new_user();

alter table public.revenue_invited_users enable row level security;
alter table public.revenue_profiles enable row level security;
alter table public.revenue_source_files enable row level security;
alter table public.revenue_monthly_reports enable row level security;
alter table public.revenue_report_categories enable row level security;
alter table public.revenue_expense_lines enable row level security;
alter table public.revenue_products enable row level security;
alter table public.revenue_product_monthly enable row level security;
alter table public.revenue_report_notes enable row level security;
alter table public.revenue_import_runs enable row level security;

create policy "Revenue users can see their invitation" on public.revenue_invited_users for select to authenticated using (email = (select auth.jwt() ->> 'email')::extensions.citext and active);
create policy "Revenue users can see their profile" on public.revenue_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "Revenue users read source files" on public.revenue_source_files for select to authenticated using ((select public.revenue_is_invited()));
create policy "Revenue users read reports" on public.revenue_monthly_reports for select to authenticated using ((select public.revenue_is_invited()));
create policy "Revenue users read categories" on public.revenue_report_categories for select to authenticated using ((select public.revenue_is_invited()));
create policy "Revenue users read expenses" on public.revenue_expense_lines for select to authenticated using ((select public.revenue_is_invited()));
create policy "Revenue users read products" on public.revenue_products for select to authenticated using ((select public.revenue_is_invited()));
create policy "Revenue users read monthly products" on public.revenue_product_monthly for select to authenticated using ((select public.revenue_is_invited()));
create policy "Revenue users read report notes" on public.revenue_report_notes for select to authenticated using ((select public.revenue_is_invited()));
create policy "Revenue users read import runs" on public.revenue_import_runs for select to authenticated using ((select public.revenue_is_invited()));

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
declare result jsonb;
begin
  select r.*, f.file_name into current_row
  from public.revenue_monthly_reports r left join public.revenue_source_files f on f.id = r.source_file_id
  where r.report_month = primary_month and r.scenario = 'actual' order by r.branch limit 1;
  select * into previous_row from public.revenue_monthly_reports where report_month = comparison_month and scenario = 'actual' order by branch limit 1;
  select * into plan_row from public.revenue_monthly_reports where report_month = primary_month and scenario = 'plan' order by branch limit 1;
  if current_row.id is null or previous_row.id is null or plan_row.id is null then return null; end if;

  result := jsonb_build_object(
    'period', to_char(primary_month, 'FMMonth YYYY'),
    'source', current_row.file_name,
    'actual', jsonb_build_object('revenue', current_row.revenue, 'revenuePerDay', current_row.revenue_per_day, 'tables', current_row.tables_count, 'revenuePerTable', current_row.revenue_per_table, 'grossProfit', current_row.gross_profit, 'grossMargin', current_row.gross_margin, 'opex', current_row.operating_costs, 'ebitda', current_row.ebitda, 'ebitdaMargin', current_row.ebitda_margin, 'tax', current_row.tax, 'netProfit', current_row.net_profit, 'netMargin', current_row.net_margin),
    'previous', jsonb_build_object('revenue', previous_row.revenue, 'tables', previous_row.tables_count, 'revenuePerTable', previous_row.revenue_per_table, 'grossProfit', previous_row.gross_profit, 'grossMargin', previous_row.gross_margin, 'opex', previous_row.operating_costs, 'ebitda', previous_row.ebitda, 'ebitdaMargin', previous_row.ebitda_margin, 'netProfit', previous_row.net_profit, 'netMargin', previous_row.net_margin),
    'plan', jsonb_build_object('revenue', plan_row.revenue, 'tables', plan_row.tables_count, 'revenuePerTable', plan_row.revenue_per_table, 'grossProfit', plan_row.gross_profit, 'grossMargin', plan_row.gross_margin, 'opex', plan_row.operating_costs, 'ebitda', plan_row.ebitda, 'ebitdaMargin', plan_row.ebitda_margin, 'netProfit', plan_row.net_profit, 'netMargin', plan_row.net_margin),
    'revenueMix', (select coalesce(jsonb_agg(jsonb_build_object('name', category, 'revenue', revenue, 'share', share, 'cogs', cogs_rate) order by revenue desc), '[]'::jsonb) from public.revenue_report_categories where report_id = current_row.id),
    'costDrivers', (
      select coalesce(jsonb_agg(item order by change_amount desc), '[]'::jsonb)
      from (
        select jsonb_build_object('name', c.category_name, 'current', c.amount, 'previous', p.amount) item,
          c.amount - p.amount change_amount
        from public.revenue_expense_lines c
        join public.revenue_expense_lines p on p.category_code = c.category_code and p.report_id = previous_row.id
        where c.report_id = current_row.id
        order by change_amount desc
        limit 5
      ) drivers
    ),
    'topProducts', (select coalesce(jsonb_agg(item order by (item ->> 'revenue')::numeric desc), '[]'::jsonb) from (select jsonb_build_object('code', p.external_code, 'name', p.name, 'units', pm.units_sold, 'revenue', pm.net_revenue) item from public.revenue_product_monthly pm join public.revenue_products p on p.id = pm.product_id where pm.report_id = current_row.id order by pm.net_revenue desc limit 5) ranked),
    'review', jsonb_build_object(
      'summary', coalesce((select content from public.revenue_report_notes where report_id = current_row.id and section = 'KQKD' and note_type = 'actual' order by sort_order limit 1), ''),
      'actions', (select coalesce(jsonb_agg(content order by sort_order), '[]'::jsonb) from public.revenue_report_notes where report_id = current_row.id and note_type = 'action')
    )
  );
  return result;
end;
$$;

grant execute on function public.revenue_dashboard_report(date, date) to authenticated;

insert into public.revenue_invited_users (email, role) values
  ('minh@ledgerly.app', 'admin'),
  ('finance@ledgerly.app', 'finance')
on conflict do nothing;

insert into public.revenue_source_files (id, file_name, status, imported_at) values
  ('11111111-1111-1111-1111-111111111111', 'P&L tháng 5-2026.xlsx', 'imported', now()),
  ('22222222-2222-2222-2222-222222222222', 'P&L tháng 6-2026.xlsx', 'imported', now())
on conflict do nothing;

insert into public.revenue_monthly_reports (id, source_file_id, report_month, scenario, revenue, revenue_per_day, tables_count, revenue_per_table, gross_profit, gross_margin, operating_costs, ebitda, ebitda_margin, tax, net_profit, net_margin) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', '2026-05-01', 'actual', 1516248002, 48911226, 1518, 998846, 857974966, .5659, 349881611, 508093355, .3351, 68231160, 439862195, .2901),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', '2026-06-01', 'actual', 1530829057, 51027635, 1405, 1089558, 793382577, .5182698704, 383830439, 409552138, .2675361668, 68887308, 340664830, .2225361668),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', null, '2026-06-01', 'plan', 1300000000, 43333333, 1300, 1000000, 683150000, .5255, 364000000, 319150000, .2455, 58500000, 260650000, .2005)
on conflict do nothing;

insert into public.revenue_report_categories (report_id, category, revenue, share, cogs, cogs_rate) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Food', 967774146, .6322, 363295480, .3754),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Drinks', 529015146, .3456, 368825000, .6972),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Other', 34039765, .0222, 5326000, .1565)
on conflict do nothing;

insert into public.revenue_expense_lines (report_id, category_code, category_name, amount) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'beer', 'Beer', 269829000), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'beer', 'Beer', 330295000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'payroll', 'Payroll', 208704926), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'payroll', 'Payroll', 238104596),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'fuel', 'Fuel', 38759000), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'fuel', 'Fuel', 50885000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'marketing', 'Marketing', 15049000), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'marketing', 'Marketing', 23603000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'purchases', 'New purchases', 14504150), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'purchases', 'New purchases', 19733760)
on conflict do nothing;

insert into public.revenue_products (id, external_code, name) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'B04', 'Heineken Silver 250ml'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', 'B08', 'Tiger Silver 250ml'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000003', 'B07', 'Tiger Silver 330ml'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000004', 'MC04', 'Crispy taro squid'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000005', 'B03', 'Heineken Silver 330ml')
on conflict do nothing;

insert into public.revenue_product_monthly (report_id, product_id, units_sold, gross_revenue, net_revenue) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 4616, 96885600, 96885600),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', 4910, 93290000, 93290000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000003', 2779, 69475000, 69475000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000004', 506, 59761800, 59761800),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000005', 2102, 56664900, 56664900)
on conflict do nothing;

insert into public.revenue_report_notes (report_id, section, note_type, content, sort_order) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'KQKD', 'actual', 'Revenue stayed near May levels, but approximately ₫100M of additional costs compressed profit.', 0),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Inventory', 'action', 'Review beer purchasing and inventory carryover.', 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'People', 'action', 'Stabilize kitchen staffing and service time.', 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Product', 'action', 'Prepare the July menu review and August product trials.', 3);
