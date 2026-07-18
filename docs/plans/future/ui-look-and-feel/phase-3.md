# Phase 3 — One chip, one button, one motif

**Part of:** [plan.md](plan.md) · **Status:** ✅ GREEN-LIT 2026-07-18 — BUILT 2026-07-17 on Carl's "keep going it's all
good and finish this run" — the defect half needed no eyes; the re-shaping is his to walk.

## ✅ What landed
- **One chip recipe.** Nine families (`um-badge`, `pd-pill`, `el-pill`, `fb-pill`, `fb-verdict`,
  `fb-type`, `cl-badge`, `lib-badge`, `cmp-verdict-tag`) are grouped into the single `.chip` rule in
  `design/base.css`; each file now keeps **only its colours**. Paddings that drifted 1px/2px/5px and
  four families squared at 4px are gone. **CSS-only re-base — no markup touched**, so every class
  name in the stages still works. Deliberately excluded: `.pill` (an interactive tap target —
  shrinking it would hurt mobile) and the mono code chips (`.fp-chip`/`.script-alias`, radius only).
- **Status-dot motif** via `::before` on the *state* pills only (back/once/active/pending/off/
  yes/no/done/doing) — never on label pills (role/source/type); a dot on everything says nothing.
  `currentColor` means each dot matches its own chip, free.
- **One `.seg` segmented control** replacing three builds (`el-filter`'s iOS white-and-shadow,
  `rv-seg`'s squared hairline box, `.ctx-seg`); active segment = accent tint, never a solid blue.
- **Chip defects fixed** (`352296a1`): `cmp-verdict` pass/warn/fail were white on fill-steps
  (~2.2:1); `fp-chip--ok`, `cl-badge--done`, `lib-badge--keep/--block`, `el-pill--warn`,
  `um-badge--off`, `meeting-card__badge`, `cl-tag`, `rv-seg` pass/fail moved onto text-safe ink.
- **One blue action restored:** `.pill.is-selected` (the manager's intake chips) and
  `.prep-timeline__num` were solid-accent-with-white, competing with the real button — both now on
  the accent tint triad.
- **The dot-meter is in all 12 briefing layouts** + `.btn` colour-only hover (earlier).
  J's committed navy band re-grounds the meter on white-alpha via `currentColor`.
- **Guard:** `admin/src/styles/design/chip-system.test.ts` (6 tests) — fails if a family
  re-declares its own geometry, if a chip goes square, if a segment takes a solid blue, or if the
  dot motif spreads onto label pills.

## ⚠️ Not eyeballed by me
Screenshots hang this session, so **the look is Carl's to confirm** — the defect fixes are objective
(measured contrast, house rules), but the re-shaping (rounder, roomier pills; dots on status) is
taste. Free proof only: `build:all` clean, **82/82** across the guards + touched suites.

## Deferred, on purpose
- The **guided flow's** off-system kit (`mcr-btn`/`mcr-chip`/`mcr-owner` at 13px, ~120 hardcoded
  hexes) → **Phase 4**, which already owns "guided flow joins the system". Not P3's to sweep.
- The **wider text-on-fill tail** the audit never listed (`rv-ov__btn`, `tk-*`,
  `run-row__review--done`, `joblex-*`…) → **Phase 6**, the measured contrast pass: each needs a
  text-vs-graphic judgement, since these tokens are sanctioned for fills and graphics.
- Dropdowns onto `.row-menu`, checkbox primitive, shared `ratingChip()` — untouched; low value
  beside the pill unification, and each is its own small refactor.

---

### Original scope

## Goal
Collapse ~15 pill families, 3 segmented controls and 2 dropdown builds into one detail language,
and land the artifact's signature dot-meter — meaning by motif, not fifteen local inventions.

## Changes
- **One `.chip` primitive** (999px, 14px/500, tint-triad variants) in a new `design/pills.css`;
  refit `um-badge`, `pd-pill`, `lp-pill`, `el-pill`, `fb-*`, `arc-chip`, `mcr-chip`…;
  `.chip--dot` leading-dot status motif; fix all non-text-safe chip colours.
- **The confidence dot-meter** `.conf` chip (3 × 6px currentColor dots) wired into all briefing
  layouts + admin briefing (`frontend/src/stages/preparation-brief.ts`, `admin/src/stages/briefing.js`).
- **`.btn` retune:** 15px/600, 10×16 padding, colour-only hover (no lift); `.btn--sm` moved home;
  `.btn--quiet` added; the `--md` fork deleted; disabled-hover scoped off.
- **One-blue-action restored:** selected intake chips → tinted; verdict tags → soft triads;
  timeline numbers → accent-soft numbered medallions.
- **One `.seg` segmented control** (artifact recipe) refitting the 3 builds; dropdowns merged onto
  `.row-menu`; checkbox promoted to primitives; shared `ratingChip()`.

## Not in this phase
- The frame (Phase 4). Off-barrel CSS + alerts (Phase 5).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Seen on the running app: briefing, Pulse, Registered, Error log, Feedback, intake.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Dot-meter** — open a prep briefing. "How sure is this" is a small blue pill with three dots
   (2 of 3 lit = medium), not a bare sentence.
2. **One chip family** — walk Pulse, Registered, Error log, Feedback. Every status pill is the
   same shape/size family, with a tiny coloured dot signalling state.
3. **Buttons behave** — hover any button anywhere: colour changes, nothing jumps or grows a
   shadow. Still exactly one solid-blue action per screen (intake's selected chips no longer
   compete).

## ✅ GREEN-LIT 2026-07-18

Carl walked the whole system ("I've just been through the system and they look fine") and green-lit every built pass in one sweep (goodnight close-out).
