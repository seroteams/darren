# Phase 6 — Admin back-buttons (decision phase)

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ DECIDED 2026-07-21 — KEEP
Carl chose to leave the circled "Back" control on the 7 superadmin pages (his 2026-07-15 call). No conversion, no code change. The recap-stacking bug — the real problem — was already fixed on the only two pages that had it (user-detail, guest-runs, Phases done earlier). This phase closes the plan as a no-op.

## Goal
Decide the fate of the circled "Back" control on the 7 superadmin list pages — and, if the decision is yes, convert them to breadcrumbs for full uniformity.

## The decision (Carl's, at the start of this phase)
Seven superadmin pages use the circled `backToPulse()` control — `admin-gate1`, `admin-runs`, `admin-ratings`, `admin-registered`, `admin-feedback`, `admin-error-log`, and the `admin-guest-runs` **list** level. Carl chose that circled control deliberately on 2026-07-15.

- **Keep** — leave them as-is; the recap-stacking bug (the real problem) is already fixed everywhere it existed. This phase closes as a no-op. ⭐ default
- **Convert** — replace the circled "Back" with a `Live pulse › {page}` breadcrumb on all seven, for one uniform nav language. Reverses the 2026-07-15 call.

## Changes (only if "Convert")
- Swap `backToPulse()` for `breadcrumb([{label:"Live pulse", nav:"pulse"}, {label:"{page}"}])` on the 7 pages; wire the "Live pulse" crumb to `ADMIN_PULSE`. Retire the now-unused `backToPulse()` / `.pd-back` styles once nothing references them.

## Not in this phase
- The member app (Phases 2–5) — done by now.

## Done when
- [ ] Carl has made the keep/convert call.
- [ ] If convert: all 7 pages show the breadcrumb; `npm test` green, typecheck clean; screenshots attached.
- [ ] If keep: this file records the decision and the plan closes.

## Test scenarios — for the product owner (only if "Convert")
Breadcrumb: `local > admin (superadmin login) > any Pulse tile`.
1. **Uniform trail** — each drill-down list shows `Live pulse › {page}` instead of the circled Back. Clicking "Live pulse" returns to the hub. ❌ Not OK if any page still shows the old circled control.
