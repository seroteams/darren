# Carl's findings — Team + Past 1:1s (handed to this track 2026-07-17)

**Carl, 2026-07-17:** *"team page also the past one-ones not very attractive or using a design system."*

Raised while walking the **ux-audit-fixes** track. Carl's call: **this track owns the restyle** — not
ux-audit — because its P1–P3 cores (labels, chips, type) are already built and awaiting his QA, and a
second chat restyling the same surfaces now would fight them and clobber shared files
(`team-card.css`, `person-detail.ts`, `runs.ts`, `admin-tables.css`).

Written as a **standalone file on purpose** — no edits to this track's phase files, so nothing of the
owning session's in-flight work is disturbed. Fold these in wherever they fit (they look like Phase 4
"join the system" + Phase 5 "long-tail sweep" work).

---

## 1. The Past 1:1s list is genuinely outside the design system

**Where:** the person page's "Past 1:1s" list and the Past 1:1s page rows.
**The tell:** `.person-run` / `.person-runs__heading` are defined in
[`admin/src/styles/design/admin-tables.css:258-285`](../../../admin/src/styles/design/admin-tables.css) —
a **tables** stylesheet. The rows are literally table rows: a `border-bottom`, a hover tint, and two ink
colours. No card, no frame, no chip, no avatar, none of the artifact language.

**Why it reads badly (verified against Carl's screenshot):** the person page runs
*framed "Since last time" card* → *big blue "Start 1:1 with X" CTA* → **bare text rows**. The visual
hierarchy falls off a cliff exactly where the history — the thing that's supposed to compound — lives.
The most valuable content on the page is the least designed.

**Suggested direction (this track's call):** bring the rows into the artifact family — a card/frame
treatment, the meeting type in the display face, the date as a quiet meta tier, the rating as the
`.chip`/dot motif rather than a lone star. Same row shape on the person page and Past 1:1s.

## 2. The Team card meta line is overstuffed and wraps — partly my doing

**Where:** `metaLine()` in [`frontend/src/stages/team-card.ts`](../../../frontend/src/stages/team-card.ts).
**Today it renders:** `2 meetings · last 14h ago · prep in progress · ★ 5.0 prep rating` — which wraps
onto a second line at normal desktop width (see Carl's screenshot).

**Honest cause:** ux-audit **X1** (2026-07-17, mine) added the visible words **" prep rating"** to the
star, to satisfy the audit finding that stars read as *rating the person*. That was right for the person
page header, but it overstuffed the compact Team card. **I left it rather than restyle a surface this
track owns** — flagging it instead of silently fixing it in a file two chats are in.

**Options for this track:** keep the words and shorten the rest; give the rating its own tier; or carry
"prep rating" as `title`/`aria-label` and show just `★ 5.0` (the accessible label already exists on the
element). Any of these is fine as long as the audit's X1 intent survives — **a star must never read as a
score of the person.**

## 3. Constraint to respect

X1 (stars = "prep rating", never a rating of the person) and M8 (the whole card opens the person; the
name is a focusable button; action buttons stop propagation) are **green-lit ux-audit fixes** now live in
`team-card.ts`. Re-paint them freely — but don't lose the meaning or the click behaviour.
