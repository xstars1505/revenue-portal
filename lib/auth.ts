import type { User } from "@supabase/supabase-js";

export function isGoogleUser(user: User) {
  return (
    user.app_metadata.provider === "google" ||
    user.identities?.some((identity) => identity.provider === "google") === true
  );
}

export function appOrigin(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV === "production")
    throw new Error("NEXT_PUBLIC_APP_URL is missing");
  return new URL(requestUrl).origin;
}
