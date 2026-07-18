"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLineUp, Files, House, Package, Receipt, SignOut, SpinnerGap, UsersThree } from "@phosphor-icons/react";
import { BrandMark } from "./brand-mark";
import { Login } from "./login";
import { useDashboard } from "./dashboard-context";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

const navigation = [
  { href: "/overview", label: "Overview", Icon: House },
  { href: "/profit-loss", label: "P&L", Icon: ChartLineUp },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/workbooks", label: "Workbooks", Icon: Files },
  { href: "/team", label: "Team", Icon: UsersThree },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, report, periods, selectedMonth, ready, loadingPeriod, login, logout, loadRevenue } = useDashboard();
  if (!ready || (user && !report)) return <main className="loading-page"><BrandMark /><SpinnerGap className="spin" size={22} /><span>Loading finance workspace</span></main>;
  if (!user || !report) return <Login onLogin={login} />;

  const current = navigation.find((item) => item.href === pathname) ?? navigation[0];
  const periodName = report.period.split(" ")[0];
  const selectedPeriod = periods.find((period) => period.value === selectedMonth) ?? null;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><BrandMark /> Ledgerly</div>
      <nav aria-label="Main navigation">{navigation.filter((item) => item.href !== "/team" || user.role === "admin").map(({ href, label, Icon }) => {
        const active = pathname === href;
        return <Link href={href} key={href} className={active ? "active" : ""}><Icon size={19} weight={active ? "fill" : "regular"} />{label}</Link>;
      })}</nav>
      <div className="sidebar-spacer" />
      <div className="drive-card"><div className="drive-head"><span><Receipt size={18} weight="fill" /></span><div><strong>{periodName} P&amp;L</strong><small>{report.source}</small></div></div><div className="drive-status"><span /> Workbook mapped</div></div>
      <div className="user-row"><div className="avatar">{user.name.split(" ").map((part) => part[0]).join("")}</div><div><strong>{user.name}</strong><small>{user.role}</small></div><button aria-label="Sign out" onClick={logout}><SignOut size={18} /></button></div>
    </aside>
    <main className="dashboard">
      <header className="topbar"><div><p>Central branch</p><h1>{current.label}</h1></div><div className="period-control"><span>Reporting period</span><Combobox items={periods} value={selectedPeriod} disabled={loadingPeriod} itemToStringValue={(period) => period.label} onValueChange={(period) => { if (period && period.value !== selectedMonth) loadRevenue(period.value); }}><ComboboxInput aria-label="Reporting period" className="period-combobox" placeholder="Search months" showClear={false} /><ComboboxContent align="end" sideOffset={8} className="w-(--anchor-width) min-w-(--anchor-width)"><ComboboxEmpty>No reporting period found.</ComboboxEmpty><ComboboxList>{(period) => <ComboboxItem value={period} key={period.value}>{period.label}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox></div></header>
      {children}
    </main>
  </div>;
}
