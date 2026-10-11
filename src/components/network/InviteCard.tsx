import { useState } from "react";
import { CreateInvite, ShareInviteButton, redeemCode } from "./CreateInvite";
import { PendingInviteRedeemer } from "./PendingInvite";
import type { InviteCode } from "./useNetwork";
import { isInviteActive } from "@/lib/network";

export function InviteCard({
  invites,
  initialCode = "",
  onChange,
}: {
  invites: InviteCode[];
  initialCode?: string;
  onChange: () => void;
}) {
  // The permanent code (one per account) — created on first visit, so take
  // the newest invite; there is at most one now that codes never expire.
  const permanent = invites.filter((i) => isInviteActive(i)).sort((a, b) => (a.id < b.id ? 1 : -1))[0] ?? null;

  return (
    <section className="glass p-5 sm:p-6" aria-labelledby="invite-h">
      <h2 id="invite-h" className="text-xl">Invite family & friends</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Share your code with someone you trust — they can redeem it after signing up.
      </p>
      <CreateInvite code={permanent?.code ?? null} onChange={onChange} />
      {permanent && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ShareInviteButton code={permanent.code} />
          <p className="text-xs text-muted-foreground">Your code never expires — share it anytime.</p>
        </div>
      )}
      <PendingInviteRedeemer />

      <RedeemCodeForm initialCode={initialCode} onChange={onChange} />
    </section>
  );
}

export function RedeemCodeForm({ initialCode = "", onChange, standalone = false }: { initialCode?: string; onChange: () => void; standalone?: boolean }) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true); setError(""); setResult("");
    try {
      const name = await redeemCode(code);
      setResult(name); setCode(""); onChange();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "That code didn't work.");
    } finally { setBusy(false); }
  }
  return (
      <form onSubmit={onRedeem} className={standalone ? "glass p-5 sm:p-6" : "mt-5 border-t border-border pt-4"}>
        <label className="text-xs font-semibold text-foreground" htmlFor="redeem-code">
          Got a code from someone?
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="redeem-code"
            className="field flex-1"
            placeholder="ABCD-EFGH"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button className="btn-aqua" type="submit" disabled={busy || !code.trim()}>
            {busy ? "…" : "Join"}
          </button>
        </div>
        {result && <p className="mt-2 text-sm font-semibold text-success">{result}</p>}
        {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
      </form>
  );
}
