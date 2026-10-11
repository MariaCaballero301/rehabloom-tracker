import { describe, it, expect } from "vitest";
import { canFinishSession, canJoin, formatWhen, otherPerson, splitSessions, toStartsAt, type RehabSession } from "@/lib/sessions";

const now = new Date(2026, 9, 10, 12, 0); // Sat Oct 10 2026, noon local
const at = (h: number, m = 0, dayOffset = 0) => new Date(2026, 9, 10 + dayOffset, h, m).toISOString();
const s = (over: Partial<RehabSession>): RehabSession => ({
  id: "x", organizer_id: "me", guest_id: "you", organizer_name: "Me", guest_name: "You",
  starts_at: at(18), mode: "video", place: "", note: "", meeting_url: "https://meet.jit.si/r", status: "accepted", ...over,
});

describe("splitSessions", () => {
  it("removes finished calls for both participants without removing other accepted calls", () => {
    const rows = [s({ id: "finished", status: "completed", starts_at: at(11) }), s({ id: "active", starts_at: at(11) })];
    for (const participant of ["me", "you"]) {
      expect(splitSessions(rows, participant, now).upcoming.map((row) => row.id)).toEqual(["active"]);
    }
  });
  it("sorts invites, upcoming and waiting and drops ended sessions", () => {
    const rows = [
      s({ id: "inv", organizer_id: "you", guest_id: "me", status: "proposed" }),
      s({ id: "wait", status: "proposed" }),
      s({ id: "late", starts_at: at(20) }),
      s({ id: "early", starts_at: at(11) }),
      s({ id: "ended", starts_at: at(9, 59) }),
      s({ id: "declined", status: "declined" }),
    ];
    const r = splitSessions(rows, "me", now);
    expect(r.invites.map((x) => x.id)).toEqual(["inv"]);
    expect(r.waiting.map((x) => x.id)).toEqual(["wait"]);
    expect(r.upcoming.map((x) => x.id)).toEqual(["early", "late"]);
  });
});

describe("canFinishSession", () => {
  it("allows an accepted call to finish at its start, but not before or in another status", () => {
    expect(canFinishSession(s({ starts_at: at(12) }), now)).toBe(true);
    expect(canFinishSession(s({ starts_at: at(12, 1) }), now)).toBe(false);
    expect(canFinishSession(s({ starts_at: at(11), status: "proposed" }), now)).toBe(false);
    expect(canFinishSession(s({ starts_at: at(11), status: "completed" }), now)).toBe(false);
  });
});

describe("canJoin", () => {
  it("opens 15 minutes before and closes 2 hours after the start", () => {
    expect(canJoin(s({ starts_at: at(12, 16) }), now)).toBe(false);
    expect(canJoin(s({ starts_at: at(12, 15) }), now)).toBe(true);
    expect(canJoin(s({ starts_at: at(10) }), now)).toBe(true);
    expect(canJoin(s({ starts_at: at(9, 59) }), now)).toBe(false);
  });
  it("never for in-person sessions", () => {
    expect(canJoin(s({ starts_at: at(12), mode: "in_person", meeting_url: "" }), now)).toBe(false);
  });
});

describe("otherPerson", () => {
  it("returns the other side", () => {
    expect(otherPerson(s({}), "me")).toEqual({ id: "you", name: "You" });
    expect(otherPerson(s({}), "you")).toEqual({ id: "me", name: "Me" });
  });
});

describe("formatWhen", () => {
  it("uses Today, Tomorrow or a short date", () => {
    expect(formatWhen(at(18), now)).toBe("Today 6:00 PM");
    expect(formatWhen(at(9, 30, 1), now)).toBe("Tomorrow 9:30 AM");
    expect(formatWhen(at(18, 0, 2), now)).toBe("Mon, Oct 12 · 6:00 PM");
  });
});

describe("toStartsAt", () => {
  it("combines local date and time", () => {
    expect(toStartsAt("2026-10-11", "18:00")).toBe(new Date(2026, 9, 11, 18, 0).toISOString());
  });
  it("rejects bad input", () => {
    expect(toStartsAt("2026-02-30", "18:00")).toBeNull();
    expect(toStartsAt("2026-10-11", "25:00")).toBeNull();
    expect(toStartsAt("", "")).toBeNull();
  });
});

import { buildIcs, inviteLabel, sessionsBadgeCount, startingSoon } from "@/lib/sessions";

describe("sessionsBadgeCount", () => {
  it("adds open alerts, invites for me and shared invites", () => {
    const rows = [
      s({ id: "a", organizer_id: "you", guest_id: "me", status: "proposed" }),
      s({ id: "b", status: "proposed" }), // my own invite: not counted
      s({ id: "c", organizer_id: "you", guest_id: "me", status: "accepted" }),
    ];
    expect(sessionsBadgeCount(2, rows, 1, "me", now)).toBe(4);
  });
});

describe("rescheduled sessions", () => {
  it("show in invites for the new guest only, with the new-time text", () => {
    // After reschedule_rehab_session by "you", you become organizer and "me" the guest.
    const r = s({ id: "r", organizer_id: "you", organizer_name: "You", guest_id: "me", status: "proposed" });
    expect(splitSessions([r], "me", now).invites.map((x) => x.id)).toEqual(["r"]);
    expect(splitSessions([r], "you", now).invites).toEqual([]);
    expect(splitSessions([r], "you", now).waiting.map((x) => x.id)).toEqual(["r"]);
    expect(inviteLabel(r, new Set(["r"]), now)).toBe("You suggested a new time · Today 6:00 PM");
  });
});

describe("buildIcs", () => {
  it("makes a one-hour event with the video link", () => {
    const ics = buildIcs(s({ id: "z", starts_at: "2026-10-10T22:00:00.000Z" }), "me");
    expect(ics).toContain("SUMMARY:Rehab session with You");
    expect(ics).toContain("DTSTART:20261010T220000Z");
    expect(ics).toContain("DTEND:20261010T230000Z");
    expect(ics).toContain("LOCATION:https://meet.jit.si/r");
  });
});

describe("startingSoon", () => {
  it("only accepted sessions within 15 minutes", () => {
    expect(startingSoon([s({ id: "1", starts_at: at(12, 10) }), s({ id: "2", starts_at: at(12, 20) })], now).map((x) => x.id)).toEqual(["1"]);
  });
});
