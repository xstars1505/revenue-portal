import { isGoogleUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function authorizeRevenueUser(
  roles = ["admin", "finance", "viewer"],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isGoogleUser(user)) return null;
  const { data: profile } = await supabase
    .from("revenue_profiles")
    .select("display_name,role,active")
    .eq("user_id", user.id)
    .maybeSingle();
  return profile?.active && roles.includes(profile.role)
    ? {
        user,
        name: profile.display_name,
        role: profile.role,
        supabase,
      }
    : null;
}
