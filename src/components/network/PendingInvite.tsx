// Keeps an invite code across sign-up, then redeems it once after the person signs in.
import { useEffect } from "react";
import { toast } from "sonner";
import { isInviteCodeFormat, normalizeInviteCode } from "@/lib/network";
import { rpc } from "./useNetwork";

const KEY = "rehabloom:pending-invite";

export function savePendingInvite(code: string) {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* storage unavailable */
  }
}

function takePendingInvite(): string | null {
  try {
    const code = localStorage.getItem(KEY);
    if (code) localStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}

export function PendingInviteRedeemer() {
  useEffect(() => {
    const raw = takePendingInvite();
    if (!raw) return;
    const code = normalizeInviteCode(raw);
    if (!isInviteCodeFormat(code)) return;
    rpc<string>("redeem_invite_code", { p_code: code })
      .then((name) => toast.success(`You're now part of ${name}'s support network 💚`))
      .catch((e) => toast.error((e as Error).message));
  }, []);
  return null;
}
