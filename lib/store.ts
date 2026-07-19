import { randomUUID } from "node:crypto";

export type User = { email: string; name: string; role: string };
type StoredUser = User & { password: string };

export type RevenueMonth = {
  month: string;
  revenue: number;
  cogs: number;
  opex: number;
  source: string;
};

export const users: StoredUser[] = [
  {
    email: "minh@ledgerly.app",
    password: "revenue2026",
    name: "Minh Nguyen",
    role: "Administrator",
  },
  {
    email: "finance@ledgerly.app",
    password: "revenue2026",
    name: "Lan Tran",
    role: "Finance",
  },
];

const seedMonths: RevenueMonth[] = [
  ["May 2026", 1516248002, 658273036, 349881611, "P&L tháng 5-2026.xlsx"],
  ["Jun 2026", 1530829057, 737446480, 383830439, "P&L tháng 6-2026.xlsx"],
].map(([month, revenue, cogs, opex, source]) => ({
  month: String(month),
  revenue: Number(revenue),
  cogs: Number(cogs),
  opex: Number(opex),
  source: String(source),
}));

const globalStore = globalThis as typeof globalThis & {
  ledgerlyMonths?: RevenueMonth[];
  ledgerlySessions?: Map<string, User>;
};

export const months = (globalStore.ledgerlyMonths ??= [...seedMonths]);
export const sessions = (globalStore.ledgerlySessions ??= new Map<
  string,
  User
>());

export const report = {
  period: "June 2026",
  source: "P&L tháng 6-2026.xlsx",
  actual: {
    revenue: 1530829057,
    revenuePerDay: 51027635,
    tables: 1405,
    revenuePerTable: 1089558,
    grossProfit: 793382577,
    grossMargin: 0.5182698704,
    opex: 383830439,
    ebitda: 409552138,
    ebitdaMargin: 0.2675361668,
    tax: 68887308,
    netProfit: 340664830,
    netMargin: 0.2225361668,
  },
  previous: {
    revenue: 1516248002,
    tables: 1518,
    revenuePerTable: 998846,
    grossProfit: 857974966,
    grossMargin: 0.5659,
    opex: 349881611,
    ebitda: 508093355,
    ebitdaMargin: 0.3351,
    netProfit: 439862195,
    netMargin: 0.2901,
  },
  plan: {
    revenue: 1300000000,
    tables: 1300,
    revenuePerTable: 1000000,
    grossProfit: 683150000,
    grossMargin: 0.5255,
    opex: 364000000,
    ebitda: 319150000,
    ebitdaMargin: 0.2455,
    netProfit: 260650000,
    netMargin: 0.2005,
  },
  revenueMix: [
    { name: "Food", revenue: 967774146, share: 0.6322, cogs: 0.3754 },
    { name: "Drinks", revenue: 529015146, share: 0.3456, cogs: 0.6972 },
    { name: "Other", revenue: 34039765, share: 0.0222, cogs: 0.1565 },
  ],
  costDrivers: [
    { name: "Beer", current: 330295000, previous: 269829000 },
    { name: "Payroll", current: 238104596, previous: 208704926 },
    { name: "Fuel", current: 50885000, previous: 38759000 },
    { name: "Marketing", current: 23603000, previous: 15049000 },
    { name: "New purchases", current: 19733760, previous: 14504150 },
  ],
  topProducts: [
    {
      code: "B04",
      name: "Heineken Silver 250ml",
      units: 4616,
      revenue: 96885600,
    },
    { code: "B08", name: "Tiger Silver 250ml", units: 4910, revenue: 93290000 },
    { code: "B07", name: "Tiger Silver 330ml", units: 2779, revenue: 69475000 },
    { code: "MC04", name: "Crispy taro squid", units: 506, revenue: 59761800 },
    {
      code: "B03",
      name: "Heineken Silver 330ml",
      units: 2102,
      revenue: 56664900,
    },
  ],
  review: {
    summary:
      "Revenue stayed near May levels, but approximately ₫100M of additional costs compressed profit.",
    actions: [
      "Review beer purchasing and inventory carryover.",
      "Stabilize kitchen staffing and service time.",
      "Prepare the July menu review and August product trials.",
    ],
  },
};

export function authenticate(email: string, password: string): User | null {
  const match = users.find(
    (user) =>
      user.email === email.trim().toLowerCase() && user.password === password,
  );
  return match
    ? { email: match.email, name: match.name, role: match.role }
    : null;
}

export function createSession(user: User) {
  const token = randomUUID();
  sessions.set(token, user);
  return token;
}
