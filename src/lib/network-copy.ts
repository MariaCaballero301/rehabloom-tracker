/**
 * User-facing copy for the network feature. Kept as pure functions so the
 * invite flows stay consistent and testable.
 */
export function inviteCopy(code: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://rehabloom-progress-tracker.lovable.app";
  const link = `${origin}/r/${code}`;
  return (
    `Join me on Rehabloom 🌱 — a gentle app that keeps me on track with my ` +
    `physical therapy. Sign up with this link and you'll be part of my support ` +
    `circle: ${link} (or enter code ${code} after signing up)`
  );
}

export const INVITE_COPY = inviteCopy;
