import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/auth";
import { authorizeRevenueUser } from "@/lib/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roles = new Set(["admin", "finance", "viewer"]);

export async function GET() {
  if (!(await authorizeRevenueUser(["admin"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const [
    { data: invites, error: inviteError },
    { data: profiles, error: profileError },
  ] = await Promise.all([
    admin
      .from("revenue_invited_users")
      .select("email,role,active,invited_at")
      .order("invited_at"),
    admin.from("revenue_profiles").select("email,display_name,active"),
  ]);
  if (inviteError || profileError) {
    console.error("Could not load team members", inviteError ?? profileError);
    return NextResponse.json(
      { error: "Could not load team members" },
      { status: 500 },
    );
  }
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.email.toLowerCase(), profile]),
  );
  return NextResponse.json({
    users: (invites ?? []).map((invite) => ({
      ...invite,
      name:
        names.get(invite.email.toLowerCase())?.display_name ??
        invite.email.split("@")[0],
      joined: names.get(invite.email.toLowerCase())?.active === true,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await authorizeRevenueUser(["admin"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const role = String(body.role ?? "viewer");
  const submittedEmails: unknown[] = Array.isArray(body.emails)
    ? body.emails
    : [];
  const emails = [
    ...new Set(
      submittedEmails
        .map((email) => String(email).trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (
    !roles.has(role) ||
    emails.length === 0 ||
    emails.length > 50 ||
    emails.some((email) => email.length > 254 || !emailPattern.test(email))
  )
    return NextResponse.json(
      { error: "Enter 1–50 valid email addresses and a valid role" },
      { status: 400 },
    );
  const admin = createAdminClient();
  const deliveries = await Promise.all(
    emails.map(async (email) => ({
      email,
      error: (
        await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: appOrigin(request.url),
        })
      ).error,
    })),
  );
  const failed = deliveries.filter(({ error: inviteError }) => inviteError);
  const sent = deliveries
    .filter(({ error: inviteError }) => !inviteError)
    .map(({ email }) => email);
  if (sent.length) {
    const { error } = await admin.rpc("revenue_upsert_invites", {
      invite_emails: sent,
      invite_role: role,
    });
    if (error) {
      console.error("Invitation access setup failed", error);
      return NextResponse.json(
        { error: "Invitation email sent, but access could not be prepared" },
        { status: 500 },
      );
    }
  }
  if (failed.length) {
    const rateLimited = failed.some(
      ({ error: inviteError }) =>
        inviteError!.status === 429 ||
        inviteError!.message.toLowerCase().includes("rate limit"),
    );
    const error = rateLimited
      ? `Supabase's email limit was reached. ${sent.length ? `${sent.length} invitation ${sent.length === 1 ? "was" : "were"} sent; ` : ""}${failed.length} ${failed.length === 1 ? "invitation was" : "invitations were"} not created. Configure custom SMTP or try again after the limit resets.`
      : `${failed.length} invitation ${failed.length === 1 ? "email" : "emails"} could not be sent, so access was not granted.`;
    return NextResponse.json(
      {
        error,
        invited: sent.length,
        sent,
        failed: failed.map(({ email }) => email),
      },
      { status: rateLimited ? 429 : 502 },
    );
  }
  return NextResponse.json({ invited: sent.length });
}

export async function DELETE(request: Request) {
  if (!(await authorizeRevenueUser(["admin"])))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const email =
    new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (email.length > 254 || !emailPattern.test(email))
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  const { error } = await createAdminClient().rpc("revenue_remove_user", {
    target_email: email,
  });
  if (error) {
    console.error("Could not remove team member", error);
    return NextResponse.json(
      { error: "The team member could not be removed" },
      { status: 409 },
    );
  }
  return NextResponse.json({ removed: email });
}
