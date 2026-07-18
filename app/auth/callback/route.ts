import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGoogleUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;
  if (!code) return NextResponse.redirect(`${origin}/?error=oauth`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/?error=oauth`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isGoogleUser(user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=google_required`);
  }

  const { data: invite } = await supabase.from("revenue_invited_users").select("email").eq("active", true).maybeSingle();
  if (!invite) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=not_invited`);
  }
  return NextResponse.redirect(origin);
}
