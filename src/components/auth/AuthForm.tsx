"use client";
import { Suspense } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

/** Email + password auth via Supabase (browser client, anon key only). */
function AuthFormInner({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setInfo(null); setBusy(true);
    const supabase = createClient();
    if (!supabase) { setError("Supabase is not configured."); setBusy(false); return; }
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) setError(error.message); else setInfo("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else { router.push(params.get("next") ?? "/dashboard"); router.refresh(); }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your Solink account"}</h1>
        <p className="mt-1 text-[14px] text-fg-secondary">{mode === "login" ? "Sign in to your solar dashboard." : "Start your solar journey."}</p>
      </div>
      {mode === "signup" && <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></Field>}
      <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></Field>
      <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></Field>
      {error && <p role="alert" className="rounded-md bg-critical-soft px-3 py-2 text-[13px] text-critical-fg">{error}</p>}
      {info && <p className="rounded-md bg-good-soft px-3 py-2 text-[13px] text-good-fg">{info}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
      <p className="text-center text-[13px] text-fg-muted">
        {mode === "login" ? <>No account? <Link href="/signup" className="text-fg underline underline-offset-2">Create one</Link></> : <>Already have an account? <Link href="/login" className="text-fg underline underline-offset-2">Sign in</Link></>}
      </p>
    </form>
  );
}

/**
 * useSearchParams() opts a client component out of static prerendering, and
 * Next refuses to build a page that does that without a Suspense boundary. The
 * fallback is the same form with the redirect target unknown, which is what a
 * user sees for the few milliseconds before hydration anyway.
 */
export function AuthForm(props: Parameters<typeof AuthFormInner>[0]) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-64 w-full max-w-sm animate-pulse rounded-[var(--radius-lg)] bg-inset" />}>
      <AuthFormInner {...props} />
    </Suspense>
  );
}
