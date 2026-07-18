"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, GoogleLogo, LockKey, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@/lib/dashboard";
import { BrandMark } from "./brand-mark";

const SUPABASE_ENABLED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("baminh.letran@gmail.com");
  const [password, setPassword] = useState("revenue2026");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const response = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    setLoading(false);
    if (response.ok) onLogin((await response.json()).user);
    else setError("This account is not on the allowlist, or the password is incorrect.");
  }

  async function signInWithGoogle() {
    const supabase = createBrowserSupabaseClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
    if (oauthError) setError(oauthError.message);
  }

  return <main className="login-shell">
    <section className="login-story" aria-label="Product introduction">
      <div className="brand brand-light"><BrandMark /> Ledgerly</div>
      <div className="story-copy"><p className="eyebrow">Private finance workspace</p><h1>Monthly files in.<br />Clear decisions out.</h1><p>One private view for revenue, profit, margins, and every source file behind the numbers.</p></div>
    </section>
    <section className="login-panel"><div className="login-card">
      <div className="mobile-brand brand"><BrandMark /> Ledgerly</div>
      <div className="login-heading"><span className="icon-well"><LockKey size={20} weight="bold" /></span><h2>Welcome back</h2><p>Sign in with an approved team account.</p></div>
      <button className={SUPABASE_ENABLED ? "google-button" : "google-disabled"} type="button" disabled={!SUPABASE_ENABLED} onClick={signInWithGoogle}><GoogleLogo size={19} weight="bold" /> Continue with Google {!SUPABASE_ENABLED && <span>Setup required</span>}</button>
      {!SUPABASE_ENABLED && <><div className="form-separator"><span>Demo access</span></div><form onSubmit={submit}>
        <label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
        {error && <div className="form-error" role="alert"><WarningCircle size={18} weight="fill" /> {error}</div>}
        <button className="primary-button" type="submit" disabled={loading}>{loading ? <><SpinnerGap className="spin" size={18} /> Signing in</> : <>Sign in <ArrowRight size={18} weight="bold" /></>}</button>
      </form></>}
    </div></section>
  </main>;
}
