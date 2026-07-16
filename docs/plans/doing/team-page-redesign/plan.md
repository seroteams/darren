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
| 2 | Invite plumbing (backend) | `opened_at` link-open tracking · per-person invite status on the roster · reminder | 🔨 |
| 3 | Rebuild the page + popups | Team card + invite/status popups rebuilt to the mock, wired to Phase-2 data, "Invite to Sero" copy + what-they'll-see | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit 2026-07-16** ("1 build it") — mock at `mock.html`, published + verified on screen (artifact `820104ca`). **Phase 2 (backend plumbing) in progress.** Phase 2 has no screen change (it's the data); the visible rebuild is Phase 3, which walks on screen. Picture-first on purpose: rebuilding the real page twice is the expensive mistake.

## Resolved before we start
- **Invite status needs one new signal.** Today Sero records *sent* (invite created) and *accepted* (joined). "Opened the link but didn't finish" isn't recorded — Phase 2 adds an `opened_at` stamp set when someone loads their join page. Statuses only apply to invites sent from that point on (old invites can't know if they were opened).
- Reminder = the resend machinery from the members-page track, surfaced as a per-person "Remind".

## Parked
- Auto-match on invite (from the members-page track) — link an existing-account email instantly.
