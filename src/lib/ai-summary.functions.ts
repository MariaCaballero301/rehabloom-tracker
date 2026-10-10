// Monthly progress summary written by Google's Gemini API (direct REST call, key stays on the server).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPrompt, demoStats, GEMINI_MODEL, monthStats } from "@/lib/monthly-report";

export const generateMonthlySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), demo: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("The Gemini API key hasn't been added yet.");
    const sb = context.supabase;
    let stats;
    if (data.demo) stats = demoStats(data.month);
    else {
      const [y, m] = data.month.split("-").map(Number) as [number, number];
      const from = `${data.month}-01`;
      const to = `${data.month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
      const [ex, co, ci, rs] = await Promise.all([
        sb.from("exercises").select("created_at, frequency, occurrences, days, weekly_mode"),
        sb.from("completions").select("day, status").gte("day", from).lte("day", to),
        sb.from("checkins").select("day, pain, motivation, status").gte("day", from).lte("day", to),
        sb.from("rehab_sessions").select("status").gte("starts_at", `${from}T00:00:00Z`).lte("starts_at", `${to}T23:59:59Z`),
      ]);
      stats = monthStats(data.month, ex.data ?? [], co.data ?? [], ci.data ?? [], rs.data ?? []);
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(stats) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
      }),
    });
    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      throw new Error(res.status === 429 ? "Gemini's free limit was reached — try again in a minute." : `Gemini couldn't write the summary (error ${res.status}).`);
    }
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; modelVersion?: string; responseId?: string };
    const summary = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!summary) throw new Error("Gemini returned an empty summary.");
    const model = json.modelVersion ?? GEMINI_MODEL;
    const { data: row, error } = await sb.from("ai_summaries")
      .insert({ user_id: context.userId, month: data.month, is_demo: data.demo, model, summary, stats })
      .select("id, month, is_demo, model, summary, created_at").single();
    if (error) throw new Error(error.message);
    return { ...row, responseId: json.responseId ?? null };
  });
