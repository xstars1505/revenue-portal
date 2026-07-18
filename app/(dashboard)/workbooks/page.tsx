"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowClockwise, Check, Files, GoogleLogo, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/dashboard";

type DriveStatus = { connected: boolean; googleEmail: string | null; lastSyncedAt: string | null; sources: { file_name: string; status: string; imported_at: string | null; error_message: string | null }[] };

export default function WorkbooksPage() {
  const { months, user, loadRevenue } = useDashboard();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const canSync = ["admin", "finance", "administrator"].includes(user?.role.toLowerCase() ?? "");
  const isAdmin = ["admin", "administrator"].includes(user?.role.toLowerCase() ?? "");

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/drive/sync");
    if (response.ok) setStatus(await response.json());
  }, []);
  useEffect(() => { void loadStatus(); }, [loadStatus]);

  async function refresh() {
    setSyncing(true); setMessage("");
    const response = await fetch("/api/drive/sync", { method: "POST" });
    const result = await response.json();
    if (response.ok) {
      setMessage(`Imported ${result.imported}; skipped ${result.skipped}; failed ${result.failed}.`);
      await Promise.all([loadStatus(), loadRevenue()]);
    } else setMessage(result.error ?? "Drive sync failed");
    setSyncing(false);
  }

  return <section className="page-section">
    <div className="section-copy workbook-heading"><div><h2>Monthly workbooks</h2><p>Source files used for the current reporting history.</p></div>{status?.connected && canSync && <Button onClick={refresh} disabled={syncing}>{syncing ? <SpinnerGap className="spin" /> : <ArrowClockwise />} {syncing ? "Refreshing" : "Refresh from Drive"}</Button>}</div>
    <div className="folder-card"><div className="folder-icon"><GoogleLogo size={24} weight="bold" /></div><div><strong>Finance / Monthly P&amp;L</strong><span>{status?.connected ? `Connected as ${status.googleEmail}` : "Connect the Google account that can read this folder"}{status?.lastSyncedAt && ` · Last synced ${new Date(status.lastSyncedAt).toLocaleString()}`}</span></div>{status?.connected ? <b><Check size={14} /> Connected</b> : isAdmin ? <Button asChild variant="outline"><a href="/api/drive/connect">Connect Drive</a></Button> : <b>Admin setup required</b>}</div>
    {message && <div className={message.includes("failed 0") ? "sync-message" : "sync-message sync-warning"}>{message}</div>}
    <div className="panel workbook-list">{[...months].reverse().map((month, index) => <div key={`${month.month}-${month.source}`}><span className="file-tile"><Files size={20} weight="fill" /></span><div><strong>{month.source}</strong><span>{month.month} · Central branch</span></div><b>{money(month.revenue, true)}</b><span className={index === 0 ? "status-badge" : "muted-badge"}>{index === 0 ? "Latest" : "Historical"}</span></div>)}</div>
    {status?.sources.some((source) => source.status === "failed") && <div className="security-note"><WarningCircle size={20} weight="fill" /><div><strong>Some workbooks need attention</strong>{status.sources.filter((source) => source.status === "failed").map((source) => <p key={source.file_name}>{source.file_name}: {source.error_message}</p>)}</div></div>}
  </section>;
}
