# Full UI Audit — Sero Web Frontend

**Date:** 2026-05-31  
**Target:** `frontend/client/`  
**Method:** Impeccable `detect` CLI + live browser pass (desktop-primary, 375px sanity check) + code review  
**Deliverable:** Report only (no code changes)

---

## Anti-Patterns Verdict

**Fail (soft):** Not full AI slop, but several recognizable tells.

| Tell | Location | Verdict |
|------|----------|---------|
| Side-stripe accent borders | `design.css` L862 (`.brutal`), L1146 (`.prep-callout`) | Confirmed by `npx impeccable detect` |
| Bounce/elastic easing | `design.css` L306 `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` | Confirmed by detect; used on `.brutal.is-in` |
| Card-heavy stage pattern | Focus points, preparation, questioning, briefing | Domain-appropriate but repetitive |
| Calm blue + Inter | Token system + `@fontsource-variable/inter` | First-order category reflex ("AI workflow tool") partially offset by editorial copy and typeform intake |

**Overall:** A manager would not immediately say "AI made this," but the side-stripe callouts and spring easing are explicit Impeccable bans. The product voice (sentence case, direct manager copy) is a genuine differentiator worth preserving.

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | **2** | Sparse ARIA; native `confirm`/`alert`; confirm modal lacks focus trap and `aria-labelledby` |
| 2 | Performance | **3** | Lazy stage imports, reduced-motion gates; orb/axis animations are reasonable |
| 3 | Theming | **2** | Strong `--sero-*` tokens but hex-based, `#ffffff` neutrals, hard-coded dev/run-log colors |
| 4 | Responsive Design | **2** | Notes panel fixed 400px; topbar truncates; mobile 375px hides main content entirely |
| 5 | Anti-Patterns | **2** | Side-stripe borders + bounce easing confirmed by automated scan |
| **Total** | | **11/20** | **Acceptable — significant work needed** |

---

## Design Health Score (Nielsen Heuristics)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 3 | Orb + thinking labels work; topbar truncates "Evaluation"; no ETA on SSE stages |
| 2 | Match system / real world | 3 | Manager-native copy, meeting-type cards, axis explainer |
| 3 | User control and freedom | 2 | One-way flow is intentional but "Save and exit" in questioning jumps to briefing with vague confirm |
| 4 | Consistency and standards | 2 | Three dialog systems: custom modal, native confirm, native alert |
| 5 | Error prevention | 2 | Enter key confirms destructive custom modal; inconsistent delete copy |
| 6 | Recognition rather than recall | 3 | Notes panel context line, pipeline changelog, `.kbd` hints |
| 7 | Flexibility and efficiency | 3 | Keyboard nav on Start/intake/questioning; `shortcuts.js` never wired |
| 8 | Aesthetic and minimalist design | 3 | Typeform intake is focused; briefing is dense; notes rail competes for width |
| 9 | Error recovery | 3 | Dedicated error stage with retry/restart |
| 10 | Help and documentation | 2 | Inline hints only; pipeline changelog is dev-facing noise for most managers |
| **Total** | | **26/40** | **Good (typical production range)** |

**Cognitive load:** 3 checklist failures — (1) meeting-type grid often exceeds 4 options, (2) pipeline changelog on Start adds pre-run complexity, (3) briefing packs many sections without progressive disclosure.

---

## Executive Summary

| Severity | Count |
|----------|-------|
| P0 | 1 |
| P1 | 6 |
| P2 | 8 |
| P3 | 5 |

**Audit Health:** 11/20 (Acceptable)  
**Design Health:** 26/40 (Good)

### Top 5 Critical Findings

1. **[P0] Rehydrated BRIEFING session renders blank main stage** — `#root` empty while notes panel and topbar load (verified with session `2026_May17_12-53-1aea8fb9`; API returns `stage: "BRIEFING"` and briefing payload).
2. **[P1] Notes panel consumes main content on narrow viewports** — At 375px width, questioning UI is fully obscured; at 1280px desktop, question card text truncates beside 400px rail.
3. **[P1] Inconsistent dialog strategy** — Custom `confirm.js` vs native `confirm()` (topbar delete, start delete) vs `alert()` (resume/delete failures).
4. **[P1] Confirm modal accessibility gaps** — No `aria-labelledby`, no focus trap, Enter always confirms (risky for destructive flows).
5. **[P1] Lexicon review rows unstyled** — `.lex-row` classes in `lexicon-review.js` have zero CSS definitions in `design.css`.

---

## Detailed Findings

### P0 — Blocking

**[P0] Blank stage on BRIEFING rehydrate**
- **Location:** `main.js` boot/rehydrate → `stages/briefing.js` mount chain
- **Category:** Accessibility / UX
- **Impact:** Manager returning to a saved briefing sees an empty white column; only notes panel content is visible. Task completion (read briefing, copy actions, complete 1:1) is blocked.
- **Evidence:** Live browser — `document.getElementById('root').innerHTML.length === 0` after reload with `localStorage.seroSessionId = '2026_May17_12-53-1aea8fb9'`; `/api/session?s=…` returns 200 with `stage: "BRIEFING"`.
- **Recommendation:** Trace `renderStage(BRIEFING)` on rehydrate; verify `store.briefing` is populated before mount guard; add error boundary logging.
- **Suggested command:** `impeccable harden`

---

### P1 — Major

**[P1] Mixed dialog patterns**
- **Location:** `ui/confirm.js`, `ui/session-topbar.js` L89, `stages/start.js` L133–142, `stages/questioning.js` L61–74
- **Category:** Consistency / Accessibility
- **Impact:** Focus management breaks; native dialogs look off-brand; screen reader experience inconsistent.
- **Recommendation:** Route all confirms/alerts through `confirm.js`; add danger variant with explicit consequence copy.
- **Suggested command:** `impeccable harden`

**[P1] Confirm modal a11y and keyboard safety**
- **Location:** `ui/confirm.js` L1–54
- **Category:** Accessibility
- **Impact:** Tab can escape modal; no accessible name beyond message text; Enter confirms even for "Start over" / delete-adjacent flows.
- **WCAG:** 2.4.3 Focus Order, 4.1.2 Name Role Value
- **Recommendation:** Add `aria-labelledby`, focus trap, default focus on cancel for destructive actions, distinct `confirmLabel` for delete flows.
- **Suggested command:** `impeccable harden`

**[P1] Lexicon review unstyled**
- **Location:** `stages/lexicon-review.js` L59–68; missing rules in `design.css`
- **Category:** Anti-pattern / Layout
- **Impact:** Keep/Drop rows render as unstyled stacked content inside a card; breaks visual hierarchy at end of run.
- **Recommendation:** Add `.lex-row` grid styles (number, phrase, actions) matching focus-point row rhythm.
- **Suggested command:** `impeccable layout`

**[P1] Notes panel fixed width without collapse**
- **Location:** `design.css` L1288–1450 — `--notes-panel-w: 400px`, `body.has-notes-panel { padding-right: 400px }`
- **Category:** Responsive
- **Impact:** Desktop 1280px: main questioning card truncated (verified live). Mobile 375px: main stage not visible at all.
- **Recommendation:** Collapse to bottom sheet or toggle below `max-width: 1024px`; reduce width to 320px on medium desktops.
- **Suggested command:** `impeccable adapt`

**[P1] Session topbar stage overflow**
- **Location:** `ui/session-topbar.js`, `design.css` `.session-topbar__stages`
- **Category:** Responsive / Visibility of status
- **Impact:** "Evaluation" truncates to "E…" on typical widths (verified live).
- **Recommendation:** Abbreviated labels, horizontal scroll with fade, or current+next only.
- **Suggested command:** `impeccable adapt`

**[P1] Vague destructive confirm copy**
- **Location:** `questioning.js` L62–69, `focus-points.js` L26, `preparation.js` L27, `intake.js` L55 — `"Are you sure?"` vs explicit delete copy in topbar
- **Category:** UX copy / Error prevention
- **Impact:** Manager may not understand "Save and exit" skips remaining questions and jumps to briefing.
- **Recommendation:** Specific messages per action with consequences.
- **Suggested command:** `impeccable clarify`

---

### P2 — Minor

**[P2] Side-stripe borders (Impeccable ban)**
- **Location:** `design.css` L862 `.brutal`, L1146 `.prep-callout`
- **Category:** Anti-pattern
- **Recommendation:** Full border, background tint, or leading icon/number instead of 3px left accent.

**[P2] Bounce easing token**
- **Location:** `design.css` L306 `--ease-spring`
- **Category:** Anti-pattern / Motion
- **Recommendation:** Replace with `--ease-out-expo` for `.brutal.is-in` scale transition.

**[P2] Questioning textarea label**
- **Location:** `questioning.js` L96 — placeholder only
- **Category:** Accessibility
- **Note:** Accessibility tree exposes name via placeholder, but visible `<label>` or `aria-label` is more robust.

**[P2] Start popover missing ARIA**
- **Location:** `session-topbar.js` L50–79
- **Category:** Accessibility
- **Recommendation:** `aria-expanded`, `aria-haspopup="menu"`, `role="menu"` on popover.

**[P2] Axis bars hidden from assistive tech**
- **Location:** `axes.js` L71 — `aria-hidden="true"` on track; value announced but not bar semantics
- **Category:** Accessibility
- **Recommendation:** `role="meter"` with `aria-valuenow/min/max` or visible text summary.

**[P2] Notes empty state encoding corruption**
- **Location:** `notes-list.js` L25 — `�` characters instead of em dash in "paragraphs welcome"
- **Category:** UX copy / i18n
- **Recommendation:** Fix source encoding; use ASCII punctuation.

**[P2] Pipeline changelog on Start**
- **Location:** `stages/start.js`, `ui/pipeline-changelog.js`
- **Category:** Cognitive load
- **Impact:** 18-change warning with expandable file lists intimidates non-dev managers before they start.
- **Recommendation:** Collapse by default further or hide behind dev flag.

**[P2] Briefing information density**
- **Location:** `stages/briefing.js`, `design.css` `.briefing-*`
- **Category:** Layout / Cognitive load
- **Impact:** Hero, bullets, prose, axes, brutal truths, actions, reminders, run cost, run debrief — long scroll.
- **Recommendation:** Progressive disclosure for run debrief (dev-only) and secondary sections.

---

### P3 — Polish

**[P3] Dead shortcuts overlay**
- **Location:** `ui/shortcuts.js` — exported but never imported
- **Recommendation:** Wire to `?` key or remove.

**[P3] Hard-coded colors outside tokens**
- **Location:** `dev-badge.js` inline styles; `design.css` L1806 `.run-log__commands { color: #e2e8f0 }`
- **Recommendation:** Map to semantic tokens.

**[P3] Pure white in token ramp**
- **Location:** `design.css` `--sero-soft-50: #ffffff`
- **Recommendation:** Tint toward brand hue per Impeccable color law.

**[P3] No DESIGN.md / PRODUCT.md**
- **Impact:** Design intent inferred from code only.
- **Recommendation:** `impeccable document` + `impeccable teach`.

**[P3] Impeccable live detector unavailable**
- **Note:** `npx impeccable live --port=9876` exited with "cannot access live" on this environment. CLI detect still ran successfully.

---

## Automated Detection (Impeccable CLI)

```json
[
  { "antipattern": "side-tab", "file": "design.css", "line": 862 },
  { "antipattern": "side-tab", "file": "design.css", "line": 1146 },
  { "antipattern": "bounce-easing", "file": "design.css", "line": 306 }
]
```

All three verified as true positives (not false positives).

---

## Persona Red Flags

**Alex (power user, desktop)**
- Keyboard hints on Start/intake/questioning are helpful, but `shortcuts.js` overlay is never mounted — no discoverable shortcut reference.
- Pipeline changelog keyboard targets (Expand all, Copy) add noise without manager value.
- Cannot click topbar stages to jump back (intentional, but no alternative for power users fixing a mistake except "Start over").

**Jordan (first-timer)**
- Start screen leads with pipeline diff ("18 changes since that run") before "Start new run" — reads as engineering tooling.
- Long SSE stages (focus, prep, bank, eval) show orb only; eval copy helps but others lack time expectation.
- Rehydrated blank briefing screen would feel like the app crashed.

**Sam (time-pressed manager, 10 min before 1:1)**
- Notes panel permanently consumes 400px during live questioning — question text truncates.
- "Save and exit" during questioning uses vague confirm; consequence unclear.
- No progress estimate during AI waits.

---

## Positive Findings (Preserve)

1. **Token system** — Comprehensive `--sero-*` scale in `design.css` with Tailwind bridge; semantic aliases for ink, surface, accent.
2. **Reduced motion** — `prefers-reduced-motion` respected in orb, reveal, axis count-up, and global animation block.
3. **Typeform intake** — One-field-at-a-time via `field.js` swap; meeting-type cards with arrow/number keyboard nav.
4. **Axis explainer copy** — Questioning stage explains bars move on meaning, not length (`questioning.js` L23–25).
5. **Notes panel compose UX** — Enter to save, Shift+Enter newline, inline edit, stage tagging at save time.
6. **Error stage** — Clear retry vs restart with `retryStage` preservation.
7. **Lazy stage loading** — Code-split stage modules in `main.js` keep initial bundle lean.

---

## Systemic Patterns

1. **Dialog fragmentation** — Three patterns across 4+ files; should be one component with variants.
2. **Card as default container** — Works for domain content but creates visual sameness from focus points through briefing.
3. **Fixed chrome without responsive plan** — Topbar + 400px notes rail assume wide desktop; no `@media` rules for notes panel.
4. **Dev UI mixed into manager surfaces** — Pipeline changelog on Start, dev badge in notes header, run debrief on briefing — fine for dev builds but visible in default Start flow.

---

## Live Browser Coverage

| Surface | Inspected | Notes |
|---------|-----------|-------|
| Start | Yes | Screenshot + a11y tree; pipeline changelog expanded |
| Intake (NAME) | Yes | Label association works; step indicator visible |
| Questioning | Yes | Session `2026_May31_23-04-f53638f1`; truncation with notes open |
| Briefing | Partial | Rehydrate bug — blank `#root` |
| Error | Code only | SSE failure paths documented in stage files |
| Mobile 375px | Yes | Main content obscured by notes panel |
| Impeccable live overlay | Skipped | Live server unavailable |

---

## Recommended Actions (Priority Order)

1. **`impeccable harden`** — Fix BRIEFING rehydrate blank stage; unify dialogs; confirm modal a11y + focus trap
2. **`impeccable adapt`** — Notes panel collapse/ toggle; topbar truncation
3. **`impeccable clarify`** — Destructive-action copy ("Save and exit", "Start over", delete flows)
4. **`impeccable layout`** — Lexicon row styles; briefing density / progressive disclosure
5. **`impeccable typeset`** — Side-stripe → alternative emphasis; review heading hierarchy (multiple `.h1` per flow)
6. **`impeccable distill`** — Remove or wire `shortcuts.js`; hide pipeline changelog from default Start
7. **`impeccable document`** — Generate DESIGN.md from existing tokens
8. **`impeccable polish`** — Final pass after fixes
9. **Re-run `impeccable audit`** — Verify score improvement

---

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `impeccable audit` after fixes to see your score improve.
