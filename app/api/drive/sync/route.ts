import { NextResponse } from "next/server";
import { authorizeRevenueUser } from "@/lib/authorization";
import { syncRevenueFolder } from "@/lib/revenue-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET() {
  if (!(await authorizeRevenueUser()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const [{ data: connection }, { data: sources }] = await Promise.all([
    admin
      .from("revenue_drive_credentials")
      .select("google_email,updated_at")
      .eq("id", true)
      .maybeSingle(),
    admin
      .from("revenue_source_files")
      .select("file_name,status,imported_at,error_message")
      .not("drive_file_id", "is", null)
      .order("modified_at", { ascending: false }),
  ]);
  return NextResponse.json({
    connected: Boolean(connection),
    googleEmail: connection?.google_email ?? null,
    lastSyncedAt:
      sources?.find((source) => source.imported_at)?.imported_at ?? null,
    sources: sources ?? [],
  });
}

export async function POST() {
  if (!(await authorizeRevenueUser(["admin", "finance"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await syncRevenueFolder());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Drive sync failed" },
      { status: 500 },
    );
  }
}
