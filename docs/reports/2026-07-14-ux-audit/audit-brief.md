# Sero UX/UI Audit Brief — evidence pack for panel review

## What Sero is
A 1:1-prep tool for people managers. The manager tells Sero who the 1:1 is with and what's on their mind; Sero writes a focused brief, runs a short live Q&A during the meeting, then produces a briefing (what stood out, honest reads, next actions). Two public personas:
- **Manager** (paying end user): full flow — Home → New 1:1 (5-step intake) → Focus areas → Prep brief → Live Q&A → Briefing → history (Past 1:1s, Team, person pages).
- **Member** (the managed report): read-only — a timeline of their own 1:1s (dates + meeting types only; never the manager's notes — an explicit privacy promise).

Company stage: pre-revenue validation. The bar: "a real HR manager gets insight worth paying for." Design system: "The Quiet Debrief" — calm paper-like canvas, Flowbite shapes in Sero tokens, Bricolage Grotesque + Inter, ONE sky-blue action per screen, 14px text floor, plain language. The white-label-on-sky primary button (2.5:1) is an accepted brand deviation — do not flag it.

## Verified findings (live-walked 2026-07-15, desktop 1280x800 + mobile 375x812; file:line evidence)

### Manager persona
- M1 **Primary action sinks below history (the ordering bug)** — on a person's page the order is: name header → "Since last time" recap → "Past 1:1s" list → "Prep your next 1:1 with X" button LAST (frontend/src/stages/person-detail.ts:214). Measured: with only 2 past runs the button sits at 729px in an 800px viewport; more history pushes the page's only primary action below the fold.
- M2 **Three run surfaces, three different answers to "where do I start?"** — Home: start buttons ABOVE the list; person page: start BELOW the list; Past 1:1s: NO start control at all once populated (admin/src/stages/runs.ts:79-90 puts the only Start inside the empty state).
- M3 **Resume dead-end** — Home lists recent sessions with Resume; clicking Resume on a stale one shows alert "Could not resume that session. It may have been deleted or expired." then leaves the row in place, still offering Resume. No recovery path except Delete. (Verified live on 2 of 3 listed sessions' rows.)
- M4 **Internal QA chrome shown to paying managers** — the "Review" action on Home opens the run-review verdict screen: engine hashes ("engine 94587b98/bd8cc326"), "0/8 judged · none", Pass/Fail per engine-eval dimension ("Does not over-infer", "No private leak"), overall Keep/Fix/Block. Router comment says deliberately manager-visible (admin/src/router.js:98) but the language is internal QA, not customer value. Page is ~3,500px tall (4.4 viewports), no in-page navigation.
- M5 **Session top-bar overflow + double progress systems** — at 1280px the in-flow phase labels ("Focus areas · Prep brief · Questions · Live Q&A · Synthesis · B…") clip and collide with the profile chip; first chip renders as a clipped "p" fragment. Mobile shows "Setup · 1 of 7" while the page header says "Step 5 of 5" — two counters, different totals, same screen.
- M6 **One-accent rule breaks on Home expanded state** — "Start a new session" and "Resume" are both blue simultaneously; "Delete" sits directly beside Resume.
- M7 **Cancel/Reset vocabulary collision** — "Cancel setup" button opens dialog "Reset session? This session will be cleared…" with buttons "Cancel" / "Reset session" (red filled). Three words for one act; "Cancel" now means don't-cancel. Red filled button also deviates from the design system's danger spec (coral-800 border/text, not filled).
- M8 **Person cards look clickable but aren't** — cursor:pointer on the whole Team card, but no click handler; the only path to a person's page is the hidden ⋯ → View menu (frontend/src/stages/team.ts:91-101). The design doc's own rule: whole row clickable.
- M9 **Person page doesn't survive refresh/deep-link** — reloading /team/<id> bounces to the Team list (flash of dead "Person / NO ONE SELECTED / Pick a person from your Team page" screen whose only blue action is "Back to Team").
- M10 **Team roster ≠ run history** — runs exist for people (Maya Chen, Nikki) who don't appear on Team; intake free-text people don't join the roster, breaking Team's promise "Add a name now; their 1:1 history fills in as you meet."
- M11 **Invite link delivered via raw window.prompt** (frontend/src/stages/team.ts:128-133) — browser-native prompt, off design system, easy to dismiss and lose the link.
- M12 **No manager settings/profile** — no way to change own name, company, or password anywhere; only Log out. Password reset exists only on the logged-out flow.
- M13 **Terminology zoo** — "session", "run", "1:1", "prep" used interchangeably ("Start a 1:1 prep session", "Recent sessions", "One-page run", "Past 1:1s", nav "New 1:1"). In-flow stage names are engine vocabulary: "Live Q&A", "Synthesis". "One-page run" appears with zero explanation.
- M14 **Copy nits** — "What missed? (optional)" (broken grammar, run-detail rating card); button labelled "Skip (optional)"; Past 1:1s subtitle "Your past 1:1s." restates the heading; "HONEST READ — THEM" header vs the person's name used elsewhere; "a partial record, not a read on Priya" (insider idiom "a read on"); mixed date voice ("8d ago" beside "Mon 6 Jul 2026").
- M15 **Mobile Home rows wrap noisily** — dot-separated meta ("Maya Chen · Junior Product Designer · Junior · Performance & feedback") wraps to 4 lines per row at 375px. No horizontal scroll anywhere (good).

### Member persona
- B1 **Split-brain member home (admin app)** — logging in lands on "/home": h1 "Welcome to Sero"; any reload bounces to "/runs": h1 "Past 1:1s", subtitle "The 1:1s your manager prepped about you." Same user, same app, two different home screens by entry path (login.js:99-103 vs admin/src/main.js:342). Verified with paired screenshots.
- B2 **Role-gate leak: members can enter the manager intake** — in the customer app, the member's "What is Sero?" page CTA "Start a 1:1" opens the 5-step manager intake; member advanced to Step 2 live. Console shows 403s (team/people, runs/recent) but the UI lets them continue; they'd fail late with invested effort.
- B3 **Member About page written for managers** — "Sero helps you prepare for a one-to-one with someone on your team…" + blue "Start a 1:1" CTA, on the page a MEMBER sees. Wrong audience, forbidden action.
- B4 **Three labels for the member's one list** — frontend: nav row "Past 1:1s" → screen h1 "Welcome to Sero" → eyebrow "Your 1:1s". Admin variant h1 "Past 1:1s". A member never sees the same name twice.
- B5 **"Prepped about you" tone** — admin-app member subtitle "The 1:1s your manager prepped about you." reads surveillance-flavoured; contrast frontend's warmer "Your manager uses Sero to prepare your 1:1s. Here's your history."
- B6 **Dead route** — run-detail is member-routable but has no entry point and can never show member data (admin/src/stages/run-detail.ts; wired to caller-authored runs only).
- B7 **Thin member value** — the entire member surface is an unclickable 2-column list (type + date + "with <manager>"). No explanation of what a 1:1 covered, no way to prepare, nothing to do. Nav rail contains a single item; admin-app member rail lacks even What is Sero?/Send feedback/Privacy (frontend has them).

### What's working (verified)
- W1 Distinctive, calm visual identity — Bricolage+Inter pairing, tinted paper canvas, flat surfaces; zero AI-slop tells (no gradient text, glass, hero metrics, card-grid sameness).
- W2 Intake flow craft — picking a known person skips role/seniority (Step 1 → 4); plain-question headings ("Who are you prepping for?", "Anything Sero should know?"); meeting-type cards with honest time estimates and a "Recommended" chip; keyboard hints; scroll-to-top per step.
- W3 Honest empty-record briefing — a no-notes run yields "No transcript turns were captured, so there is no evidence to judge…" instead of fabricated insight. Rare and excellent.
- W4 Viewport centring works on short screens; no page-level horizontal scroll at 375px anywhere tested.
- W5 The privacy promise is worded consistently at every access touchpoint ("dates and meeting types, never your notes").
- W6 Destructive actions route through a confirm dialog consistently.
- W7 Briefing content quality (Maya Chen example): specific, evidence-tied, manager-ownable next steps; peak content is genuinely strong.

## Screens inventory (screenshots exist for all)
Login (split photo layout) · Manager Home (empty + populated + expanded + mobile) · Team · Person page (the ordering bug) · Past 1:1s · Run detail (Overview/Briefing tabs) · Review/verdict page (full 3,500px) · Intake steps 1/4/5 (desktop + mobile) · Cancel dialog · Member home admin-app (login-landing vs reload) · Member home frontend · What is Sero? page · Member-in-intake leak.
