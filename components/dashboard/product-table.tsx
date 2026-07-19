import type { Report } from "@/lib/dashboard";
import { money, ratio } from "@/lib/dashboard";

export function ProductTable({
  products,
}: {
  products: Report["topProducts"];
}) {
  const total = products.reduce((sum, item) => sum + item.revenue, 0);
  return (
    <div className="mt-4">
      <div className="grid min-h-[29px] grid-cols-[minmax(250px,1.5fr)_0.5fr_0.75fr_0.65fr] items-center text-[8px] text-[#9b9e98] max-[760px]:grid-cols-[minmax(0,1.4fr)_0.5fr_0.7fr] max-[760px]:[&>:last-child]:hidden">
        <span>Product</span>
        <span>Units</span>
        <span>Revenue</span>
        <span>Share of top 5</span>
      </div>
      {products.map((item, index) => (
        <div
          className="grid min-h-12 grid-cols-[minmax(250px,1.5fr)_0.5fr_0.75fr_0.65fr] items-center border-t border-[#eeefeb] text-[9px] text-[#686d66] max-[760px]:grid-cols-[minmax(0,1.4fr)_0.5fr_0.7fr] max-[760px]:[&>:last-child]:hidden"
          key={item.code}
        >
          <span className="flex items-center gap-2.5">
            <i className="grid size-6 place-items-center rounded-[5px] bg-[#edf2ee] font-mono text-[8px] not-italic text-[#5d7165]">
              {index + 1}
            </i>
            <span className="grid gap-0.5">
              <strong className="text-[10px] text-[#3d423c]">
                {item.name}
              </strong>
              <small className="text-[8px] text-[#9a9d97]">{item.code}</small>
            </span>
          </span>
          <span>{item.units.toLocaleString()}</span>
          <strong className="font-mono text-[9px] text-[#3d423c]">
            {money(item.revenue)}
          </strong>
          <span>{ratio(item.revenue / total)}</span>
        </div>
      ))}
    </div>
  );
}
