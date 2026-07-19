export type User = { email: string; name: string; role: string };
export type RevenueMonth = {
  month: string;
  revenue: number;
  cogs: number;
  opex: number;
  source: string;
};
export type PeriodOption = { value: string; label: string };
export type Financials = {
  revenue: number;
  tables: number;
  revenuePerTable: number;
  grossProfit: number;
  grossMargin: number;
  opex: number;
  ebitda: number;
  ebitdaMargin: number;
  netProfit: number;
  netMargin: number;
  revenuePerDay?: number;
  tax?: number;
};
export type Report = {
  period: string;
  comparisonPeriod: string;
  source: string;
  actual: Financials;
  previous: Financials;
  plan: Financials | null;
  revenueMix: { name: string; revenue: number; share: number; cogs: number }[];
  costDrivers: { name: string; current: number; previous: number }[];
  topProducts: { code: string; name: string; units: number; revenue: number }[];
  review: { summary: string; actions: string[] };
};

export const money = (value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);

export const ratio = (value: number) => `${(value * 100).toFixed(1)}%`;
export const delta = (current: number, comparison: number) =>
  (current / comparison - 1) * 100;
export const signed = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
