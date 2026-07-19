import { NextResponse, type NextRequest } from "next/server";
import { syncRevenueFolder } from "@/lib/revenue-sync";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await syncRevenueFolder());
  } catch (error) {
    console.error("Scheduled Drive sync failed", error);
    return NextResponse.json({ error: "Drive sync failed" }, { status: 500 });
  }
}
