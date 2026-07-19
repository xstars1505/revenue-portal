"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  GoogleLogo,
  LockKey,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";

const SUPABASE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("baminh.letran@gmail.com");
  const [password, setPassword] = useState("revenue2026");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (response.ok) onLogin((await response.json()).user);
    else
      setError(
        "This account is not on the allowlist, or the password is incorrect.",
      );
  }

  async function signInWithGoogle() {
    const supabase = createBrowserSupabaseClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <main className="grid min-h-dvh grid-cols-[minmax(420px,0.95fr)_minmax(480px,1.05fr)] max-[760px]:grid-cols-1">
      <section
        className="relative flex flex-col justify-between overflow-hidden bg-[#1f2d28] px-14 py-12 text-[#f8f8f3] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] before:bg-[length:52px_52px] before:opacity-12 before:content-[''] after:absolute after:right-[-180px] after:bottom-[12%] after:size-[420px] after:rounded-full after:border-[90px] after:border-[rgba(188,219,197,0.12)] after:content-[''] [&>*]:relative [&>*]:z-1 max-[760px]:hidden"
        aria-label="Product introduction"
      >
        <div className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.03em] [&>span]:bg-[#d9eadf] [&>span]:text-[#203029]">
          <BrandMark /> Ledgerly
        </div>
        <div className="max-w-[590px]">
          <p className="mb-[22px] font-mono text-xs tracking-[0.12em] text-[#bdd0c4] uppercase">
            Private finance workspace
          </p>
          <h1 className="max-w-[650px] text-[clamp(46px,5.4vw,76px)] leading-[0.99] tracking-[-0.065em]">
            Monthly files in.
            <br />
            Clear decisions out.
          </h1>
          <p className="mt-7 max-w-[510px] text-lg leading-[1.65] text-[#c9d4ce]">
            One private view for revenue, profit, margins, and every source file
            behind the numbers.
          </p>
        </div>
      </section>
      <section className="grid place-items-center bg-[#fbfbf9] p-10 max-[760px]:min-h-dvh max-[760px]:px-5 max-[760px]:py-7">
        <div className="w-[min(100%,420px)]">
          <div className="mb-12 hidden items-center gap-2.5 text-lg font-bold tracking-[-0.03em] max-[760px]:flex">
            <BrandMark /> Ledgerly
          </div>
          <div className="mb-[30px]">
            <span className="grid size-10 place-items-center rounded-[9px] border border-[#e6e7e1] bg-[#f4f6f3] text-[#3e5c50]">
              <LockKey size={20} weight="bold" />
            </span>
            <h2 className="mt-[22px] mb-2 text-[31px] tracking-[-0.045em]">
              Welcome back
            </h2>
            <p className="leading-[1.6] text-[#777b73]">
              Sign in with an approved team account.
            </p>
          </div>
          <button
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2.5 rounded-[7px] border",
              SUPABASE_ENABLED
                ? "border-[#d9dbd5] bg-white font-semibold text-[#30342f] transition-[background,transform] duration-150 hover:bg-[#f6f6f2] active:scale-[0.98]"
                : "border-[#e6e7e1] bg-[#f7f7f4] text-[#62665f]",
            )}
            type="button"
            disabled={!SUPABASE_ENABLED}
            onClick={signInWithGoogle}
          >
            <GoogleLogo size={19} weight="bold" /> Continue with Google{" "}
            {!SUPABASE_ENABLED && (
              <span className="ml-auto rounded bg-[#eaeae6] px-1.5 py-[3px] text-[10px] tracking-[0.06em] text-[#7f817b] uppercase">
                Setup required
              </span>
            )}
          </button>
          {!SUPABASE_ENABLED && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-[#979a94] before:h-px before:flex-1 before:bg-[#e6e7e1] before:content-[''] after:h-px after:flex-1 after:bg-[#e6e7e1] after:content-['']">
                <span>Demo access</span>
              </div>
              <form className="grid gap-[18px]" onSubmit={submit}>
                <label className="grid gap-2 text-[13px] font-semibold text-[#3d403a]">
                  Work email
                  <input
                    className="h-[46px] w-full rounded-[7px] border border-[#dfe0da] bg-white px-[13px] text-[#20231f] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(29,92,67,0.22)]"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label className="grid gap-2 text-[13px] font-semibold text-[#3d403a]">
                  Password
                  <input
                    className="h-[46px] w-full rounded-[7px] border border-[#dfe0da] bg-white px-[13px] text-[#20231f] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(29,92,67,0.22)]"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                {error && (
                  <div
                    className="flex items-center gap-2 rounded-[7px] bg-[#fdeceb] px-3 py-[11px] text-[13px] text-[#8c3935]"
                    role="alert"
                  >
                    <WarningCircle size={18} weight="fill" /> {error}
                  </div>
                )}
                <button
                  className="inline-flex min-h-[46px] items-center justify-center gap-[9px] rounded-[7px] bg-[#20231f] font-semibold text-white transition-[background,transform] duration-150 hover:bg-[#343832] active:scale-[0.98]"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <SpinnerGap className="animate-spin" size={18} /> Signing
                      in
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight size={18} weight="bold" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
