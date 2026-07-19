"use client";

import { ProductTable } from "@/components/dashboard/product-table";
import { useDashboard } from "@/components/dashboard/dashboard-context";

export default function ProductsPage() {
  const { report } = useDashboard();
  if (!report) return null;
  return (
    <section className="py-9">
      <div className="mb-6">
        <h2 className="mb-2 text-2xl tracking-[-0.04em]">
          Product performance
        </h2>
        <p className="leading-[1.6] text-[#777b73]">
          {report.period.split(" ")[0]} leaders by units sold and net revenue.
        </p>
      </div>
      <div className="rounded-[10px] border border-[#e6e7e1] bg-white p-5 max-[760px]:p-4">
        <ProductTable products={report.topProducts} />
      </div>
    </section>
  );
}
