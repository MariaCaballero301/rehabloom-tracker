// Pure logic for Rehabloom. XP never depends on pain level — it only rewards
// showing up (completing exercises or checking in honestly, including rest).
export const XP_PER_EXERCISE = 10;
export const XP_PER_CHECKIN = 5;

export function computeXp(completionCount: number, checkinCount: number) {
  return completionCount * XP_PER_EXERCISE + checkinCount * XP_PER_CHECKIN;
}

export const STAGES = [
  { min: 0, name: "Seed" },
  { min: 50, name: "Sprout" },
  { min: 150, name: "Young plant" },
  { min: 300, name: "In bloom" },
] as const;

export function stageFor(xp: number) {
  let i = 0;
  STAGES.forEach((s, idx) => {
    if (xp >= s.min) i = idx;
  });
  const next = STAGES[i + 1];
  return { index: i, name: STAGES[i]!.name, nextAt: next?.min ?? null };
}

export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastNDays(n: number, from = new Date()) {
  const out: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
