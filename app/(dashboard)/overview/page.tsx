"use client";

import { Check, Info, WarningCircle } from "@phosphor-icons/react";
import { Change } from "@/components/dashboard/change";
import { ProductTable } from "@/components/dashboard/product-table";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { delta, money, ratio, signed } from "@/lib/dashboard";

function Metric({
  label,
  value,
  change,
  detail,
  tone,
  comparison,
}: {
  label: string;
  value: string;
  change: number;
  detail: string;
  tone: "blue" | "green" | "yellow" | "red";
  comparison: string;
}) {
  const tones = {
    blue: "before:bg-[#809db8]",
    green: "before:bg-[#7ca087]",
    yellow: "before:bg-[#b4a36e]",
    red: "before:bg-[#b78c87]",
  };
  return (
    <article
      className={`relative min-w-0 p-5 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[''] max-[760px]:p-4 ${tones[tone]}`}
    >
      <div className="flex items-center justify-between text-[11px] text-[#777b74]">
        {label}
        <Info size={14} />
      </div>
      <strong className="my-[13px] mt-[17px] block font-mono text-[25px] tracking-[-0.05em] max-[760px]:text-[21px]">
        {value}
      </strong>
      <div className="flex items-center gap-[7px] text-[9px] text-[#979a94] max-[760px]:flex-col max-[760px]:items-start">
        <Change value={change} suffix={`vs ${comparison}`} />
        <span>{detail}</span>
      </div>
    </article>
  );
}

export default function OverviewPage() {
  const { report } = useDashboard();
  if (!report) return null;
  const { actual, previous, plan } = report;
  const periodName = report.period.split(" ")[0];
  const comparisonName = report.comparisonPeriod.split(" ")[0];
  const planRows = plan
    ? ([
        ["Revenue", actual.revenue, plan.revenue],
        ["Gross profit", actual.grossProfit, plan.grossProfit],
        ["EBITDA", actual.ebitda, plan.ebitda],
        ["After-tax profit", actual.netProfit, plan.netProfit],
      ] as const)
    : [];

  return (
    <>
      <div className="flex justify-between gap-5 py-[30px] pb-6 max-[760px]:py-[25px] max-[760px]:pb-5">
        <div>
          <h2 className="mb-1.5 text-[23px] tracking-[-0.04em]">
            {periodName} performance
          </h2>
          <p className="text-xs text-[#777b73]">
            Actual results from {report.source}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1 self-end rounded-full bg-[#e9f2ec] px-1.5 py-1 text-[8px] font-semibold text-[#3e6d52] max-[760px]:hidden">
          <Check size={13} weight="bold" /> Workbook reconciled
        </span>
      </div>
      <section className="mb-3.5 grid grid-cols-[1fr_auto] items-end gap-7 rounded-[10px] border border-[#dfe5df] bg-[#f1f5f1] px-[27px] py-[25px] max-[760px]:grid-cols-1 max-[760px]:p-5">
        <div>
          <span className="font-mono text-[9px] tracking-[0.1em] text-[#6b796f] uppercase">
            {periodName} finding
          </span>
          <h2 className="mt-[9px] mb-1.5 text-2xl tracking-[-0.045em]">
            Revenue held. Profit compressed.
          </h2>
          <p className="max-w-[650px] text-[11px] leading-[1.6] text-[#697169]">
            {report.review.summary}
          </p>
        </div>
        <div className="min-w-[180px] border-l border-[#d8e0d8] pl-6 max-[760px]:border-t max-[760px]:border-l-0 max-[760px]:px-0 max-[760px]:pt-[15px]">
          <strong className="block font-mono text-[26px] tracking-[-0.04em] text-[#874641]">
            {signed(delta(actual.netProfit, previous.netProfit))}
          </strong>
          <span className="text-[9px] text-[#818780]">
            after-tax profit vs {comparisonName}
          </span>
        </div>
      </section>
      <section
        className="grid grid-cols-4 overflow-hidden rounded-[10px] border border-[#e6e7e1] bg-white [&>*]:border-r [&>*]:border-[#e6e7e1] [&>*:last-child]:border-r-0 max-[1000px]:grid-cols-2 max-[1000px]:[&>*:nth-child(2)]:border-r-0 max-[1000px]:[&>*:nth-child(-n+2)]:border-b"
        aria-label={`${report.period} financial summary`}
      >
        <Metric
          label="Revenue"
          value={money(actual.revenue, true)}
          change={delta(actual.revenue, previous.revenue)}
          detail={
            plan
              ? `${signed(delta(actual.revenue, plan.revenue))} vs plan`
              : "No plan uploaded"
          }
          tone="blue"
          comparison={comparisonName}
        />
        <Metric
          label="Gross profit"
          value={money(actual.grossProfit, true)}
          change={delta(actual.grossProfit, previous.grossProfit)}
          detail={`${ratio(actual.grossMargin)} margin`}
          tone="green"
          comparison={comparisonName}
        />
        <Metric
          label="EBITDA"
          value={money(actual.ebitda, true)}
          change={delta(actual.ebitda, previous.ebitda)}
          detail={`${ratio(actual.ebitdaMargin)} margin`}
          tone="yellow"
          comparison={comparisonName}
        />
        <Metric
          label="After-tax profit"
          value={money(actual.netProfit, true)}
          change={delta(actual.netProfit, previous.netProfit)}
          detail={`${ratio(actual.netMargin)} margin`}
          tone="red"
          comparison={comparisonName}
        />
      </section>
      <section
        className="mt-3.5 grid grid-cols-4 overflow-hidden rounded-[10px] border border-[#e6e7e1] bg-white [&>div]:grid [&>div]:gap-[7px] [&>div]:border-r [&>div]:border-[#e6e7e1] [&>div]:px-[18px] [&>div]:py-[15px] [&>div:last-child]:border-r-0 [&_small]:text-[8px] [&_small]:text-[#999c96] [&_strong]:font-mono [&_strong]:text-[15px] [&_div>span:first-child]:text-[9px] [&_div>span:first-child]:text-[#8d918a] max-[1000px]:grid-cols-2 max-[1000px]:[&>div:nth-child(2)]:border-r-0 max-[1000px]:[&>div:nth-child(-n+2)]:border-b"
        aria-label="Operating metrics"
      >
        <div>
          <span>Tables served</span>
          <strong>{actual.tables.toLocaleString()}</strong>
          <Change
            value={delta(actual.tables, previous.tables)}
            suffix={`vs ${comparisonName}`}
          />
        </div>
        <div>
          <span>Revenue / table</span>
          <strong>{money(actual.revenuePerTable, true)}</strong>
          <Change
            value={delta(actual.revenuePerTable, previous.revenuePerTable)}
            suffix={`vs ${comparisonName}`}
          />
        </div>
        <div>
          <span>Revenue / day</span>
          <strong>{money(actual.revenuePerDay ?? 0, true)}</strong>
          <small>Daily average</small>
        </div>
        <div>
          <span>Total operating costs</span>
          <strong>{money(actual.opex, true)}</strong>
          <Change
            value={delta(actual.opex, previous.opex)}
            suffix={`vs ${comparisonName}`}
          />
        </div>
      </section>
      <section className="mt-3.5 grid grid-cols-[minmax(0,1.25fr)_minmax(310px,0.75fr)] gap-3.5 max-[1000px]:grid-cols-1 max-[760px]:mt-2.5 max-[760px]:gap-2.5">
        <article className="rounded-[10px] border border-[#e6e7e1] bg-white p-5">
          <div className="flex items-start justify-between gap-4 [&_h3]:mb-1 [&_h3]:text-[13px] [&_p]:text-[10px] [&_p]:text-[#999c96]">
            <div>
              <h3>Actual against plan</h3>
              <p>{report.period} performance</p>
            </div>
            {plan && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#e9f2ec] px-1.5 py-1 text-[8px] font-semibold text-[#3e6d52]">
                <Check size={12} /> Plan loaded
              </span>
            )}
          </div>
          {plan ? (
            <div className="mt-[22px] grid gap-[18px]">
              {planRows.map(([label, actualValue, planValue]) => (
                <div key={label}>
                  <div className="grid grid-cols-[1fr_auto_62px] items-baseline gap-2.5">
                    <span className="text-[10px] text-[#5e635c]">{label}</span>
                    <strong className="font-mono text-[11px]">
                      {money(actualValue, true)}
                    </strong>
                    <small className="text-right text-[9px] text-[#3d7653]">
                      {signed(delta(actualValue, planValue))}
                    </small>
                  </div>
                  <div className="my-[7px] mb-[5px] h-1 overflow-hidden rounded-sm bg-[#eef0eb]">
                    <i
                      className="block h-full rounded-[inherit] bg-[#557161]"
                      style={{
                        width: `${Math.min((actualValue / planValue) * 76, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[8px] text-[#9a9d97]">
                    Plan {money(planValue, true)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-[11px] text-[#777b73]">
              No operating plan was found in this workbook.
            </p>
          )}
        </article>
        <article className="rounded-[10px] border border-[#e6e7e1] bg-white p-5">
          <div className="flex items-start justify-between gap-4 [&_h3]:mb-1 [&_h3]:text-[13px] [&_p]:text-[10px] [&_p]:text-[#999c96]">
            <div>
              <h3>Revenue mix and COGS</h3>
              <p>Category economics</p>
            </div>
          </div>
          <div className="mt-[22px] grid gap-[18px]">
            {report.revenueMix.map((item, index) => (
              <div key={item.name}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[#5f645d]">
                    {item.name}
                  </span>
                  <strong className="font-mono text-[11px]">
                    {ratio(item.share)}
                  </strong>
                </div>
                <div className="my-[7px] mb-[5px] h-1 overflow-hidden rounded-sm bg-[#eef0eb]">
                  <i
                    className={`block h-full rounded-[inherit] ${index === 1 ? "bg-[#8c735e]" : index === 2 ? "bg-[#aab2aa]" : "bg-[#557161]"}`}
                    style={{ width: `${item.share * 100}%` }}
                  />
                </div>
                <p className="flex items-center justify-between gap-3 text-[8px] font-medium text-[#999c96]">
                  <span>{money(item.revenue, true)} revenue</span>
                  <b className={item.cogs > 0.6 ? "text-[#9a514b]" : ""}>
                    {ratio(item.cogs)} COGS
                  </b>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-[21px] flex gap-[9px] rounded-[7px] bg-[#fbefed] p-3 text-[#8a514b] [&>svg]:shrink-0">
            <WarningCircle size={18} weight="fill" />
            <p className="text-[9px] leading-[1.5] text-[#8b625d]">
              <strong className="text-[#784640]">Drinks need attention.</strong>
              <br />
              Drink COGS reached 69.7%, up sharply with the higher beer mix.
            </p>
          </div>
        </article>
      </section>
      <section className="mt-3.5 rounded-[10px] border border-[#e6e7e1] bg-white p-5 max-[760px]:mt-2.5 max-[760px]:p-4">
        <div className="flex items-start justify-between gap-4 [&_h3]:mb-1 [&_h3]:text-[13px] [&_p]:text-[10px] [&_p]:text-[#999c96]">
          <div>
            <h3>Largest cost increases</h3>
            <p>
              {report.period} compared with {report.comparisonPeriod}
            </p>
          </div>
          <span className="font-mono text-[9px] text-[#9a514b]">
            {money(
              report.costDrivers.reduce(
                (sum, item) => sum + item.current - item.previous,
                0,
              ),
              true,
            )}{" "}
            across these drivers
          </span>
        </div>
        <div className="mt-4">
          <div className="grid min-h-[29px] grid-cols-[minmax(180px,1fr)_0.75fr_0.75fr_0.65fr] items-center text-[8px] text-[#9b9e98] max-[760px]:grid-cols-[1fr_0.65fr_0.65fr] max-[760px]:[&>:nth-child(2)]:hidden">
            <span>Cost driver</span>
            <span>{comparisonName}</span>
            <span>{periodName}</span>
            <span>Change</span>
          </div>
          {report.costDrivers.map((item) => (
            <div
              className="grid min-h-[42px] grid-cols-[minmax(180px,1fr)_0.75fr_0.75fr_0.65fr] items-center border-t border-[#eeefeb] text-[9px] text-[#686d66] max-[760px]:grid-cols-[1fr_0.65fr_0.65fr] max-[760px]:[&>:nth-child(2)]:hidden"
              key={item.name}
            >
              <strong className="text-[10px] text-[#3d423c]">
                {item.name}
              </strong>
              <span>{money(item.previous, true)}</span>
              <span>{money(item.current, true)}</span>
              <b className="font-mono font-medium text-[#9a514b]">
                +{money(item.current - item.previous, true)}
              </b>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-3.5 rounded-[10px] border border-[#e6e7e1] bg-white p-5 max-[760px]:mt-2.5 max-[760px]:p-4">
        <div className="flex items-start justify-between gap-4 [&_h3]:mb-1 [&_h3]:text-[13px] [&_p]:text-[10px] [&_p]:text-[#999c96]">
          <div>
            <h3>Top products</h3>
            <p>Ranked by net revenue</p>
          </div>
        </div>
        <ProductTable products={report.topProducts} />
      </section>
    </>
  );
}
