import type { ReactNode } from "react";
import { DashboardProvider } from "@/components/dashboard/dashboard-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardProvider><DashboardShell>{children}</DashboardShell></DashboardProvider>;
}
