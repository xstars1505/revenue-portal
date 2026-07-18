"use client";

import { Check } from "@phosphor-icons/react";
import { Change } from "@/components/dashboard/change";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { delta, money } from "@/lib/dashboard";

export default function ProfitLossPage() {
  const { report } = useDashboard();
  if (!report) return null;
  const periodName = report.period.split(" ")[0];
  const comparisonName = report.comparisonPeriod.split(" ")[0];
  const rows = [["Revenue", "revenue"], ["Gross profit", "grossProfit"], ["Operating costs", "opex"], ["EBITDA", "ebitda"], ["After-tax profit", "netProfit"]] as const;
  return <section className="page-section"><div className="section-copy"><h2>Profit and loss</h2><p>{report.period} actuals compared with {report.comparisonPeriod}{report.plan ? " and the operating plan" : ""}.</p></div><div className="panel pnl-table"><div className="pnl-row pnl-header"><span>Metric</span><span>{periodName} actual</span><span>{comparisonName} actual</span><span>{periodName} plan</span><span>vs {comparisonName}</span><span>vs plan</span></div>{rows.map(([label, key]) => <div className={`pnl-row ${label.includes("profit") || label === "EBITDA" ? "pnl-total" : ""}`} key={key}><strong>{label}</strong><span>{money(report.actual[key])}</span><span>{money(report.previous[key])}</span><span>{report.plan ? money(report.plan[key]) : "—"}</span><Change value={delta(report.actual[key], report.previous[key])} />{report.plan ? <Change value={delta(report.actual[key], report.plan[key])} /> : <span>—</span>}</div>)}</div>{(report.review.summary || report.review.actions.length > 0) && <div className="review-card"><div><span>Management review</span><h3>{report.review.summary}</h3></div><ul>{report.review.actions.map((action) => <li key={action}><Check size={15} weight="bold" />{action}</li>)}</ul></div>}</section>;
}
