import type { Report } from "@/lib/dashboard";
import { money, ratio } from "@/lib/dashboard";

export function ProductTable({
  products,
}: {
  products: Report["topProducts"];
}) {
  const total = products.reduce((sum, item) => sum + item.revenue, 0);
  return (
    <div className="product-table">
      <div className="product-row product-header">
        <span>Product</span>
        <span>Units</span>
        <span>Revenue</span>
        <span>Share of top 5</span>
      </div>
      {products.map((item, index) => (
        <div className="product-row" key={item.code}>
          <span className="product-name">
            <i>{index + 1}</i>
            <span>
              <strong>{item.name}</strong>
              <small>{item.code}</small>
            </span>
          </span>
          <span>{item.units.toLocaleString()}</span>
          <strong>{money(item.revenue)}</strong>
          <span>{ratio(item.revenue / total)}</span>
        </div>
      ))}
    </div>
  );
}
