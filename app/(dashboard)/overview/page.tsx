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
  tone: string;
  comparison: string;
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metric-label">
        {label}
        <Info size={14} />
      </div>
      <strong>{value}</strong>
      <div className="metric-foot">
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
      <div className="overview-intro">
        <div>
          <h2>{periodName} performance</h2>
          <p>Actual results from {report.source}</p>
        </div>
        <span className="status-badge">
          <Check size={13} weight="bold" /> Workbook reconciled
        </span>
      </div>
      <section className="insight-banner">
        <div>
          <span>{periodName} finding</span>
          <h2>Revenue held. Profit compressed.</h2>
          <p>{report.review.summary}</p>
        </div>
        <div className="insight-stat">
          <strong>{signed(delta(actual.netProfit, previous.netProfit))}</strong>
          <span>after-tax profit vs {comparisonName}</span>
        </div>
      </section>
      <section
        className="metrics"
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
      <section className="operating-strip" aria-label="Operating metrics">
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
      <section className="overview-grid">
        <article className="panel plan-panel">
          <div className="panel-head">
            <div>
              <h3>Actual against plan</h3>
              <p>{report.period} performance</p>
            </div>
            {plan && (
              <span className="status-badge">
                <Check size={12} /> Plan loaded
              </span>
            )}
          </div>
          {plan ? (
            <div className="plan-list">
              {planRows.map(([label, actualValue, planValue]) => (
                <div key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{money(actualValue, true)}</strong>
                    <small>{signed(delta(actualValue, planValue))}</small>
                  </div>
                  <div className="thin-bar">
                    <i
                      style={{
                        width: `${Math.min((actualValue / planValue) * 76, 100)}%`,
                      }}
                    />
                  </div>
                  <p>Plan {money(planValue, true)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy">
              No operating plan was found in this workbook.
            </p>
          )}
        </article>
        <article className="panel mix-panel-real">
          <div className="panel-head">
            <div>
              <h3>Revenue mix and COGS</h3>
              <p>Category economics</p>
            </div>
          </div>
          <div className="mix-list">
            {report.revenueMix.map((item) => (
              <div key={item.name}>
                <div>
                  <span>{item.name}</span>
                  <strong>{ratio(item.share)}</strong>
                </div>
                <div className="mix-bar">
                  <i style={{ width: `${item.share * 100}%` }} />
                </div>
                <p>
                  <span>{money(item.revenue, true)} revenue</span>
                  <b className={item.cogs > 0.6 ? "warning-text" : ""}>
                    {ratio(item.cogs)} COGS
                  </b>
                </p>
              </div>
            ))}
          </div>
          <div className="mix-alert">
            <WarningCircle size={18} weight="fill" />
            <p>
              <strong>Drinks need attention.</strong>
              <br />
              Drink COGS reached 69.7%, up sharply with the higher beer mix.
            </p>
          </div>
        </article>
      </section>
      <section className="panel drivers-panel">
        <div className="panel-head">
          <div>
            <h3>Largest cost increases</h3>
            <p>
              {report.period} compared with {report.comparisonPeriod}
            </p>
          </div>
          <span className="driver-total">
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
        <div className="driver-table">
          <div className="driver-row driver-header">
            <span>Cost driver</span>
            <span>{comparisonName}</span>
            <span>{periodName}</span>
            <span>Change</span>
          </div>
          {report.costDrivers.map((item) => (
            <div className="driver-row" key={item.name}>
              <strong>{item.name}</strong>
              <span>{money(item.previous, true)}</span>
              <span>{money(item.current, true)}</span>
              <b>+{money(item.current - item.previous, true)}</b>
            </div>
          ))}
        </div>
      </section>
      <section className="panel products-panel">
        <div className="panel-head">
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
