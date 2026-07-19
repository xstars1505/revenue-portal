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
  const rows = [
    ["Revenue", "revenue"],
    ["Gross profit", "grossProfit"],
    ["Operating costs", "opex"],
    ["EBITDA", "ebitda"],
    ["After-tax profit", "netProfit"],
  ] as const;
  return (
    <section className="py-9">
      <div className="mb-6">
        <h2 className="mb-2 text-2xl tracking-[-0.04em]">Profit and loss</h2>
        <p className="leading-[1.6] text-[#777b73]">
          {report.period} actuals compared with {report.comparisonPeriod}
          {report.plan ? " and the operating plan" : ""}.
        </p>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-[#e6e7e1] bg-white max-[760px]:overflow-x-auto">
        <div className="grid min-h-[38px] grid-cols-[minmax(165px,1.15fr)_repeat(5,minmax(90px,0.75fr))] items-center bg-[#fafaf7] px-[18px] text-[8px] text-[#989b95] max-[760px]:min-w-[720px]">
          <span>Metric</span>
          <span>{periodName} actual</span>
          <span>{comparisonName} actual</span>
          <span>{periodName} plan</span>
          <span>vs {comparisonName}</span>
          <span>vs plan</span>
        </div>
        {rows.map(([label, key]) => (
          <div
            className={`grid min-h-[53px] grid-cols-[minmax(165px,1.15fr)_repeat(5,minmax(90px,0.75fr))] items-center border-b border-[#e6e7e1] px-[18px] text-[9px] text-[#676c65] last:border-b-0 max-[760px]:min-w-[720px] ${label.includes("profit") || label === "EBITDA" ? "bg-[#f7f8f5] [&>strong]:font-bold" : ""}`}
            key={key}
          >
            <strong className="text-[10px] text-[#3e433d]">{label}</strong>
            <span>{money(report.actual[key])}</span>
            <span>{money(report.previous[key])}</span>
            <span>{report.plan ? money(report.plan[key]) : "—"}</span>
            <Change value={delta(report.actual[key], report.previous[key])} />
            {report.plan ? (
              <Change value={delta(report.actual[key], report.plan[key])} />
            ) : (
              <span>—</span>
            )}
          </div>
        ))}
      </div>
      {(report.review.summary || report.review.actions.length > 0) && (
        <div className="mt-4 grid grid-cols-2 gap-10 rounded-[10px] border border-[#e5e0d4] bg-[#fbf8ee] p-6 max-[760px]:grid-cols-1 max-[760px]:gap-[22px] max-[760px]:p-[19px]">
          <div>
            <span className="text-[9px] tracking-[0.08em] text-[#8a7951] uppercase">
              Management review
            </span>
            <h3 className="mt-2 max-w-[520px] text-[17px] leading-[1.4] tracking-[-0.025em] text-[#625b4b]">
              {report.review.summary}
            </h3>
          </div>
          <ul className="grid list-none gap-2.5 p-0">
            {report.review.actions.map((action) => (
              <li
                className="flex gap-2 text-[10px] leading-[1.5] text-[#746d5c]"
                key={action}
              >
                <Check
                  className="shrink-0 text-[#6a7e6e]"
                  size={15}
                  weight="bold"
                />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
