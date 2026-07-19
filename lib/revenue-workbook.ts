import ExcelJS, { type CellValue, type Worksheet } from "exceljs";

export type ParsedFinancials = {
  revenue: number;
  revenuePerDay: number;
  tables: number;
  revenuePerTable: number;
  grossProfit: number;
  grossMargin: number;
  operatingCosts: number;
  ebitda: number;
  ebitdaMargin: number;
  tax: number;
  netProfit: number;
  netMargin: number;
};

export type ParsedWorkbook = {
  reportMonth: string;
  actual: ParsedFinancials;
  plan: ParsedFinancials | null;
  categories: {
    category: string;
    revenue: number;
    share: number;
    cogs: number;
    cogsRate: number;
  }[];
  expenses: { code: string; name: string; amount: number }[];
  review: { summary: string; actions: string[] };
  products: {
    code: string;
    name: string;
    unitsSold: number;
    grossRevenue: number;
    returnedUnits: number;
    returnValue: number;
    netRevenue: number;
  }[];
};

const normalized = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();

function displayValue(value: CellValue): string | number | Date | null {
  if (value == null || typeof value === "boolean") return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
  )
    return value;
  if ("result" in value) return displayValue(value.result as CellValue);
  if ("text" in value) return value.text;
  if ("richText" in value)
    return value.richText.map((part) => part.text).join("");
  return null;
}

function numeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/[0-9]/.test(value)) return null;
  const negative = /^\s*\(/.test(value) || /^\s*-/.test(value);
  const percent = value.includes("%");
  const cleaned = value
    .replace(/[^0-9.,-]/g, "")
    .replace(/[.,](?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(cleaned.replace(/-/g, ""));
  return Number.isFinite(parsed)
    ? (negative ? -parsed : parsed) / (percent ? 100 : 1)
    : null;
}

function rows(sheet: Worksheet) {
  const result: (string | number | Date | null)[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values: (string | number | Date | null)[] = [];
    for (let column = 1; column <= row.cellCount; column++)
      values[column] = displayValue(row.getCell(column).value);
    result[rowNumber] = values;
  });
  return result;
}

function reportMonth(workbookRows: ReturnType<typeof rows>[]) {
  for (const sheet of workbookRows)
    for (const row of sheet)
      for (const value of row ?? []) {
        if (typeof value !== "string") continue;
        const match =
          value.match(
            /(?:tu ngay\s*)?(0?1)[/-](0?[1-9]|1[0-2])[/-](20\d{2})/i,
          ) ??
          normalized(value).match(
            /(?:tu ngay\s*)?(0?1)[/-](0?[1-9]|1[0-2])[/-](20\d{2})/i,
          );
        if (match) return `${match[3]}-${match[2].padStart(2, "0")}-01`;
      }
  for (const sheet of workbookRows)
    for (const row of sheet)
      for (const value of row ?? [])
        if (value instanceof Date && value.getUTCDate() === 1)
          return value.toISOString().slice(0, 7) + "-01";
  throw new Error("Could not find a reporting month in the workbook");
}

const aliases = {
  revenue: ["tong doanh thu", "doanh thu thuan"],
  grossProfit: ["loi nhuan gop", "lai gop"],
  operatingCosts: [
    "tong chi phi hoat dong",
    "tong chi phi hd",
    "tong chi phi van hanh",
    "chi phi hoat dong",
    "tong chi phi",
  ],
  ebitda: ["ebitda"],
  tax: ["thue thu nhap doanh nghiep", "thue tndn"],
  netProfit: ["loi nhuan sau thue", "loi nhuan rong", "lnst"],
  tables: ["so luong ban", "so ban", "luot ban"],
} as const;

function headerColumns(sheetRows: ReturnType<typeof rows>) {
  let actual: number | null = null;
  let plan: number | null = null;
  for (const row of sheetRows.slice(0, 30))
    for (let column = 1; column < (row?.length ?? 0); column++) {
      const label = normalized(row[column]);
      if (!actual && /^(thuc hien|actual|ky nay)( |$)/.test(label))
        actual = column;
      if (!plan && /^(ke hoach|kh|plan|ngan sach)( |$)/.test(label))
        plan = column;
    }
  return { actual, plan };
}

function metric(
  sheetRows: ReturnType<typeof rows>,
  names: readonly string[],
  column: number | null,
) {
  for (const row of sheetRows) {
    if (!row) continue;
    const labelColumn = row.findIndex(
      (value) =>
        typeof value === "string" &&
        names.some((name) => {
          const label = normalized(value);
          return (
            label === name ||
            (/^(?:[ivx]+|\d+) /.test(label) && label.endsWith(` ${name}`))
          );
        }),
    );
    if (labelColumn < 0) continue;
    if (column) {
      const value = numeric(row[column]);
      if (value != null) return value;
    }
    for (let index = labelColumn + 1; index < row.length; index++) {
      const value = numeric(row[index]);
      if (value != null) return value;
    }
  }
  return null;
}

function financials(
  sheetRows: ReturnType<typeof rows>,
  column: number | null,
  month: string,
): ParsedFinancials | null {
  const revenue = metric(sheetRows, aliases.revenue, column);
  const grossProfit = metric(sheetRows, aliases.grossProfit, column);
  const operatingCosts = metric(sheetRows, aliases.operatingCosts, column);
  const netProfit = metric(sheetRows, aliases.netProfit, column);
  if (
    [revenue, grossProfit, operatingCosts, netProfit].some(
      (value) => value == null,
    )
  )
    return null;
  const safeRevenue = revenue!;
  if (safeRevenue <= 0) return null;
  const ebitda =
    metric(sheetRows, aliases.ebitda, column) ?? grossProfit! - operatingCosts!;
  const tables = Math.round(metric(sheetRows, aliases.tables, column) ?? 0);
  const days = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  return {
    revenue: safeRevenue,
    revenuePerDay: safeRevenue / days,
    tables,
    revenuePerTable: tables ? safeRevenue / tables : 0,
    grossProfit: grossProfit!,
    grossMargin: safeRevenue ? grossProfit! / safeRevenue : 0,
    operatingCosts: operatingCosts!,
    ebitda,
    ebitdaMargin: safeRevenue ? ebitda / safeRevenue : 0,
    tax: metric(sheetRows, aliases.tax, column) ?? ebitda - netProfit!,
    netProfit: netProfit!,
    netMargin: safeRevenue ? netProfit! / safeRevenue : 0,
  };
}

function rowWithLabel(
  sheetRows: ReturnType<typeof rows>,
  label: (value: string) => boolean,
) {
  return sheetRows.find((row) => row && label(normalized(row[2])));
}

function valueAt(
  row: ReturnType<typeof rows>[number] | undefined,
  column: number,
) {
  return numeric(row?.[column]);
}

function actualFinancials(
  sheetRows: ReturnType<typeof rows>,
): ParsedFinancials | null {
  const revenueRow = rowWithLabel(sheetRows, (label) =>
    label.startsWith("tong doanh thu thang"),
  );
  const grossRow = rowWithLabel(sheetRows, (label) =>
    label.includes("gross profit"),
  );
  const operatingCostsRow = rowWithLabel(
    sheetRows,
    (label) => label === "total",
  );
  const ebitdaRow = rowWithLabel(sheetRows, (label) =>
    label.includes("ebitda"),
  );
  const taxRow = rowWithLabel(sheetRows, (label) =>
    label.startsWith("thue kinh doanh"),
  );
  const netProfitRow = rowWithLabel(sheetRows, (label) =>
    label.startsWith("pax"),
  );
  const revenue = valueAt(revenueRow, 3);
  const grossProfit = valueAt(grossRow, 6);
  const operatingCosts = valueAt(operatingCostsRow, 3);
  const netProfit = valueAt(netProfitRow, 3);
  if (
    revenue == null ||
    revenue <= 0 ||
    grossProfit == null ||
    operatingCosts == null ||
    netProfit == null
  )
    return null;
  const ebitda = valueAt(ebitdaRow, 3) ?? grossProfit - operatingCosts;
  const tables = Math.round(
    valueAt(
      rowWithLabel(sheetRows, (label) =>
        label.startsWith("tong so ban ban duoc thang"),
      ),
      3,
    ) ?? 0,
  );
  return {
    revenue,
    revenuePerDay:
      valueAt(
        rowWithLabel(sheetRows, (label) =>
          label.startsWith("tong doanh thu ngay"),
        ),
        3,
      ) ?? 0,
    tables,
    revenuePerTable:
      valueAt(
        rowWithLabel(sheetRows, (label) =>
          label.startsWith("tong doanh thu ban"),
        ),
        3,
      ) ?? (tables ? revenue / tables : 0),
    grossProfit,
    grossMargin: grossProfit / revenue,
    operatingCosts,
    ebitda,
    ebitdaMargin: ebitda / revenue,
    tax: valueAt(taxRow, 3) ?? ebitda - netProfit,
    netProfit,
    netMargin: netProfit / revenue,
  };
}

function plannedFinancials(
  sheetRows: ReturnType<typeof rows>,
): ParsedFinancials | null {
  const revenue = valueAt(sheetRows[3], 2);
  const revenuePerTable = valueAt(sheetRows[4], 2);
  const tables = valueAt(sheetRows[5], 2);
  const grossProfit = valueAt(sheetRows[16], 2);
  const operatingCosts = valueAt(sheetRows[28], 4);
  const ebitda = valueAt(sheetRows[30], 4);
  const tax = valueAt(sheetRows[31], 4);
  const netProfit = valueAt(sheetRows[32], 4);
  if (
    [revenue, grossProfit, operatingCosts, ebitda, netProfit].some(
      (value) => value == null,
    ) ||
    revenue! <= 0
  )
    return null;
  return {
    revenue: revenue!,
    revenuePerDay: revenue! / 30,
    tables: Math.round(tables ?? 0),
    revenuePerTable: revenuePerTable ?? (tables ? revenue! / tables : 0),
    grossProfit: grossProfit!,
    grossMargin: grossProfit! / revenue!,
    operatingCosts: operatingCosts!,
    ebitda: ebitda!,
    ebitdaMargin: ebitda! / revenue!,
    tax: tax ?? ebitda! - netProfit!,
    netProfit: netProfit!,
    netMargin: netProfit! / revenue!,
  };
}

function categories(sheetRows: ReturnType<typeof rows>, revenue: number) {
  const names = sheetRows[7];
  const revenues = sheetRows[8];
  const costs = sheetRows[10];
  return [3, 4, 5].flatMap((column) => {
    const category = String(names?.[column] ?? "").trim();
    const categoryRevenue = numeric(revenues?.[column]);
    const cogs = numeric(costs?.[column]);
    return category && categoryRevenue != null && cogs != null
      ? [
          {
            category,
            revenue: categoryRevenue,
            share: categoryRevenue / revenue,
            cogs,
            cogsRate: categoryRevenue ? cogs / categoryRevenue : 0,
          },
        ]
      : [];
  });
}

const expenseCodes: [RegExp, string][] = [
  [/^col\b|payroll|luong/, "payroll"],
  [/rent|thue mat bang/, "rent"],
  [/shop expense|dien|nuoc/, "utilities"],
  [/other opex|mua sam/, "purchases"],
  [/marketing/, "marketing"],
  [/vat tu tieu hao/, "supplies"],
  [/quan he/, "relations"],
  [/thuong tet/, "tet_bonus"],
  [/tat nien/, "year_end_party"],
  [/depreciation|khau hao/, "depreciation"],
];

function expenseCode(name: string) {
  const label = normalized(name);
  return (
    expenseCodes.find(([pattern]) => pattern.test(label))?.[1] ??
    label.replaceAll(" ", "_").slice(0, 80)
  );
}

function expenses(sheetRows: ReturnType<typeof rows>) {
  const grossIndex = sheetRows.findIndex(
    (row) => row && normalized(row[2]).includes("gross profit"),
  );
  const totalIndex = sheetRows.findIndex(
    (row, index) => index > grossIndex && row && normalized(row[2]) === "total",
  );
  if (grossIndex < 0 || totalIndex < 0) return [];
  const lines = sheetRows.slice(grossIndex + 1, totalIndex).flatMap((row) => {
    const name = String(row?.[2] ?? "").trim();
    const amount = numeric(row?.[3]);
    return name && amount != null
      ? [{ code: expenseCode(name), name, amount }]
      : [];
  });
  return [
    ...lines
      .reduce((grouped, line) => {
        const existing = grouped.get(line.code);
        grouped.set(
          line.code,
          existing
            ? { ...existing, amount: existing.amount + line.amount }
            : line,
        );
        return grouped;
      }, new Map<string, (typeof lines)[number]>())
      .values(),
  ];
}

function review(sheetRows?: ReturnType<typeof rows>) {
  if (!sheetRows) return { summary: "", actions: [] as string[] };
  const actual = sheetRows.find((row) =>
    row?.some((value) => normalized(value).startsWith("thuc te")),
  );
  const proposed = sheetRows.find((row) =>
    row?.some((value) => normalized(value).startsWith("de xuat")),
  );
  const text = (row: typeof actual) =>
    (row ?? []).filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
  const actualText = text(actual).filter(
    (value) => !normalized(value).startsWith("thuc te"),
  );
  const actions = text(proposed).filter(
    (value) => !normalized(value).startsWith("de xuat"),
  );
  return {
    summary: actualText.at(-1)?.trim() ?? "",
    actions: actions.map((value) => value.trim()),
  };
}

function products(workbookRows: ReturnType<typeof rows>[]) {
  for (const sheetRows of workbookRows)
    for (let rowNumber = 1; rowNumber < sheetRows.length; rowNumber++) {
      const header = sheetRows[rowNumber];
      if (!header) continue;
      const find = (name: string) =>
        header.findIndex((value) => normalized(value) === name);
      const columns = {
        code: find("ma hang"),
        name: find("ten hang"),
        units: find("sl ban"),
        gross: find("doanh thu"),
        returned: find("sl tra"),
        returnValue: find("gia tri tra"),
        net: find("doanh thu thuan"),
      };
      if (columns.code < 0 || columns.name < 0 || columns.net < 0) continue;
      return sheetRows.slice(rowNumber + 1).flatMap((row) => {
        const code = String(row?.[columns.code] ?? "").trim();
        const name = String(row?.[columns.name] ?? "").trim();
        const netRevenue = numeric(row?.[columns.net]);
        return code && name && netRevenue != null
          ? [
              {
                code,
                name,
                unitsSold: numeric(row?.[columns.units]) ?? 0,
                grossRevenue: numeric(row?.[columns.gross]) ?? netRevenue,
                returnedUnits: numeric(row?.[columns.returned]) ?? 0,
                returnValue: numeric(row?.[columns.returnValue]) ?? 0,
                netRevenue,
              },
            ]
          : [];
      });
    }
  return [];
}

export async function parseRevenueWorkbook(
  buffer: Buffer,
): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheets = workbook.worksheets.map((sheet) => ({
    name: normalized(sheet.name),
    rows: rows(sheet),
  }));
  const workbookRows = sheets.map((sheet) => sheet.rows);
  const month = reportMonth(workbookRows);
  const actualRows = sheets.find(
    (sheet) => sheet.name === "ket qua kinh doanh",
  )?.rows;
  const actual = actualRows ? actualFinancials(actualRows) : null;
  if (actual && actualRows) {
    const planRows = sheets.find(
      (sheet) => sheet.name === "ke hoach kd repo",
    )?.rows;
    return {
      reportMonth: month,
      actual,
      plan: planRows ? plannedFinancials(planRows) : null,
      categories: categories(actualRows, actual.revenue),
      expenses: expenses(actualRows),
      review: review(sheets.find((sheet) => sheet.name === "review")?.rows),
      products: products(workbookRows),
    };
  }
  for (const sheetRows of workbookRows) {
    const columns = headerColumns(sheetRows);
    const fallbackActual = financials(sheetRows, columns.actual, month);
    if (fallbackActual)
      return {
        reportMonth: month,
        actual: fallbackActual,
        plan: columns.plan ? financials(sheetRows, columns.plan, month) : null,
        categories: [],
        expenses: [],
        review: { summary: "", actions: [] },
        products: products(workbookRows),
      };
  }
  throw new Error(
    "Unsupported P&L layout: required revenue, gross profit, operating costs, and net profit rows were not found on one sheet",
  );
}
