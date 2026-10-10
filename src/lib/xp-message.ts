// Pure helper: what the swimming fish should show when XP is earned.
// Call sites may pass a longer sentence ("+10 XP — nice work!"), but the fish
// only ever shows the amount, big and bold, so it is readable in ~3 seconds.
export function xpBadgeText(message: string): string {
  const match = /(\d+)\s*XP/i.exec(message);
  return match ? `+${match[1]} XP` : message.trim();
}
