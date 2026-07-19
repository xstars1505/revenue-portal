import type { User } from "@supabase/supabase-js";

export function isGoogleUser(user: User) {
  return (
    user.app_metadata.provider === "google" ||
    user.identities?.some((identity) => identity.provider === "google") === true
  );
}
