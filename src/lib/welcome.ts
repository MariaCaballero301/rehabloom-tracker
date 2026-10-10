// Pure helpers for the one-time welcome SMS sent to new support-network contacts.
export const MAX_WELCOMES_PER_DAY = 5;

export function buildWelcomeMessage(contactName: string, patientName: string) {
  return `Hi ${contactName}! ${patientName} added you to their support network on Rehabloom 🌱 If they miss their rehab sessions for a couple of days, we'll text you so you can check in. Reply STOP to opt out.`;
}

/** welcomedTimes: welcomed_at values for this patient's contacts. */
export function canSendWelcome(welcomedTimes: (string | null)[], now = new Date()) {
  const since = now.getTime() - 24 * 60 * 60 * 1000;
  const recent = welcomedTimes.filter((t) => t && new Date(t).getTime() > since).length;
  return recent < MAX_WELCOMES_PER_DAY;
}

export function welcomeToast(name: string, status: "sent" | "simulated") {
  return status === "sent" ? `We sent ${name} a welcome text` : `${name} will get a welcome text`;
}
