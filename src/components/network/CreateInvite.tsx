import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { rpc } from "./useNetwork";
import { INVITE_COPY } from "@/lib/network-copy";

/** Format an invite code for display: WXYZ2345 → WXYZ-2345. */
export function formatCode(code: string): string {
  const clean = code.replace(/-/g, "").toUpperCase();
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

/**
 * Permanent invite code bar. The code never expires and is never used up:
 * the first visit creates it and every later visit shows the same one
 * (the database returns the existing code instead of making a new one).
 */
export function CreateInvite({
  code,
  onChange,
  className,
}: {
  code: string | null;
  onChange: () => void;
  className?: string;
}) {
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const shown = code ?? created;

  useEffect(() => {
    if (code) return;
    let alive = true;
    rpc<string>("create_invite_code", { p_relationship: "family" })
      .then((c) => {
        if (alive) setCreated(c);
        onChange();
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Could not load your code.");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function copy() {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(INVITE_COPY(shown));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy didn't work — press and hold the code to copy it.");
    }
  }

  return (
    <div className={cn("mt-3", className)}>
      {shown ? (
        <div className="invite-bar invite-bar-live">
          <span className="invite-bar-label">Your code</span>
          <span className="invite-bar-code">{formatCode(shown)}</span>
          <button type="button" className="buddy-icon-btn" onClick={() => void copy()} title="Copy code">
            {copied ? "✓" : "📋"}
          </button>
        </div>
      ) : (
        <div className="invite-bar">
          <span className="text-xs text-slate-500">{error ? "Couldn't load your code" : "Loading your code…"}</span>
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

/** Redeem someone's invite code. Returns the outcome text to display. */
export async function redeemCode(code: string): Promise<string> {
  return rpc<string>("redeem_invite_code", { p_code: code.trim().replace(/-/g, "").toUpperCase() });
}
