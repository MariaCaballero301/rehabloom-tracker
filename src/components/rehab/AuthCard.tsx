import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Plant } from "./Plant";

export function AuthCard() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (!r.error) return;
    // The sign-in window can report an error even when the session was set, so trust the session.
    const { data } = await supabase.auth.getSession();
    if (!data.session) toast.error("Google sign-in didn't finish. Please try again.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="glass w-full max-w-sm p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Plant stage={3} />
          <h1 className="mt-2 text-3xl text-primary">Rehabloom</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stick with the exercises your physical therapist prescribed.
          </p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-sm font-semibold">
            Email
            <input className="field mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input className="field mt-1" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "up" ? "new-password" : "current-password"} />
          </label>
          <button className="btn-aqua w-full" disabled={busy}>
            {mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button onClick={google} className="btn-soft mt-3 w-full">Continue with Google</button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "in" ? "New here?" : "Already have an account?"}{" "}
          <button className="font-bold text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
