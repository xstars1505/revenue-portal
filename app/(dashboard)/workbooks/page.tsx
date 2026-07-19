"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwise,
  Check,
  Files,
  GoogleLogo,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/dashboard";

type DriveStatus = {
  connected: boolean;
  googleEmail: string | null;
  lastSyncedAt: string | null;
  sources: {
    file_name: string;
    status: string;
    imported_at: string | null;
    error_message: string | null;
  }[];
};

export default function WorkbooksPage() {
  const { months, user, loadRevenue } = useDashboard();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const canSync = ["admin", "finance", "administrator"].includes(
    user?.role.toLowerCase() ?? "",
  );
  const isAdmin = ["admin", "administrator"].includes(
    user?.role.toLowerCase() ?? "",
  );

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/drive/sync");
    if (response.ok) setStatus(await response.json());
  }, []);
  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function refresh() {
    setSyncing(true);
    setMessage("");
    const response = await fetch("/api/drive/sync", { method: "POST" });
    const result = await response.json();
    if (response.ok) {
      setMessage(
        `Imported ${result.imported}; skipped ${result.skipped}; failed ${result.failed}.`,
      );
      await Promise.all([loadStatus(), loadRevenue()]);
    } else setMessage(result.error ?? "Drive sync failed");
    setSyncing(false);
  }

  return (
    <section className="py-9">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="mb-2 text-2xl tracking-[-0.04em]">
            Monthly workbooks
          </h2>
          <p className="leading-[1.6] text-[#777b73]">
            Source files used for the current reporting history.
          </p>
        </div>
        {status?.connected && canSync && (
          <Button onClick={refresh} disabled={syncing}>
            {syncing ? (
              <SpinnerGap className="animate-spin" />
            ) : (
              <ArrowClockwise />
            )}{" "}
            {syncing ? "Refreshing" : "Refresh from Drive"}
          </Button>
        )}
      </div>
      <div className="mb-3.5 flex items-center gap-[13px] rounded-[10px] border border-[#dce3dc] bg-[#f0f5f0] p-4">
        <div className="grid size-11 place-items-center rounded-lg bg-[#dceade] text-[#3d7054]">
          <GoogleLogo size={24} weight="bold" />
        </div>
        <div className="grid flex-1 gap-[3px]">
          <strong className="text-[13px]">Finance / Monthly P&amp;L</strong>
          <span className="text-[10px] text-[#798079]">
            {status?.connected
              ? `Connected as ${status.googleEmail}`
              : "Connect the Google account that can read this folder"}
            {status?.lastSyncedAt &&
              ` · Last synced ${new Date(status.lastSyncedAt).toLocaleString()}`}
          </span>
        </div>
        {status?.connected ? (
          <b className="flex items-center gap-[5px] text-[10px] text-[#427258]">
            <Check size={14} /> Connected
          </b>
        ) : isAdmin ? (
          <Button asChild variant="outline">
            <a href="/api/drive/connect">Connect Drive</a>
          </Button>
        ) : (
          <b className="flex items-center gap-[5px] text-[10px] text-[#427258]">
            Admin setup required
          </b>
        )}
      </div>
      {message && (
        <div
          className={`mt-[-4px] mb-3.5 rounded-[7px] px-3 py-2.5 text-[10px] ${message.includes("failed 0") ? "bg-[#eaf3ed] text-[#356248]" : "bg-[#f8eae5] text-[#87513e]"}`}
        >
          {message}
        </div>
      )}
      <div className="rounded-[10px] border border-[#e6e7e1] bg-white">
        {[...months].reverse().map((month, index) => (
          <div
            className="grid grid-cols-[34px_1fr_0.5fr_76px] items-center gap-[11px] border-b border-[#e6e7e1] px-[17px] py-3.5 last:border-b-0 max-[760px]:grid-cols-[34px_minmax(0,1fr)_65px] max-[760px]:[&>b]:hidden"
            key={`${month.month}-${month.source}`}
          >
            <span className="grid size-[30px] place-items-center rounded-md bg-[#edf3ee] text-[#4d715d]">
              <Files size={20} weight="fill" />
            </span>
            <div className="grid gap-[3px]">
              <strong className="text-[11px]">{month.source}</strong>
              <span className="text-[9px] text-[#92958f]">
                {month.month} · Central branch
              </span>
            </div>
            <b className="font-mono text-[10px]">
              {money(month.revenue, true)}
            </b>
            <span
              className={`w-fit rounded-full px-1.5 py-1 text-[8px] ${index === 0 ? "bg-[#e9f2ec] font-semibold text-[#3e6d52]" : "bg-[#efefeb] text-[#777b74]"}`}
            >
              {index === 0 ? "Latest" : "Historical"}
            </span>
          </div>
        ))}
      </div>
      {status?.sources.some((source) => source.status === "failed") && (
        <div className="mt-[18px] flex max-w-[640px] gap-[11px] rounded-[9px] border border-[#e6dfcd] bg-[#fbf7e9] p-4 text-[#816d38] [&_p]:mt-1 [&_p]:text-[10px] [&_p]:leading-[1.5] [&_p]:text-[#8f8058] [&_strong]:text-xs">
          <WarningCircle size={20} weight="fill" />
          <div>
            <strong>Some workbooks need attention</strong>
            {status.sources
              .filter((source) => source.status === "failed")
              .map((source) => (
                <p key={source.file_name}>
                  {source.file_name}: {source.error_message}
                </p>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
