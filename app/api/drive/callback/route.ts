import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/lib/auth";
import { authorizeRevenueUser } from "@/lib/authorization";
import {
  exchangeDriveCode,
  listDriveFolder,
  saveDriveCredential,
  verifyDriveState,
} from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  const origin = appOrigin(request.url);
  const authorized = await authorizeRevenueUser(["admin"]);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (
    !authorized ||
    !code ||
    !state ||
    !verifyDriveState(state, authorized.user.id)
  )
    return NextResponse.redirect(`${origin}/workbooks?drive=error`);
  try {
    const tokens = await exchangeDriveCode(code, origin);
    if (!tokens.refresh_token)
      throw new Error("Google did not return an offline refresh token");
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID)
      throw new Error("GOOGLE_DRIVE_FOLDER_ID is missing");
    await listDriveFolder(
      tokens.access_token!,
      process.env.GOOGLE_DRIVE_FOLDER_ID,
    );
    await saveDriveCredential(tokens.refresh_token, tokens.access_token!);
    return NextResponse.redirect(`${origin}/workbooks?drive=connected`);
  } catch {
    return NextResponse.redirect(`${origin}/workbooks?drive=error`);
  }
}
