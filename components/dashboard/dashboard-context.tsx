"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { PeriodOption, Report, RevenueMonth, User } from "@/lib/dashboard";

type DashboardContextValue = {
  user: User | null;
  report: Report | null;
  months: RevenueMonth[];
  periods: PeriodOption[];
  selectedMonth: string;
  ready: boolean;
  loadingPeriod: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadRevenue: (month?: string) => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [months, setMonths] = useState<RevenueMonth[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  const loadRevenue = useCallback(async (month?: string) => {
    setLoadingPeriod(true);
    const response = await fetch(month ? `/api/revenue?month=${encodeURIComponent(month)}` : "/api/revenue");
    if (response.ok) {
      const data = await response.json();
      setMonths(data.months);
      setPeriods(data.periods);
      setSelectedMonth(data.selectedMonth);
      setReport(data.report);
    }
    setLoadingPeriod(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth").then(async (response) => {
      if (!response.ok) return;
      setUser((await response.json()).user);
      await loadRevenue();
    }).finally(() => setReady(true));
  }, [loadRevenue]);

  async function login(nextUser: User) { setUser(nextUser); await loadRevenue(); }
  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null); setMonths([]); setPeriods([]); setSelectedMonth(""); setReport(null);
  }

  return <DashboardContext value={{ user, report, months, periods, selectedMonth, ready, loadingPeriod, login, logout, loadRevenue }}>{children}</DashboardContext>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used inside DashboardProvider");
  return context;
}
