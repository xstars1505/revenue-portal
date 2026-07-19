import { NextRequest, NextResponse } from "next/server";
import { months, report, sessions, type RevenueMonth } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isGoogleUser } from "@/lib/auth";

function localAuthorized(request: NextRequest) {
  return sessions.has(request.cookies.get("ledgerly_session")?.value ?? "");
}

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;
const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isGoogleUser(user))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const requestedMonth = request.nextUrl.searchParams.get("month");
    const requestedComparison = request.nextUrl.searchParams.get("compare");
    if (
      (requestedMonth && !monthPattern.test(requestedMonth)) ||
      (requestedComparison && !monthPattern.test(requestedComparison))
    )
      return NextResponse.json(
        { error: "Months must use YYYY-MM-01" },
        { status: 400 },
      );
    const { data: rows, error: rowsError } = await supabase
      .from("revenue_monthly_reports")
      .select(
        "report_month,scenario,revenue,gross_profit,operating_costs,revenue_source_files(file_name)",
      )
      .eq("branch", "Central branch")
      .order("report_month");
    if (rowsError)
      return NextResponse.json({ error: rowsError.message }, { status: 500 });
    const actualRows = (rows ?? []).filter((row) => row.scenario === "actual");
    const completePeriods = actualRows.map((row, index) => ({
      value: row.report_month,
      label: monthLabel(row.report_month),
      compare: actualRows[Math.max(0, index - 1)].report_month,
    }));
    const calendarMonth = new Date().toISOString().slice(0, 7) + "-01";
    const selectedPeriod = requestedMonth
      ? completePeriods.find((period) => period.value === requestedMonth)
      : (completePeriods.find((period) => period.value === calendarMonth) ??
        completePeriods.at(-1));
    if (!selectedPeriod)
      return NextResponse.json(
        { error: "No complete reporting period found" },
        { status: 404 },
      );
    const primaryMonth = selectedPeriod.value;
    const comparisonMonth = requestedComparison ?? selectedPeriod.compare;
    const { data: dashboard, error: dashboardError } = await supabase.rpc(
      "revenue_dashboard_report",
      { primary_month: primaryMonth, comparison_month: comparisonMonth },
    );
    if (dashboardError || !dashboard)
      return NextResponse.json(
        { error: dashboardError?.message ?? "Report not found" },
        { status: 404 },
      );
    const normalizedMonths = actualRows.map((row) => {
      const sourceFiles = row.revenue_source_files as
        { file_name: string } | { file_name: string }[] | null;
      return {
        month: monthLabel(row.report_month),
        revenue: Number(row.revenue),
        cogs: Number(row.revenue) - Number(row.gross_profit),
        opex: Number(row.operating_costs),
        source: Array.isArray(sourceFiles)
          ? sourceFiles[0]?.file_name
          : sourceFiles?.file_name,
      };
    });
    return NextResponse.json({
      months: normalizedMonths,
      periods: completePeriods.map(({ value, label }) => ({ value, label })),
      selectedMonth: primaryMonth,
      report: { ...dashboard, comparisonPeriod: monthLabel(comparisonMonth) },
    });
  }

  if (!localAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    months,
    periods: [{ value: "2026-06-01", label: report.period }],
    selectedMonth: "2026-06-01",
    report: { ...report, comparisonPeriod: "May 2026" },
  });
}

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured)
    return NextResponse.json(
      { error: "Workbook imports must use the server importer" },
      { status: 501 },
    );
  if (!localAuthorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const item: RevenueMonth = {
    month: String(body.month ?? "").trim(),
    revenue: Number(body.revenue),
    cogs: Number(body.cogs),
    opex: Number(body.opex),
    source: String(body.source ?? "manual-import.csv").trim(),
  };
  if (
    !item.month ||
    !item.source ||
    ![item.revenue, item.cogs, item.opex].every(Number.isFinite) ||
    item.revenue < 0 ||
    item.cogs < 0 ||
    item.opex < 0
  )
    return NextResponse.json(
      { error: "Invalid revenue record" },
      { status: 400 },
    );
  const existing = months.findIndex((month) => month.month === item.month);
  if (existing >= 0) months[existing] = item;
  else months.push(item);
  return NextResponse.json(
    { item, months },
    { status: existing >= 0 ? 200 : 201 },
  );
}
