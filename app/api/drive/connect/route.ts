import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/lib/auth";
import { authorizeRevenueUser } from "@/lib/authorization";
import { createDriveState, driveAuthorizationUrl } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  const authorized = await authorizeRevenueUser(["admin"]);
  if (!authorized)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.redirect(
    driveAuthorizationUrl(
      appOrigin(request.url),
      createDriveState(authorized.user.id),
    ),
  );
}
