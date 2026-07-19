"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLineUp,
  Files,
  House,
  Package,
  Receipt,
  SignOut,
  SpinnerGap,
  UsersThree,
} from "@phosphor-icons/react";
import { BrandMark } from "./brand-mark";
import { Login } from "./login";
import { useDashboard } from "./dashboard-context";
import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const navigation = [
  { href: "/overview", label: "Overview", Icon: House },
  { href: "/profit-loss", label: "P&L", Icon: ChartLineUp },
  { href: "/products", label: "Products", Icon: Package },
  { href: "/workbooks", label: "Workbooks", Icon: Files },
  { href: "/team", label: "Team", Icon: UsersThree },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    user,
    report,
    periods,
    selectedMonth,
    ready,
    loadingPeriod,
    login,
    logout,
    loadRevenue,
  } = useDashboard();
  if (!ready || (user && !report))
    return (
      <main className="flex min-h-dvh items-center justify-center gap-2.5 bg-[#f6f6f2] text-xs text-[#777b73] [&>span:first-child]:mr-2">
        <BrandMark />
        <SpinnerGap className="animate-spin" size={22} />
        <span>Loading finance workspace</span>
      </main>
    );
  if (!user || !report) return <Login onLogin={login} />;

  const current =
    navigation.find((item) => item.href === pathname) ?? navigation[0];
  const periodName = report.period.split(" ")[0];
  const selectedPeriod =
    periods.find((period) => period.value === selectedMonth) ?? null;

  return (
    <div className="grid min-h-dvh grid-cols-[238px_minmax(0,1fr)] max-[760px]:block">
      <aside className="sticky top-0 flex h-dvh flex-col border-r border-[#e6e7e1] bg-[#fbfbf8] px-[18px] pt-7 pb-5 max-[760px]:fixed max-[760px]:top-auto max-[760px]:bottom-0 max-[760px]:z-40 max-[760px]:h-16 max-[760px]:w-full max-[760px]:flex-row max-[760px]:items-center max-[760px]:border-t max-[760px]:border-r-0 max-[760px]:px-2.5 max-[760px]:py-[7px]">
        <div className="flex items-center gap-2.5 px-[9px] pb-[30px] text-lg font-bold tracking-[-0.03em] max-[760px]:hidden">
          <BrandMark /> Ledgerly
        </div>
        <nav
          className="grid gap-1 max-[760px]:w-full max-[760px]:grid-cols-[repeat(auto-fit,minmax(0,1fr))] max-[760px]:gap-0.5"
          aria-label="Main navigation"
        >
          {navigation
            .filter((item) => item.href !== "/team" || user.role === "admin")
            .map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  href={href}
                  key={href}
                  className={cn(
                    "flex w-full items-center gap-[11px] rounded-[7px] px-[11px] py-2.5 text-left text-[13px] text-[#747870] no-underline hover:bg-[#f0f1ec] hover:text-[#30342f] max-[760px]:flex-col max-[760px]:justify-center max-[760px]:gap-[3px] max-[760px]:px-0.5 max-[760px]:py-[5px] max-[760px]:text-[8px]",
                    active && "bg-[#e9eee9] font-semibold text-[#263f34]",
                  )}
                >
                  <Icon size={19} weight={active ? "fill" : "regular"} />
                  {label}
                </Link>
              );
            })}
          <button
            className="hidden items-center rounded-[7px] border-0 bg-transparent text-[#747870] max-[760px]:flex max-[760px]:flex-col max-[760px]:justify-center max-[760px]:gap-[3px] max-[760px]:px-0.5 max-[760px]:py-[5px] max-[760px]:text-[8px]"
            onClick={logout}
          >
            <SignOut size={19} />
            Sign out
          </button>
        </nav>
        <div className="flex-1 max-[760px]:hidden" />
        <div className="my-[15px] rounded-[9px] border border-[#e6e7e1] bg-white p-[13px] max-[760px]:hidden">
          <div className="flex items-center gap-[9px]">
            <span className="grid size-[31px] place-items-center rounded-md bg-[#f3f3ef]">
              <Receipt size={18} weight="fill" />
            </span>
            <div className="grid gap-0.5">
              <strong className="text-xs">{periodName} P&amp;L</strong>
              <small className="text-[10px] text-[#8b8e87]">
                {report.source}
              </small>
            </div>
          </div>
          <div className="mt-[13px] mb-2.5 flex items-center gap-[7px] text-[10px] text-[#637068]">
            <span className="size-1.5 rounded-full bg-[#4c8668] shadow-[0_0_0_3px_#e6f1ea]" />{" "}
            Workbook mapped
          </div>
        </div>
        <div className="mt-2 grid grid-cols-[32px_1fr_28px] items-center gap-2 border-t border-[#e6e7e1] px-[5px] pt-[13px] max-[760px]:hidden">
          <div className="grid size-8 place-items-center rounded-[7px] bg-[#dcebe1] text-[10px] font-bold text-[#315442]">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div className="grid min-w-0 gap-0.5">
            <strong className="text-xs">{user.name}</strong>
            <small className="text-[10px] text-[#8b8e87]">{user.role}</small>
          </div>
          <button
            className="grid size-7 place-items-center border-0 bg-transparent text-[#8a8d87]"
            aria-label="Sign out"
            onClick={logout}
          >
            <SignOut size={18} />
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-[34px] pb-12 max-[760px]:px-4 max-[760px]:pb-[82px]">
        <header className="flex h-[88px] items-center justify-between gap-5 border-b border-[#e6e7e1] max-[760px]:h-auto max-[760px]:min-h-[78px]">
          <div>
            <p className="mb-[3px] text-[10px] tracking-[0.08em] text-[#92958f] uppercase">
              Central branch
            </p>
            <h1 className="text-lg tracking-[-0.025em]">{current.label}</h1>
          </div>
          <div className="grid min-w-[150px] gap-0.5 rounded-[7px] border border-[#e6e7e1] bg-white px-2.5 py-[7px] focus-within:border-[#789084] focus-within:shadow-[0_0_0_3px_rgba(120,144,132,0.13)] has-[input:disabled]:cursor-wait has-[input:disabled]:opacity-60 max-[760px]:min-w-[118px]">
            <span className="text-[8px] tracking-[0.08em] text-[#999c96] uppercase">
              Reporting period
            </span>
            <Combobox
              items={periods}
              value={selectedPeriod}
              disabled={loadingPeriod}
              itemToStringValue={(period) => period.label}
              onValueChange={(period) => {
                if (period && period.value !== selectedMonth)
                  loadRevenue(period.value);
              }}
            >
              <ComboboxInput
                aria-label="Reporting period"
                className="h-[21px] w-full rounded-none border-0 bg-transparent shadow-none [&_button]:size-5 [&_button:focus-visible]:shadow-none [&_button:focus-visible]:outline-none [&_input]:h-[21px] [&_input]:w-full [&_input]:rounded-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-[11px] [&_input]:font-bold [&_input]:shadow-none [&_input:focus-visible]:shadow-none [&_input:focus-visible]:outline-none"
                placeholder="Search months"
                showClear={false}
              />
              <ComboboxContent
                align="end"
                sideOffset={8}
                className="w-(--anchor-width) min-w-(--anchor-width)"
              >
                <ComboboxEmpty>No reporting period found.</ComboboxEmpty>
                <ComboboxList>
                  {(period) => (
                    <ComboboxItem value={period} key={period.value}>
                      {period.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
