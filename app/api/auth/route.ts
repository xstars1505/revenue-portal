import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession, sessions } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isGoogleUser } from "@/lib/auth";

const cookie = "ledgerly_session";

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isGoogleUser(user)) return NextResponse.json({ user: null }, { status: 401 });
    const { data: profile } = await supabase.from("revenue_profiles").select("display_name, role, active").eq("user_id", user.id).maybeSingle();
    if (!profile?.active) return NextResponse.json({ user: null }, { status: 403 });
    return NextResponse.json({ user: { email: user.email, name: profile.display_name, role: profile.role } });
  }

  const user = sessions.get(request.cookies.get(cookie)?.value ?? "");
  return user ? NextResponse.json({ user }) : NextResponse.json({ user: null }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured) return NextResponse.json({ error: "Use Google sign-in" }, { status: 405 });
  const body = await request.json().catch(() => ({}));
  const user = authenticate(String(body.email ?? ""), String(body.password ?? ""));
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const response = NextResponse.json({ user });
  response.cookies.set(cookie, createSession(user), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }
  const token = request.cookies.get(cookie)?.value;
  if (token) sessions.delete(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
