import { addDays, endOfMonth, format, parseISO, startOfWeek } from "date-fns";

export type SummaryPeriod = "monthly" | "weekly";

export function summaryRange(period: SummaryPeriod, date: string) {
  const valid = period === "monthly" ? /^\d{4}-(0[1-9]|1[0-2])$/.test(date) : /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!valid) throw new Error("Choose a valid report date.");
  const parsed = parseISO(period === "monthly" ? `${date}-01` : date);
  if (Number.isNaN(parsed.getTime()) || format(parsed, period === "monthly" ? "yyyy-MM" : "yyyy-MM-dd") !== date) {
    throw new Error("Choose a valid report date.");
  }
  const from = period === "weekly" ? startOfWeek(parsed, { weekStartsOn: 1 }) : parsed;
  const to = period === "weekly" ? addDays(from, 6) : endOfMonth(from);
  return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
}

export function summaryPeriodLabel(period: SummaryPeriod, date: string) {
  const range = summaryRange(period, date);
  if (period === "monthly") return format(parseISO(range.from), "MMMM yyyy");
  return `Week of ${format(parseISO(range.from), "MMM d")} – ${format(parseISO(range.to), "MMM d, yyyy")}`;
}