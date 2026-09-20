"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

/**
 * Email + password auth via Supabase (browser client, anon key only).
 *
 * The redirect target arrives as a prop. Reading it here with useSearchParams()
 * would opt the component out of server rendering, and a sign-in page whose
 * form only exists after JavaScript loads is not a sign-in page. The pages read
 * ?next= on the server and hand it down.
 */
export function AuthForm({ mode, nextPath = "/dashboard" }: { mode: "login" | "signup"; nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setInfo(null); setBusy(true);
    const supabase = createClient();
    if (!supabase) { setError("Supabase is not configured."); setBusy(false); return; }
    if (mode === "signup") {
      // The confirmation link should bring people back to this site, not to the
      // Supabase project's default Site URL. The origin is read at click time so
      // the same code serves localhost, previews and production.
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/login?confirmed=1` } });
      if (error) setError(error.message); else setInfo("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else { router.push(nextPath); router.refresh(); }
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
