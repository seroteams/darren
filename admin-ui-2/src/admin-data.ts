// Demo data, typed to the real payload shapes. Timestamps are offsets from load
// time so "2h ago" always reads naturally. Swap this file for shared/api.js calls
// to go live.
import type { AdminData } from "./admin.types.ts";

export const NOW = Date.now();
const m = 60_000, h = 3_600_000, d = 86_400_000;

export const adminData: AdminData = {
  users: [
    { id: "u1", name: "Maya Lindqvist", email: "maya@northwind.se", role: "manager", company: "Northwind", runsThisWeek: 5, runsLastWeek: 3, lastActiveAt: NOW - 25 * m },
    { id: "u2", name: "Jonas Berg", email: "jonas@northwind.se", role: "member", company: "Northwind", runsThisWeek: 2, runsLastWeek: 2, lastActiveAt: NOW - 3 * h },
    { id: "u3", name: "Sara Holm", email: "sara@northwind.se", role: "member", company: "Northwind", runsThisWeek: 0, runsLastWeek: 4, lastActiveAt: NOW - 6 * d },
    { id: "u4", name: "Carl Wender", email: "carl@seroteams.com", role: "admin", company: "Sero", runsThisWeek: 11, runsLastWeek: 9, lastActiveAt: NOW - 4 * m },
    { id: "u5", name: "Priya Anand", email: "priya@brightloop.io", role: "manager", company: "Brightloop", runsThisWeek: 3, runsLastWeek: 0, lastActiveAt: NOW - 90 * m },
    { id: "u6", name: "Tom Ekdahl", email: "tom@brightloop.io", role: "member", company: "Brightloop", runsThisWeek: 0, runsLastWeek: 1, lastActiveAt: NOW - 19 * d },
    { id: "u7", name: "Lena Voss", email: "lena@brightloop.io", role: "member", company: "Brightloop", runsThisWeek: 1, runsLastWeek: 1, lastActiveAt: NOW - 26 * h, deactivated: true },
  ],
  guestRuns: [
    { id: "g1", persona: "Skeptical CTO", meetingType: "Weekly 1:1", stars: 4, createdAt: NOW - 40 * m },
    { id: "g2", persona: "New manager", meetingType: "First 1:1", stars: 5, createdAt: NOW - 5 * h },
    { id: "g3", persona: "Quiet performer", meetingType: "Bi-weekly", stars: null, createdAt: NOW - 9 * h },
    { id: "g4", persona: "Stressed lead", meetingType: "Feels-off check-in", stars: 3, createdAt: NOW - 2 * d },
  ],
  feedback: [
    { id: "f1", from: "Maya Lindqvist", stars: 5, comment: "The prep questions felt like they were written for my actual team.", createdAt: NOW - 2 * h },
    { id: "f2", from: "Priya Anand", stars: 4, comment: "Briefing was spot on. Wish I could reorder the focus points.", createdAt: NOW - 26 * h },
    { id: "f3", from: "Jonas Berg", stars: 2, comment: "It asked about competencies in a feels-off meeting. Felt out of place.", createdAt: NOW - 4 * d },
  ],
  errors: [
    { id: "e1", message: "Run 8f3a: stage 4 timeout after 30s", where: "engine/questioning", count: 3, lastSeenAt: NOW - 55 * m, resolved: false },
    { id: "e2", message: "Password reset email bounced (mailbox full)", where: "api/auth", count: 1, lastSeenAt: NOW - 8 * h, resolved: false },
    { id: "e3", message: "FOCUS_ARC_LEAK gate tripped on bi-weekly run", where: "engine/gates", count: 2, lastSeenAt: NOW - 3 * d, resolved: true },
  ],
};
