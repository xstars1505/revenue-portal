import { redirect } from "next/navigation";
import { TeamManager } from "@/components/dashboard/team-manager";
import { isGoogleUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isGoogleUser(user)) redirect("/overview");
  const { data: profile } = await supabase.from("revenue_profiles").select("role,active").eq("user_id", user.id).maybeSingle();
  if (!profile?.active || profile.role !== "admin") redirect("/overview");
  return <TeamManager />;
}
