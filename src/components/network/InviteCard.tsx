import { useState } from "react";
import { CreateInvite, ShareInviteButton, redeemCode } from "./CreateInvite";
import { PendingInviteRedeemer } from "./PendingInvite";
import type { InviteCode } from "./useNetwork";

export function InviteCard({
  invites,
  initialCode = "",
  onChange,
}: {
  invites: InviteCode[];
  initialCode?: string;
  onChange: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The permanent code (one per account) — created on first visit, so take
  // the newest invite; there is at most one now that codes never expire.
  const permanent = [...invites].sort((a, b) => (a.id < b.id ? 1 : -1))[0] ?? null;

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult("");
    try {
      const name = await redeemCode(code);
      setResult(name);
      setCode("");
      onChange();
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
      <CreateInvite code={permanent?.code ?? null} onChange={onChange} />
      {permanent && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ShareInviteButton code={permanent.code} />
          <p className="text-xs text-slate-500">Your code never expires — share it anytime.</p>
        </div>
      )}
      <PendingInviteRedeemer />

      <form onSubmit={onRedeem} className="mt-5 border-t border-sky-100 pt-4">
        <label className="text-xs font-semibold text-sky-800" htmlFor="redeem-code">
          Got a code from someone?
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="redeem-code"
            className="input-soft flex-1"
            placeholder="ABCD-EFGH"
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
    </div>
  );
}
