import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession, sessions } from "@/lib/store";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase/config";
import { authorizeRevenueUser } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const cookie = "ledgerly_session";

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured) {
    const authorized = await authorizeRevenueUser();
    if (!authorized) return NextResponse.json({ user: null }, { status: 403 });
    return NextResponse.json({
      user: {
        email: authorized.user.email,
        name: authorized.name,
        role: authorized.role,
      },
    });
  }

  if (!isDemoMode)
    return NextResponse.json(
      { error: "Authentication is not configured" },
      { status: 503 },
    );

  const user = sessions.get(request.cookies.get(cookie)?.value ?? "");
  return user
    ? NextResponse.json({ user })
    : NextResponse.json({ user: null }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured)
    return NextResponse.json({ error: "Use Google sign-in" }, { status: 405 });
  if (!isDemoMode)
    return NextResponse.json(
      { error: "Authentication is not configured" },
      { status: 503 },
    );
  const body = await request.json().catch(() => ({}));
  const user = authenticate(
    String(body.email ?? ""),
    String(body.password ?? ""),
  );
  if (!user)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const response = NextResponse.json({ user });
  response.cookies.set(cookie, createSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }
  if (!isDemoMode)
    return NextResponse.json(
      { error: "Authentication is not configured" },
      { status: 503 },
    );
  const token = request.cookies.get(cookie)?.value;
  if (token) sessions.delete(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
