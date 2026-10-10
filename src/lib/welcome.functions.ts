// Sends the one-time welcome SMS to a new support contact. Never blocks adding the contact.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contactPhone } from "@/lib/alerts";
import { buildWelcomeMessage, canSendWelcome } from "@/lib/welcome";

type Welcomed = { contactId: string; name: string; status: "sent" | "simulated" };

export const sendWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ contactId: z.string().uuid().optional(), otherUserId: z.string().uuid().optional(), recent: z.boolean().optional() })
      .refine((v) => v.contactId || v.otherUserId || v.recent)
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<Welcomed[]> => {
    const me = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendSms } = await import("@/lib/notify.server");

    // Rows the caller owns, or connection rows where the caller is one of the two people.
    let q = supabaseAdmin.from("support_contacts").select("*").is("welcomed_at", null);
    q = data.contactId
      ? q.eq("id", data.contactId)
      : data.recent
        ? // Just-redeemed invite: rows where I'm the new contact, created in the last few minutes.
          q.eq("connected_user_id", me).gte("created_at", new Date(Date.now() - 5 * 60_000).toISOString())
        : q.or(
          `and(user_id.eq.${me},connected_user_id.eq.${data.otherUserId}),and(user_id.eq.${data.otherUserId},connected_user_id.eq.${me})`,
        );
    const { data: rows } = await q;
    const results: Welcomed[] = [];

    for (const c of rows ?? []) {
      const allowed =
        c.user_id === me || (c.connected_user_id !== null && c.connected_user_id === me);
      if (!allowed) continue;

      const phones = new Map<string, string>();
      if (c.connected_user_id) {
        const { data: sp } = await supabaseAdmin
          .from("support_profiles")
          .select("phone")
          .eq("user_id", c.connected_user_id)
          .maybeSingle();
        if (sp?.phone) phones.set(c.connected_user_id, sp.phone);
      }
      const phone = contactPhone(c, phones);
      if (!phone) continue;

      const { data: prior } = await supabaseAdmin
        .from("support_contacts")
        .select("welcomed_at")
        .eq("user_id", c.user_id)
        .not("welcomed_at", "is", null);
      if (!canSendWelcome((prior ?? []).map((p) => p.welcomed_at))) continue;

      const { data: patientName } = await supabaseAdmin.rpc("network_display_name", {
        u: c.user_id,
      });
      const res = await sendSms(phone, buildWelcomeMessage(c.name, patientName ?? "Someone"));
      if (res.status === "failed") {
        console.error("[welcome] SMS failed", res.error);
        continue;
      }
      await supabaseAdmin
        .from("support_contacts")
        .update({ welcomed_at: new Date().toISOString() })
        .eq("id", c.id);
      results.push({ contactId: c.id, name: c.name, status: res.status });
    }
    return results;
  });
