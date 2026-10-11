import { CreateInvite, ShareInviteButton } from "./CreateInvite";
import { useNetwork } from "./useNetwork";
import { useState } from "react";
import { INVITE_COPY } from "@/lib/network-copy";
import { PendingInvite } from "./PendingInvite";

export function InviteCard() {
  const { invites, refresh } = useNetwork();
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The permanent code (one per account) — created on first visit, so take
  // the newest invite; there is at most one now that codes never expire.
  const permanent = [...invites].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult("");
    try {
      const { redeemCode } = await import("./CreateInvite");
      const name = await redeemCode(code);
      setResult(name);
      setCode("");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "That code didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold text-sky-900">Invite family & friends</h3>
      <p className="mt-1 text-xs text-slate-600">
        Share your code with someone you trust — they can redeem it after signing up.
      </p>
      <CreateInvite />
      {permanent && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ShareInviteButton code={permanent.code} />
          <p className="text-xs text-slate-500">
            Your code never expires — share it anytime.
          </p>
        </div>
      )}
      <PendingInvite />

      <form onSubmit={onRedeem} className="mt-5 border-t border-sky-100 pt-4">
        <label className="text-xs font-semibold text-sky-800" htmlFor="redeem-code">
          Got a code from someone?
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="redeem-code"
            className="input-soft flex-1"
            placeholder="e.g. BLOOM-1234"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button className="btn-aqua" type="submit" disabled={busy || !code.trim()}>
            {busy ? "…" : "Join"}
          </button>
        </div>
        {result && <p className="mt-2 text-sm font-semibold text-emerald-700">{result}</p>}
        {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
      </form>
      <p className="sr-only">{INVITE_COPY("")}</p>
    </div>
  );
}
