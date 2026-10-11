import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { createInvite } from "@/lib/network";
import { INVITE_COPY } from "@/lib/network-copy";

/**
 * Permanent invite code bar. The code never expires and is never used up:
 * the first visit creates it and every later visit shows the same one.
 */
export function CreateInvite({ className }: { className?: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    createInvite("family")
      .then((c) => {
        if (alive) setCode(c);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Could not load your code.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function copy() {
    if (!code) return;
    const message = INVITE_COPY(code);
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy didn't work — press and hold the code to copy it.");
    }
  }

  return (
    <div className={cn("mt-3", className)}>
      {code ? (
        <div className="invite-bar invite-bar-live">
          <span className="invite-bar-label">Your code</span>
          <span className="invite-bar-code">{code}</span>
          <button type="button" className="buddy-icon-btn" onClick={() => void copy()} title="Copy code">
            {copied ? "✓" : "📋"}
          </button>
        </div>
      ) : (
        <div className="invite-bar">
          <span className="text-xs text-slate-500">{loading ? "Loading your code…" : "No code yet"}</span>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

/** True when this browser exposes the native share sheet. */
export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Share the invite via the native sheet, or copy it when sharing is unavailable. */
export async function shareInvite(code: string): Promise<"shared" | "copied"> {
  const message = INVITE_COPY(code);
  if (canNativeShare()) {
    try {
      await navigator.share({ title: "Rehabloom invite", text: message });
      return "shared";
    } catch {
      // Dismissed sheet or a blocked share (e.g. inside an iframe): fall back to copy.
    }
  }
  await navigator.clipboard.writeText(message);
  return "copied";
}

/** One-tap share/copy button for the permanent code. */
export function ShareInviteButton({ code, disabled }: { code: string | null; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function onShare() {
    if (!code || busy) return;
    setBusy(true);
    setFeedback("");
    setError("");
    try {
      const result = await shareInvite(code);
      if (result === "copied") setFeedback("Copied — paste it anywhere 💌");
    } catch {
      setError("Couldn't share — press and hold the code to copy it.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        className="btn-soft"
        disabled={disabled || busy || !code}
        onClick={() => void onShare()}
      >
        {busy ? "…" : "Share"}
      </button>
      {feedback && <span className="text-xs font-semibold text-emerald-700">{feedback}</span>}
      {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
    </span>
  );
}

/** Small "redeem an invite code" box. Returns the outcome text to display. */
export async function redeemCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_invite_code", { p_code: code.trim() });
  if (error) throw new Error(error.message);
  return data as string;
}
