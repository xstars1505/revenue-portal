"use client";

import { ProductTable } from "@/components/dashboard/product-table";
import { useDashboard } from "@/components/dashboard/dashboard-context";

export default function ProductsPage() {
  const { report } = useDashboard();
  if (!report) return null;
  return <section className="page-section"><div className="section-copy"><h2>Product performance</h2><p>{report.period.split(" ")[0]} leaders by units sold and net revenue.</p></div><div className="panel products-panel standalone-products"><ProductTable products={report.topProducts} /></div></section>;
}
