# Team page redesign + invite upgrade

**Goal:** Rebuild the Team roster (Carl: "its shit") and upgrade the invite: rename to "Invite to Sero", explain what the member will see, show invite status (sent → opened → joined), and add a reminder.
**Driver:** Carl
**Created:** 2026-07-16

## Done means
- The Team page reads at a glance: identity, one quiet meta line, and access as a clear status pill.
- "Give access" → **"Invite to Sero"**; the popup says plainly **what they'll see** once they log in.
- Invite status is visible: **Not on Sero → Invited → Opened link → On Sero**, with **Remind** on the waiting ones.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The picture | Clickable artifact mock of the redesigned page + both popups | ✅ |
| 2 | Opened-link signal (backend) | `opened_at` column + stamp on the real join-page open ("opened but didn't finish") | 🔨 |
| 3 | Rebuild the page + popups | Per-person invite status on the roster · Team card rebuilt to the mock (status pill + avatar) · "Invite to Sero" + what-they'll-see copy · Remind (reuse resend) | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit 2026-07-16** ("1 build it") — mock at `mock.html`, published + verified (artifact `820104ca`).
**Phase 2 🔨 built 2026-07-16 (the opened-link signal):** new nullable `invitations.opened_at` (migration `0018`), stamped the first time the invitee opens their `/join` link (public preview only — the internal email-compose reuse deliberately doesn't self-mark). Offline proof: tests 22/22, typecheck clean. No screen change (it's the signal).
**Phase 3 🔨 built + verified on screen 2026-07-16 (both apps — team.ts/team-card.ts are shared):** the Team card is rebuilt to the mock — initials avatar, one calm meta line, and access as ONE status pill (Not on Sero / Invited / Opened / On Sero) with its action beside it (Invite / Remind / Change). Roster read now attaches each person's access state (`people.service.accessFor`, from `user_id` + their pending invite). The invite modal is renamed **"Invite to Sero"** with a plain what-they'll-see line; **Remind** resends the pending invite. Offline proof: tests 40/40, typecheck clean. Screenshot-verified live (Carl = Not-on-Sero + Invite, Priya = On-Sero + Change). Invited/Opened pills show once a person has a pending invite (unit-tested).
Note: the card's CSS import + Remind wiring live in `team.ts`, which another session is editing — those bits ride uncommitted (working-tree correct) to avoid sweeping their work; everything else committed.

## Resolved before we start
- **Invite status needs one new signal.** Today Sero records *sent* (invite created) and *accepted* (joined). "Opened the link but didn't finish" isn't recorded — Phase 2 adds an `opened_at` stamp set when someone loads their join page. Statuses only apply to invites sent from that point on (old invites can't know if they were opened).
- Reminder = the resend machinery from the members-page track, surfaced as a per-person "Remind".

## Parked
- Auto-match on invite (from the members-page track) — link an existing-account email instantly.
