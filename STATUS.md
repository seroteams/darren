# STATUS — where we are

Your at-a-glance tracker. Big picture: [SERO_BOARD.md](SERO_BOARD.md). Finished work: [docs/plans/done/](docs/plans/done/).

📍 **2026-08-02 — a repeat 1:1 opens on a question again. [action-review-placement CLOSED](docs/plans/done/action-review-placement/plan.md), both phases, a few pence.**
You met "How did last time's agreements go?" as the first thing after the walk-in card and called
it wrong-place and a difficult design. It was three things at once: the card **blocked** (you could
not pass until every row was tapped), it pushed the arc's own opening question to second so you met
**three** non-conversational screens before a real exchange, and it is the bi-weekly arc's *own*
first named anti-pattern, "agenda-heavy openers that read like a HR form" — a rule written to
constrain the model that the interface was quietly breaking. **Why it went stale rather than being
wrong:** "beginning wins" was decided 2026-07-12 when nothing competed for that slot; the merging
opener Machar asked for arrived 2026-07-29 for unrelated reasons, and the two then fought over the
same beat, the form winning by going first. Now the actions are **offered** on the card you already
see, "Start the meeting" goes straight to question 1 in every arc, and answering one of three is a
real answer — whatever you leave alone stays open and is never filled in for you. **Something feels
off** is the one arc that never opens on them, because actions follow the **person** and not the
meeting type, so that meeting can inherit a ledger from a career conversation; they appear at its
recap instead, above the lock-in, closed by the same button. Your other question answered itself in
the code: the person fence was already there, so keep it. Committee record:
`logs/committee/2026-07-31-action-review-placement.html`; the four concerns it left open are
researched and parked in [docs/research/2026-07-31-action-review-open-concerns.md](docs/research/2026-07-31-action-review-open-concerns.md).
[Board](https://claude.ai/code/artifact/8fa125e8-076f-4ac1-90ee-5351b4c07b70) · [mockup](https://claude.ai/code/artifact/c71c8cae-9f16-402f-889b-e48b93a109e8).

📍 **2026-08-02 — the Run Review now shows the whole run, not the old shape of one. Green-lit, committed, not pushed.**
The review screen (and its "Copy all", which the AI judge also reads) was still built around
notes → prep → questions → recap. Everything added since was invisible: the typed agenda, the cached
role context the prompts are fed, last time's actions and how you tapped them, the focus points, each
question's coach hints and the planner's read of the answer, both honest reads, the reminders, the
axis reads, the engagement read, the actions agreed at the wrap-up, and the run's spend. You cannot
mark a run "role-aware" or "does not over-infer" against inputs you were never shown. Extras are
projected once (`reviewExtras`) and joined at the repo seam, so the file and Postgres lanes cannot
drift. Commit `3d3d55a9`. 230/230, typecheck and copy lint clean, £0. Walked on two real runs on
screen; the agenda block is unit-tested only, because no local run has an agenda typed. **It earned
its keep immediately:** on the feels-off run it showed an agreed action filed as *theirs* that reads
like yours (tapped that way at the wrap-up, not an engine fault), and a user-facing engine string
with a banned em dash that the copy guard never sees because it only scans the two front-end folders.

📍 **2026-08-01 — the planner's rule sheet now says each rule once. Committed, not pushed.**
You asked whether we should change models to save money after OpenAI's price-cut email. The answer
was no, not yet, and the measurement is why: **86% of every pound goes to one stage**, the planner
that re-plans the queue after each answer, because it runs about six times a session while every
other stage runs once. Its rule sheet had been trimmed on 10 July from 46k to 28k characters and had
grown back to 38.6k, **+40%, with a third of that in the last three days**. Six rules were each
stated in four or five places: wind-down, the agency-after-a-snag trigger, the shallow-answer gate,
no-inference, dedup, and the closer. [planner-prompt-trim](docs/plans/done/planner-prompt-trim/plan.md)
**P1 ✅ green-lit 2026-08-01** (commit `6d86ec58`): each now has one home, the rest point at it, and
**no rule was removed**. 227/227, typecheck, copy lint clean, offline replay unchanged, **£0**.
**The honest part: it saved 3.1%, not the big cut the plan implied.** The repeats were short
restatements, not big blocks; most of the prompt is unique rules. Phases 1 and 2 together will land
nearer 13% than 30%, and a bigger cut means deleting rules, which is your call. **Two things parked
rather than done:** the cache fix (about a page and a half of unchanging context is billed at full
price every turn instead of the cheap cached rate, ~10% of a run) and the model swap to GPT-5.6
(~22%), parked until validation ends so it does not muddy the signal we are measuring.
[Board](https://claude.ai/code/artifact/7c211d67-dc8b-43f9-8527-932cc334c6cb).

📍 **2026-08-02 — checkpoint: the regression board is paused at phase 4 of 6, everything committed,
nothing half-written.** You asked to pause so you can go live and move the repo to a new folder. The
regression rerun board has landed phases 1 to 3 (the screen and free safety check, the paid rerun,
the AI reviewer) and all three are proven on real runs, not just tests. Phase 4 (Rerun all + past
reruns history) is built and waiting on your walk; the history only appears after the app is
restarted, because the server process you have running is older than that commit. Chasing the
reviewer's first real result turned up a genuine bug: a run's cost record held only the questioning
calls, so the board under-reported spend by roughly half and the $6 batch ceiling could not see most
of what it exists to cap. Fixed and guarded by a test proven to go red without it (`7d8ddbbf`). The
same shape probably affects the Test engine's "$0.35" line, which belongs to another chat's lane and
was deliberately left alone. Phases 5 (live behaviour + bless a baseline) and 6 (turning a red result
into a fix brief) are specified but not started. This chat's lane is cleared and its dev server
stopped, so the folder is free to move.

📍 **2026-07-31 — your notes are yours again: they no longer touch a single question or prompt,
and the audit's own worst fix has been taken back out. LIVE.** Two things happened after the audit
entry below. **One, your rule:** "the notes should not affect any questions or prompts or anything.
This is for me as an admin only to assess your outputs." The notes panel is admin-only tooling, so
no-dead-wires phase 4 was reverted whole: mid-run notes reach neither the next question, nor its
grounding corpus, nor the final brief, on any lane. Your intake note is untouched and still feeds
both. Proved end to end offline through the real builders and the real prompts. **Two, I re-audited
my own audit fixes and one was wrong on two counts.** The private-note leak screen I added could
never run (notes are stripped before it sees them, so it was dead code) and, when it could, it
blocked innocent briefings: you jot "the cutover keeps coming up", the brief says "The cutover keeps
coming up across the conversation", and Sero throws away the real briefing for the canned fallback.
That was live behaviour on `a07841c`. Removed; the two older leak screens are untouched. Commits
`cba8004e` and `4d3647ec`. **✅ LIVE 2026-07-31** — build `4d3647e` on `sero.team/api/version`,
homepage 200. 221/221, typecheck and copy guard clean, replay unchanged. **Left open:** the dead
`sessionNotes` plumbing in `queue-manager.ts` and the `{{SESSION_NOTES}}` block in `plan-turn.md`
are being removed in a separate session; nothing feeds them and no placeholder ships unfilled.

📍 **2026-07-31 — an independent audit of the engine rewiring found four real defects in it. Three
hold and are LIVE; the fourth was mine and is gone (see above).** You asked for a fresh chat to check the no-dead-wires work. It did not
come back clean, which is the point of asking. **One:** the QA rule only covered half the path, so a
tester's note still reached the live planner and its grounding corpus on every lane. **Two:** three
separate copies of "what counts as a QA run" had drifted apart. **Three, the one that matters most:**
text you type in a note was being filled into the prompt before other keys, so a `{{...}}` hidden in
a note got expanded by the next pass. Proved offline: a note carrying `{{AXIS_STATE_JSON}}` came back
holding the engine's full internal axis state. **Four:** the leak screen could not see mid-run notes
at all, while phase 4 had just started routing them into the briefing. **That fourth fix was the
wrong answer and has since been removed** (see the entry above): it was dead code that also blocked
innocent briefings. The first three hold, each with tests proven to go red when the fix is removed,
plus a tripwire for the evaluation payload being built in
two places. Commit `ca343851`, re-verified independently before the push (the fixes hold and
both features still work). **✅ LIVE 2026-07-31** — build `28e9eb1` on `sero.team/api/version`,
`/api/v1/health/deep` reports `db: up`, homepage 200. 221/221, typecheck and copy guard clean.
Riding the same push: type-system-5b closed, action-review-placement P1 (green-lit), and
**coach-hints-live P2, which is live but you have not walked it** — that was your call on the fork.

📍 **2026-07-31 — the type system is in, and it caught three bugs that had nothing to do with type.
[type-system CLOSED](docs/plans/done/type-system/plan.md), all 7 phases, £0, no paid runs.**
You compared the Questions mockup against your live Meeting screen and said one had great typography
and yours did not. Sero now has one ladder: **seven text sizes for the whole product**, down from
about seventeen, each welded to a line spacing on the 4px grid. Nine lint rules hold it and every
one is a **build error at zero**, so a fifteenth size cannot come back. The Meeting screen went from
five sizes to three. **What the sweep walked past on the way is the part worth reading:** the
bundled Inter **never painted, for anyone, on any page load** (the app asked for a font name that
does not exist, so you saw Inter only because you have it installed and customers read Sero in Segoe
UI); the coach panel's reading-width cap **had never once applied**, because it was wider than the
column it sat in, which is most of why that screen read badly; `.btn`, the primary button, rendered
off the grid on **every screen**; and the notification email was a **fourth type system nobody had
ever checked**, three of its sizes below the 14px floor, shipping to real managers. Phases 0 and 1
you walked; 2 to 6 are closed **unwalked** on your "lets go!", each with measured proof.
**Then you said do the sweep, and that is done too** ([type-system-5b](docs/plans/done/type-system-5b/plan.md), commit `466546ee`): the last 164 left the component sheets, so **no stylesheet in Sero decides its own text any more**, and all ten rules are build errors at zero. A live page census finds nothing off the ladder. One caveat worth knowing: 5b's adversarial pass crashed before it ran, so it carries my measurements but not the three-verifier hunt the other seven phases got, which makes a walk worth more here than on them. **Two things left, neither blocking:** 164 weights and leadings still declared in
prose sets a bit
wider than DESIGN.md's own 66-character cap, and the promises card changed look on the customer app
because it shares the question-stem style. [Board](https://claude.ai/code/artifact/969964a8-67b3-4b80-a2da-156381cfab63)
· [specimen](https://claude.ai/code/artifact/401c7c5c-b460-4711-a8d1-f2f27147abb3).

📍 **2026-07-30 — the engine's wiring map landed, and the first dead wire is closed on your green light.**
Your "it follows a script" instinct was traced through the whole engine: the [input-to-output map](docs/reports/engine-input-map.html)
shows Sero reads you deeply before a meeting, then largely follows the pre-written plan — in a
six-question bi-weekly, one slot was genuinely open, and seven collected inputs never reached the
place they mattered. You said "no dead wires", the committee backed the four-phase rewiring
(logs/committee/2026-07-30-no-dead-wires.html), and **[no-dead-wires](docs/plans/doing/no-dead-wires/plan.md)
P1 of 4 is ✅ green-lit (your "A"): the final brief now sees your prep plan and says honestly whether
the meeting reached it, touched it, or never got there** — never inventing follow-through, never
quoting your plan as the report's words. Commit `4f85e144`, carried LIVE the same day inside build
`4f85e14` by a parallel chat's go-live. 216/216, typecheck + copy guard clean; the cost trace behind
the plan found plan-turn is 61% of run spend, so every later phase is budgeted against the cached
prompt prefix (~+$0.03/run ceiling, no new AI calls). P2 (the planner reads your note, vocabulary,
answer-quality and score levels) ✅ green-lit the same day (your second "a", commit `4117b5b0`):
the note and vocabulary ride the cached prompt section at near-zero marginal cost, a prefix-stability
test guards the cache, and two weak answers in a row now force the planner to change tack. P3 ✅
green-lit same day (your third "a", commit `15aa9959`): the question list is now a draft, not a
script — it reorders, rewrites stale questions in the report's own words with a grounding quote,
drops overtaken ones, and the prep-opener pin releases after three questions. The plan's one paid
proof ran: gate case `machar-biweekly-jun11` PASS at $0.196 a run (normal band), cache intact, no
regressions. **P4 ✅ green-lit same day (your fourth "a", commit `8a8defdf`), and the PLAN IS
CLOSED**: a note you jot mid-meeting now shapes the next question and reaches the final brief on
real runs, while QA-labelled runs keep the tester-note strip that once burned the Brian run. All
four phases signed in one day; every dead wire on the map is closed or parked with a written reason
(person-level memory and promises-into-prep wait on the cross-run round you scoped out; the
axis-coverage code gate and mid-run bank refresh wait on evidence they are needed). **✅ ALL LIVE
2026-07-30 on your "go live"** — build `3798d1d` confirmed on `sero.team/api/version` about 90s
after the push, `/api/v1/health/deep` reports `db: up`. Triple-checked before pushing: both real
prompts assembled end to end with every new wire present and zero unfilled placeholders, 219/219,
copy guard clean; the one red typecheck on this machine traced to another chat's uncommitted edits,
not to anything pushed.
[Board](https://claude.ai/code/artifact/39c06832-a4ed-4c65-b091-2c6a75140847) · [plan](docs/plans/done/no-dead-wires/plan.md).

📍 **2026-07-30 — your whole Figma sticky board is fixed, tested and signed off.
[user-test-fixes CLOSED](docs/plans/done/user-test-fixes-jul-29/plan.md), all 3 phases in two days, $0.19 total spend.**
Every sticky from the Machar test landed: the code words are off the rating panel (P1), the lock-in
screen says it happens together in the meeting and what skipping costs, the recap's Final read wears
the runner's lavender meters (PDF too), the floating dots and empty date pills are gone, and a
Performance & feedback meeting can no longer be served an off-topic stock question — "good quarter"
and "actually recovering" are locked to the meetings they suit (P3, one gate run PASS).
**The find worth keeping: the QA prompt button was rendering for EVERY manager** — its `hidden`
class never worked on that footer, which is exactly what Machar saw (F7). It is now not rendered at
all unless internal admin, local, with notes. Proof: real-screen screenshots in the plan's proof/,
suite 215/215, typecheck + both linters, walkable fixture at Tests → "Recap fixes". Commits
`205610c4` · `7bdb06e2` · `1ce13d35`. **✅ LIVE 2026-07-30 on your "go live"** — build `4f85e14`
confirmed on `sero.team/api/version` 75s after the push, `/api/v1/health/deep` reports `db: up`.
One check rides your next real 1:1 there: no "Copy QA prompt" button on the recap. [Board](https://claude.ai/code/artifact/be9f62dc-b0d6-44d6-885b-496122b21da3).

📍 **2026-07-30 — the Support panel now coaches every question, and a nine-day outage came out of the woodwork.**
[question-support-hints](docs/plans/done/question-support-hints/plan.md) — all 3 phases green-lit in one
sitting ("the support questions are ok, with the limited information, so we can pass"). You flagged that
the right-hand Support panel never changed with the question. It didn't, and the reason was bigger than
the panel: **the question bank stage had been failing on every live meeting since 20 July.** A field was
added to the request on 19 July but not to its required list, OpenAI rejected the whole call, and the
fallback quietly served 8 generic stock questions with nothing but a console warning. Three live
meetings ran that way, two of them Machar's. Fixed, then proved with a real call: rejected before, 8
personalised questions after. On top of that, every question type now carries its own coaching — the
bank, the mid-meeting planner questions, all 12 intro questions, 8 seeds, 22 openers, the agenda
carry-forward, and follow-ups which inherit and say so. Three more silent field-drops found and closed
(the reconcile rebuild, the opener picker, the YAML codec). Proof: a full meeting walked live, 5
questions, **5 with their own coaching, the prep-brief fallback never appeared**. Commits `914151c9` +
`04f3a738`, 214/214, typecheck + copy guard clean, local only. **Next, your call at sign-off: the
coaching only knows this meeting's notes. Giving it the person's history is its own plan.**

📍 **2026-07-30 — the code words are off the rating panel, and you green-lit it.**
[user-test-fixes](docs/plans/done/user-test-fixes-jul-29/plan.md) P1 of 3 — the first fix from your
Figma sticky board (Machar's session). His screen showed `[THREAD-DEFERRED-WINDDOWN]` inside a
live-scores explanation: an internal planner marker that four engine checks legitimately read, so it
can't be removed at the source. It is now stripped at the last hop before the browser — both the live
turn and the reconnect replay — while the stored note stays raw for the engine. A note that was
nothing but codes now shows nothing instead of punctuation. You walked a local 1:1 to the
second-to-last question: explanations clean. **Commit `205610c4`, 214/214, typecheck clean, committed
local — ships next "go live".** Next: P2, the end-of-meeting screens (mockup already approved).

📍 **2026-07-29 — every console feature was walked, and the two things it turned up are fixed and
green-lit ("yeah its good").** All 16 sidebar rows were opened in a live build: every one mounts and
is wired to a real API. Two real problems came out of it. **One:** opening "New session" could freeze
the whole sidebar. The field swap resolved inside an animation frame with no timer fallback, so in
any tab that isn't painting (backgrounded, restored) it never settled, and because every screen
render is serialised through one chain, the URL changed and the screen never did. Fixed with the same
belt-and-braces `boot-shell.js` already used for its own reveal, and proved in the exact condition
that broke it. **Two, the bigger one:** your machine and the live site use two SEPARATE databases, so
Pulse was headed "Live pulse. The live site right now" while showing your local rows, and the Error
log's Live filter could never match. Both screens now say "this machine" when they are on your
machine. Live error reporting itself was proved working end to end with one authorised probe (landed
in the live DB, `production`/`browser`, 11:18). **Live holds 19 errors never read, because the local
console cannot reach them.** Commits `1747f4ad` + `4badeefa`, 208/208, typecheck, copy guard green,
local only. Committee log: `logs/committee/2026-07-29-sidebar-feature-audit.html`; five findings
parked in a research handoff, now running in its own session.

📍 **2026-07-29 — "What is Sero?" is now the six-step How-Sero-works walkthrough, LIVE on your word
("put this live").** The committee reviewed the real first-login and relogin screens and found no
reachable page told the story past the brief: the meeting itself, the recap, and the loop were
invisible. Three shapes were prototyped in the test gallery ("How it works. Three shapes"); you
picked **C, one flat page**, then asked for pictures, so every step carries a small ghost schematic
of its real screen. The About page's manager view is now that page: six steps chaptered Before /
In the room / After, step 4 (Sero sits in the meeting with you) highlighted, every step naming the
real on-screen stage label so the walkthrough and the app speak one language. Member view untouched.
Page tests 9/9, typecheck, both guards green. **Commit `d55e3259`, pushed inside build `969da20`,
confirmed on the live `/api/version` badge.** Signed-in managers reach it from "What is Sero?" in
the rail; the logged-out front door still doesn't link to it (parked with the committee's research
handoff). Committee log: `logs/committee/2026-07-29-how-it-works-clickthrough.html`.

📍 **2026-07-29 — the Screens gallery is gone, on your word ("delete screens feature we dont
need it").** The whole feature came out: the Build rail row, the `/gallery` routes and deep links,
the edit-bar host, the static-export script and its fixtures, the 43 exported snapshot pages, and
the `screen-gallery` plan folder. Nothing else lost a screen: Tests, Design system and every real
screen are untouched, because the gallery only ever *borrowed* them from the stage registry.
204/204 tests, typecheck clean, all three free guards green.

📍 **2026-07-29 — the welcome screen leads with a real brief again, and you green-lit it ("love it!").**
You looked at the first screen a new manager sees and said it wasn't very interesting. It was
**option B, "start typing"** — an empty notes box as the whole screen, picked 2026-07-27 from the
five leaner concepts. Short, but it showed a newcomer nothing: an empty rectangle can't teach what
comes out the other end, so the screen read as blank. The other four were still built and walkable,
so nothing needed re-designing: you picked **C, three focus points**, from the same set.

Now the screen is the headline, one line, the blue button, and **Sofia's real three-point brief**
from the seeded example run: how to open, what to explore, what to listen for, quoted verbatim from
the fixture and labelled "Example brief". The button sits **above** the card on purpose, so the way
in is never below something you have to scroll past. The notes box and its hand-off into the wizard
went with option B; the wizard already asks for notes on its own step, and it happens to teach the
same three labels, so the welcome and the first step now say the same words.

Verified on the real screen (customer app, zero-run manager account): **790px at desktop, one
screen, no scroll**, phone stacks with a full-width button. 202/202, typecheck, both linters.
Prototype of all five stays at `admin/src/stages/tests/welcome-lean.js`.
**Commit `7341697d` — and it is already LIVE**: a parallel chat's push carried it out inside build
`33dfdca7` (sero.team, confirmed on `/api/version`). Nothing has touched these files since.

📍 **2026-07-29 — every fix from the first corridor manager's session is built, tested and signed
off. [machar-fixes CLOSED](docs/plans/done/machar-fixes-jul-29/plan.md), all 4 phases in one day,
$0.33 total spend.** From Machar's 18 minutes with the app, six findings you picked became four
phases: the end-of-run prompt stopped reading like an internal form (P1), the opening now names your
agenda and asks for theirs, and "nothing specific" no longer costs a question (P2), wellbeing reads
the person rather than the difficulty of what they describe (P3), and the sharp question the recap
used to keep to itself is now asked in the meeting (P4). Board:
[open it](https://claude.ai/code/artifact/8d3b845b-d57b-4af4-b49d-d4eeac25c521).

**The headline is P4, because it is the one he cared most about.** Same gate case, same answers, one
prompt change apart: *"Where does that lack of understanding show up most with sales and BD?"* became
**"What have you tried with sales and BD so far, and what happened?"** That is his own line, moved off
the summary page and into the room. The first attempt at it failed, and the reason is worth keeping:
it was written as a whole-session quota, and Sero plans one question at a time, so it could never
count. Rewritten as a per-question trigger and promoted above the rules that were outranking it.

**Two things fell out that were not on the list.** The wellbeing gate built in P3 was **inert** — it
reads each turn's booked scores and a field filter was quietly dropping them, so it could never fire.
Only the paid run exposed it. Fixed, and with it switched on, **5 of your 7 saved runs** turn out to
score wellbeing against answers where the person never said a word about themselves; one marks them
down for *"wants to present more often in the architecture review"*. And your no-em-dash rule does not
reach the engine: the copy guard scans the two apps, never a generated question, which is the most
user-facing text you have. Parked, not fixed.

**206/206, typecheck, both linters, replay 7/7. ✅ LIVE 2026-07-29 on your "go live"** — pushed as
build `9d8b674`, confirmed on `sero.team/api/version`, `/api/v1/health/deep` reports `db: up`. Checked
at the destination rather than assumed: the live `briefing` chunk carries "One last thing.", "Would
you use this before your next 1:1?" and "Anything get in the way?", and the old three-question form
appears **zero** times. The engine-side changes (the opening wording, the wellbeing rule, the agency
question) shipped in the same build but were not re-observed on live, because watching them means
running a real 1:1 and every turn is a paid call. Kate and Nora will be the first to see them.

📍 **2026-07-29 — the first minute of a 1:1 now asks what THEY want out of it, and you green-lit it.**
[machar-fixes](docs/plans/done/machar-fixes-jul-29/plan.md) P2 of 4. Two faults sat in the same
moment. The opening asked only what to *cover*, which collects topics but never the other person's
aim for the time; Machar: "you've got two people coming with maybe not exactly the same agenda... I
also want to hear from my staff." It now says **"I've got a couple of things to cover. What do you
want to get out of today?"** Naming your own agenda first is what makes the second half a real
invitation rather than a formality.

The second fault was quieter and worse. Answering "nothing specific" made Sero mint a question about
the word nothing **and silently add a turn to the meeting** to fit it in, so a polite non-answer cost
a real question. The engine already knew that exact phrase was a decline; the opening was the one
path that never asked. Now it does, and the rule is a named, tested one rather than four conditions
buried in a stream handler. **204/204, typecheck, both linters. Commit `07158ae8`.** Honest gap: the
live turn counter was never watched moving, because reaching that code costs a paid model call. It
rides P4's single run. P3 (wellbeing) building now.

📍 **2026-07-29 — the last screen of a 1:1 stopped interviewing the tester, and you green-lit it.**
[machar-fixes](docs/plans/done/machar-fixes-jul-29/plan.md) P1 of 4, the first fix out of Machar's
session. You caught it live over his shoulder: "we don't need that QA prompt, that's for me." It was
three stacked questions with small-caps labels, which is what made it read as an internal form. It is
now **one question in Sero's voice** — "Would you use this before your next 1:1?" — plus an optional
line. That question stays because it is the corridor test's only automatic read on whether a tester
would come back; deleting it would have quietly removed the pass-bar instrument.

You picked option A off the mockup, so the dropped question took the star rating with it: it had been
doubling as one (Yes/Sort of/No became 5/3/1). Runs no longer rate themselves at the end; rating stays
a deliberate act on the run's own page. Deriving stars from "would you use this again" would have been
inventing a rating, so it is not done, and a test now says so. Proved on the real screen at desktop
and phone width, and the answer was read back out of the Feedback inbox rather than inferred from the
save code. **203/203, typecheck, both linters. Commit `2118b32e`, committed local, ships next
"go live".** P2 (the opening) building now.

📍 **2026-07-29 — THE CORRIDOR TEST STARTED. Manager 1 is Machar Smith, and he tested today.**
An 18-minute facilitated walkthrough on video, Machar driving, a real scenario end to end. Verdict:
positive — "it just feels like tweaks more than anything else", usability "really good", first
summary "really strong", the lock-ins carrying to the next 1:1 liked. Nine findings captured in the
[session log](docs/validation/machar-2026-07-29.md), the sharpest being **F1: Sero's best question
("what's one step you've taken to resolve the conflict?") appeared on the summary page instead of in
the live meeting** — "that seems like a miss... the questions being a bit bland". Also: the opening
jumps into the meat without asking what the employee wants from the session (F2), no way to hold a
question the pair aren't ready for (F3), the wellbeing score over-fired on a *team* conflict (F4),
and the QA prompt showed to a tester (F7). Machar will himself sit with managers 2 and 3 on recorded
video calls and is lining up more testers for next week. **This session doesn't count toward the
pass bar** — the bar is an unprompted return; watch whether Machar comes back on his own.

📍 **2026-07-27 — every loading screen in the app now shows the shape of the page
that's coming, and you green-lit it.** skeleton-shapes CLOSED, all 6 phases in two days, £0.
Before: one grey three-card ghost on every screen, whatever was actually loading. Now a table
ghosts as a table, the KPI dashboard as tiles, a people list as avatar rows, and the run lane
previews the screen it is about to route you into. **Generic grey cards left: zero.**

The technique is the reason it works: a ghost IS the real element wearing the real classes, holding
one non-breaking space, so it inherits the real font and lands the same height. Most presets now
measure **exact** against the loaded page.

Two of the finds were yours. You spotted the ghost lines rendering as a few grey pips: `width` does
nothing on an inline element, and every height I had measured was correct, which is exactly how it
hid. You also refused the sign-off when the bar said "all pages" and it was 34 of 47, which turned
up two screens I had genuinely missed. Both are why the proof sheet exists: **Design → Loading
skeletons** renders every preset beside the real thing and measures it live, so the next one cannot
hide. DESIGN.md rule 5 now states the rule; the clean-up skill checks it.

**This also unblocks component-consolidation P4**, which paused waiting on this lane's 33 files.
197/197, typecheck, both linters. **Committed local, ships on your next "go live".**

📍 **2026-07-27 — the welcome screen's sample brief became a document, and you green-lit it
("yeah i like it").** You rejected the first-screen design on sight, asked for options, and picked
**B, brief as hero** from five. The sample now reads like the thing it is: Sofia's name in the
display face with an initial avatar, small-caps labels over full-width paragraphs, on lifted paper.
The "this is an example" line moved onto a banner above the card, so the brief itself never
apologises. A real bug fell out of the rebuild: the old three-column layout watched the window
width, not the card's, so on a wide screen each part was squeezed to about 160px. Also fixed the
same day: the welcome video was returning YouTube "Error 153" on live, because that morning's
hardening pass told the player to send no referrer and YouTube then had no way to check we may
embed. Kept on purpose above the brief: the intro and the four "what managers tell us" pairs.
The five options stay walkable at `admin/src/stages/tests/welcome-options.js`.
196/196, typecheck, both linters. **Committed local, ships on your next "go live".**

📍 **2026-07-27 — the design system lost a third of itself and nothing moved on screen.**
design-cleanup-invisible CLOSED, all 6 phases green-lit in two days, £0. **Tokens 309 → 250**, with
54 that were referenced nowhere at all (whole families: the interaction-state overlays, the
breakpoints, which could never have worked because custom properties don't function in `@media`).
Radius and shadow each had **two rival naming systems** running at once, so one 12px corner
answered to three names; now one name per value, named for the job. Four token names all meant
14px; now one, and 55 hardcoded sizes became tokens. The **Tailwind config went 211 lines → 74**:
it was generating ~380 shortcuts off the token layer and the app used nine, a second design system
anyone could reach for while bypassing DESIGN.md. And the customer app stopped downloading the
admin console's styling: **both first-paint stylesheets −18%** (157,894 → 129,423 bytes), the
1,000-line internal Design-system screen now loading only when opened.

The guards are the durable part. Two design linters existed and passed, but **nothing ever ran
them** — not the test suite, not CI, not a hook. They are now inside `npm test` as a **ratchet**:
today's drift is frozen at a ceiling that may fall and never rise. Non-token font sizes went
**76 → 13** in the process, and all 13 left are genuinely wrong sizes (15/17/30/32px) that
DESIGN.md itself bans.

Every phase proved itself against the *built* CSS, not by claim: `:root` compared separately from
the rules, and for renames every `var()` chain resolved to a literal first. Three audit findings
were **wrong and corrected in flight** — the loudest being "70 dead colour shades", which the
Design-system screen renders live from those very tokens; deleting them would have left 70 blank
swatches. **NOT pushed live** (styling only, no behaviour change). Next, both needing Carl:
a **P3b** to finish the namespace collapse (~150 call sites still held by other chats' lanes) and
the **visible pass** (the type ladder is still inverted at the top).

📍 **2026-07-26 — the first minute now shows the work instead of asking for it.**
onboarding-firstrun CLOSED, all 4 phases green-lit in two days. A brand-new manager lands on a
welcome that quotes the seeded example's REAL prep brief (drift-tested against the fixture, labelled
a sample), your walkthrough video click-to-load, one button. The left rail stays quiet (What is Sero?
/ Send feedback / Log out only) until a first real 1:1 exists. The research pass caught a live bug on
the way: since demo-seeding began on 22 July the prep wizard counted the example as a real 1:1, so no
new signup had ever seen its beginner guidance. Home, the wizard and the rail now share one rule
(`hasRealRuns`). 191/191 tests, both linters, real-screen proof per phase. **LIVE 2026-07-26**
(build `1db2d5c` on sero.team, DB up).

📍 **2026-07-26 — we now ask what business you're in, at signup and in your account.** Optional
sector field in both places, CAPTURE ONLY: nothing in the engine reads it yet. The committee backed
collecting it now and deciding the engine wiring after Gate 1, so the data accrues while the corridor
test runs. 81 sectors covering how people actually work (AI, cybersecurity, fintech, digital health,
edtech, cleantech, care services), in a box you type into rather than a list you scroll. Stored as a
stable id, so a cached per-sector context block can key off it later. Verified end to end: typed in
the browser, landed in the database, came back on reopen. **LIVE 2026-07-26** (build `1db2d5c`;
the column migration ran itself on boot, deep health reports db: up).

📍 **2026-07-25 — Google sign-in went LIVE on sero.team.** "Continue with Google" on login and
signup, both apps, closed in one day across 3 phases. Server-side OAuth with PKCE and zero new
dependencies (the strict CSP rules out Google's JS SDK). A new Google user gets the same welcome as
any other signup: org, demo seed, admin alert. Microsoft SSO stays parked.

📍 **2026-07-25 — the full code review landed, with zero behaviour change (refactor-2026-07, all 7
phases in one day, $0).** About 4,000 lines removed or de-duplicated: dead code swept, both app
typechecks caught already-red on main and fixed, `server.ts` 803 to 609 lines, the 12-layout Prepare
lab out of the customer bundle, one typed `state.ts`, one run-row projection shared by both stores,
one boot shell for both apps. LIVE and verified on the deploy.

📍 **2026-07-25 — live is the field console, local is the lab.** Carl asked whether the two had
drifted. Three read-only sweeps said no, but one app was wearing four hats. The workshop and design
bench (Library, Compare, Coaching phrases, Role words, Meeting arcs, Design system, Tests) are now
hidden on live; the rail derives its trim from that one router set, so it can never disagree with the
deep-link bounce. LIVE, build `641f782`.

📍 **2026-07-25 — the full-app audit became a fix-up plan.** 256 page loads, 4 roles, 963 buttons
clicked (`audits/full-app-audit-2026-07-25/report.html`). Nine phases of green-lit findings.
**P1 CLOSED** (brand marks show, the build stamp stops blocking clicks, search boxes named, auth
screens on the brand face, one date format per column). **P2 building now** in another chat.

📍 **2026-07-25 — you picked the way in.** entry-redesign P1 green-lit: two prototypes walked in the
Test area, you chose **Version A** (keep the three screens, dress them to match). P2 (build A into
the real screens) is not started.

📍 **2026-07-25 — THE REDESIGN IS DONE. All 8 design-consolidation phases green-lit and live.**
Carl's closing walk signed P7 ("a... push live"): the re-audit scoreboard reads **35 Standard /
9 Hybrid / 1 Custom** (the Screen gallery, exempt on purpose), from 12/19/14 when the audit
became the acceptance list on 2026-07-22. Every one of the 43 boxes is ticked or Carl-parked
(flow widths stay two-tier; Prepare variant-lab CSS stays, fenced). CSS 9,874 -> 9,680 lines
with ZERO inline style blocks and nine namespaces deleted; fresh 42-screen gallery baseline.
Plan folder -> done/; design-cleanups (future/) marked absorbed. Full record:
[reaudit.md](audits/design-audit-2026-07/reaudit.md).

📍 **2026-07-24 (evening) — P6 went LIVE: the back office grew up.** Carl walked it ("yeah its
good") and his skeleton note was answered before shipping: every admin loading state now shows the
standard ghost cards instead of plain "Loading…" text. Live now: every internal and superadmin list
is a real searchable/sortable table (Library, Personas with a side-panel transcript, User
management, User detail, Guest runs, Feedback inbox with tabs, the Pulse drill-downs with clickable
rows into read-only briefings and a star histogram on Ratings), Pulse follows ONE 7/30/90-day
switch on every tile + chart (backend range param, test-covered), repeating errors group into
issues with counts, the four parallel button systems are deleted, every confirm goes through the
shared dialog, Lexicon review wears the admin costume, and Gallery's toolbar is a declared
DESIGN.md exemption. Known limit: feedback done/archive marks are per-browser for now. Verified:
184/184 + 46/46 backend, typecheck, both linters, real-screen screenshots. Next: P7 re-audit
closes the redesign.

📍 **2026-07-24 (later) — P5 went LIVE: the app got its proper shell.** Carl walked P5 locally and
green-lit it same day. Live now: the sidebar stays open with names + section headers (chevron
collapses it, remembered per browser; rows are real links and stay lit through a run), every
drill-down carries the shared top trail with zero per-screen Back buttons (7 Pulse/Operate pages,
run review, tests; Library/Guide/Compare Backs deleted), Guide restored to the internal rail, and
the Monthly Check-in wears the app shell (breadcrumb + top stepper + shared Saved pip; old mcr
skin deleted, its CSS 836 → 385 lines). Verified at build: 184/184, typecheck, both linters,
real-screen screenshots. Next: P6 admin sweep, then P7 re-audit closes the redesign.

📍 **2026-07-24 — P4 went LIVE: the meeting itself got the redesign.** Carl green-lit P4 with
"go live and merge"; PR #30 merged to main (3344e865) → Render deploy. Live now: the interview keeps
the step bar visible with a calm 3-button action row (Enter = newline, no Esc-skip), the recap renders
instantly (one soft fade, celebration kept), and Prepare ships ONE customer layout (Sheet) with the
12-variant lab fenced to internal admins. Re-verified at merge: 183/183 tests, typecheck, lint:copy,
lint:tokens. Next: P5 labelled sidebar. "keep Arc" still flips the Prepare layout back on Carl's word.

📍 **2026-07-23 — "SHIP IT": the first half of the redesign went LIVE.** Carl green-lit P2+P3 with
"ship it"; PR #29 merged to main → Render deploy. Live now: the design-audit acceptance work P0-P3 —
shared kit, manager lists (Home/Team/Members/Past 1:1s/Person detail), one branded auth shell
(Register + Join fixed), recomposed member Home, flow spine (stepper from Setup, one footer, one
interstitial, inline retries), plus launcher fixes (starts both apps, self-updates) and the
manager-login redirect. 181/181 tests, typecheck + linters green at merge. Post-deploy check =
open the live site (cloud env can't reach Render). Next: P4 interview + instant recap.

📍 **2026-07-22 — the full design audit landed, and it's now the acceptance criteria.** Every screen in
all three personas audited against known SaaS patterns (45 screens: 12 standard / 19 hybrid / 14 custom;
[report](audits/design-audit-2026-07/README.md), [visual](https://claude.ai/code/artifact/66b443eb-f5e6-4d73-a0b2-42583a0d25b4)).
Committee convened (logs/committee/2026-07-22-design-consolidation.html); Carl approved the consolidation
plan: [design-consolidation](docs/plans/doing/design-consolidation/plan.md), 8 phases, audit findings as a
tick-list ([acceptance.md](docs/plans/doing/design-consolidation/acceptance.md)), go-live per green-lit
phase. Phase 0 in progress: before-baseline of 42 screens exported to docs/screen-gallery/ (0 failed),
mockup awaiting Carl. Open with Carl: confirm the SeroEngine rename (it was the retired original name).
Absorbs the parked design-cleanups plan.

📍 **2026-07-22 — new signups now start with an example 1:1.** demo-member Phase 1 green-lit:
every fresh manager registration is seeded with an example person ("Sofia · Product Designer") and one
finished bi-weekly recap already on their homepage — cloned from a committed fixture, so it costs
nothing per signup. Demo rows are flagged and invisible to every admin metric, Pulse view and the
returns report (your corridor numbers stay clean), and deleting the account removes them. Verified
with a real registration walk on local; 169/169 tests. Phase 2 next: the "Example" badge + one-click
remove. Committed local, ships next "go live".

📍 **2026-07-21 — the 15 Jul UX audit is closed out.** Carl re-handed the audit PDF; turned out it was
already fully built a week ago (`docs/plans/done/ux-audit-fixes/`, all 5 phases, P1–P2 green-lit, P3–P5
self-signed). Re-verified all 22 findings against current code (20/22 fixed in source with `(audit M#)`
comments) + a live spot-walk: manager Home + member Home + member About render right, `report-returns.ts`
shows "4 of 9 managers returned on 2+ days". Two cosmetic tails fixed (member h1 → "Your 1:1s"; start-button
labels → "Start 1:1"). **Account settings finished:** edit-your-name (session-scoped) **and** manager-only
company rename (an org-level change — members are 403'd, both server + UI) — both TDD, verified over HTTP
against the real DB (member correctly refused on the company routes). One thing parked: the dead member
run-detail branch (degrades gracefully). Suite 167/167 (auth 32 cases), typecheck clean. **✅ Carl confirmed
closed 2026-07-21** — committed local, ships on the next "go live".

📍 **2026-07-21 — the prep brief now coaches the meeting, not just the person.** Every brief carries a
new AI-written "tip for this style of meeting" — a bi-weekly reads as a light rhythm-keeper, a feels-off as
observation-first — anchored to the style, tuned to your notes, and arc-safe (no hidden performance framing,
even when baited with a quality note). It's saved in each run's prep log to learn from, and shows as a callout
on the /prepare screen + in Copy-all. Committed local; ships next "go live".

📍 **2026-07-20 — the arcs got right-sized.** Following the evidence review, Performance is now
7 questions (was 8) and Growth 8 (was 9) — trimmed to fit their slots; the Growth picker badge
moved 30-45 → 35-50 min to match. Two phase intents sharpened (Self-read = "your view, not the
verdict"; feels-off "Underneath" = opt-in, employee-led). All 3 arc-evidence phases now green-lit;
`npm test` 164/164. Committed local — ships next "go live". (Two tiny tone-string syncs —
`plan-turn.md`, gallery `arcs.json` — still parked behind other lanes.)

📍 **2026-07-20 — EVERYTHING WENT LIVE.** Your "go live" pushed the whole backlog (head `3c12e884`,
two deploys): coach panel, promises step, hardening fixes, repeat-question fix, arc gates, better-reads
P1+P2, boot-splash, admin lockdown, plus a cloud chat's run-memory P1 (merged — two small overlaps
reconciled, 163/163 tests). Confirmed on sero-obwq: new bundle signature, `/health/deep` 200, `/admin`
logged-out now bounces (302). ⚠️ The hashed-token fix logged everyone out once — sign in again once.

📍 **2026-07-20 — the arcs are now evidence-backed, and approvals got lighter.** An external
evidence review of all five 1:1 types came back (4/5 well-aligned); its "ship now" list is built and
green-lit: banned-question gates on every type (no diagnosis language, no trait attacks, no promotion
promises, no week-one assessment) + the Performance tone relabelled task-directed. Same day you
switched QA to **evidence-first**: engine changes get approved from proof in chat; click-walks only
for user-facing screens, screenshots first.

📍 **2026-07-20 — the engine's scoring bias is now measured, and you approved the fix.** A deep
stage-by-stage audit found scores fall 2× as often and 3× as hard as they rise (24 down/−34 vs
11 up/+11 across 8 runs). better-reads Phase 1 (detect-only instrumentation) green-lit on that
evidence; Phase 2 (let honest up-moves survive, still capped) building now.

📍 **2026-07-19 — the meeting picker got honest.** Onboarding check-in is off the picker
(old runs still open fine), and Monthly Check-in now shows for real managers in BOTH apps —
it was built but hidden behind the internal-admin wall. **LIVE 2026-07-19** (pushed 65109d0e;
confirmed on sero-obwq — anon meeting-types dropped to 4 cards, no Onboarding).

📍 **2026-07-19 — promises got their moment.** The promises step is now its own full-screen
"lock in what you two agreed" page BEFORE the recap (two lists: you / them), guests included;
the recap and the PDF now show who promised what instead of Sero's raw suggestions. All four
phases green-lit same day (your consolidated walk). Committed locally — ships on next push.

📍 **2026-07-18 — the board is CLEAR.** Your full-system walk signed off every built pass, the
promises card zero shipped and was green-lit the same day, and on your "finish all, moving on"
every unbuilt tail was parked (nothing deleted — one sentence un-parks any of them). Everything
green-lit is pushed live — **except** the repeat-question fix green-lit later today, which is committed and ships on the next push.

## ▶ Your move
1. **The regression board is 3 of 6 phases in, and it has already caught a real bug** — from your "lots of changes to the engine, I want to go back and see what's happening". [regression-rerun-board](docs/plans/doing/regression-rerun-board/plan.md): **P1, P2, P3 ✅**. Press Rerun on any of eight frozen test managers and it goes through today's engine with the same setup and answers; the safety checks grade it against its baseline, and one AI reviewer scores it out of 5 with a better/same/worse call against the last run. Both proved themselves on real runs: Priya came back **PASS, 4/5, "improved"**, with the reviewer quoting your actual transcript. **P4 built, waiting on you** (Rerun all + past-reruns history). **Restart the app to see the history** — the server you are running predates it. P5 (live behaviour + bless a baseline) and P6 (what to do when it goes red) not started. [Board](https://claude.ai/code/artifact/89c153cc-fc8e-4b15-9b20-ee6afc141776) · [mockup](https://claude.ai/code/artifact/2f58f42b-7cd9-4b78-8732-e038337bb95f).
2. **The brief star rating is DONE, and it is the one thing here waiting on a push** — [brief-star-rating](docs/plans/done/brief-star-rating/plan.md) closed today, both phases green-lit, £0. Your prep brief now asks "How good is this brief?" and takes a one-tap score out of 5; every score lands in your Feedback inbox with a link into that meeting. Committed local (`e21ed525` + `0d026aaa`), **not yet live**. It only starts collecting from real managers once you say "go live". [Board](https://claude.ai/code/artifact/6de9e218-84d0-4ad7-b860-8998d3fc1e3c) · [mockup](https://claude.ai/code/artifact/e9d9a80f-93df-4141-a679-3ec7a4443cb2).
2. **The Machar fixes are DONE and LIVE** — all 4 phases green-lit and shipped 2026-07-29, $0.33 spend, build `9d8b674` on sero.team, [closed](docs/plans/done/machar-fixes-jul-29/plan.md) · [board](https://claude.ai/code/artifact/8d3b845b-d57b-4af4-b49d-d4eeac25c521). Nothing needed from you. Kate and Nora will be the first testers to meet the fixed version.
2. **Walk the live first-run** — the new three-focus-points welcome is live now (build `33dfdca7`), and it changed the exact screen this item is about. The one thing local can never prove: register a brand-new account on sero.team and check the first screen and the empty rail behave on the real deploy.
3. ~~Push the empty-states fix~~ — **SHIPPED**. [empty-states](docs/plans/done/empty-states/plan.md) closed 2026-07-28 (both phases, commits `2ac61fc6` + `d14d6d76`): the customer rail no longer hides a new manager's rows, and Team / Past 1:1s / Members say what they will hold. Both commits verified inside live build `33dfdca7` on 2026-07-29, so the stripped rail you hit is gone from sero.team. [Board](https://claude.ai/code/artifact/9bc58e32-53e9-48b8-a17e-f3accbd7951b).
4. **The corridor test is RUNNING, and all three names are locked** — **Kate, Machar, Nora** (2026-07-29, on the [GTM one-pager](docs/reference/gtm-validation-plan.md)). Machar has run his first session ([log](docs/validation/machar-2026-07-29.md)); Kate and Nora have not been asked yet. Left for you: ask those two, and flip Render to paid so the site never sleeps on a tester. **Render goes paid 2026-07-30 (Carl, payday).** Until then the free plan sleeps after inactivity, so a cold first click can hang about 50 seconds: worth sending Kate's and Nora's invites after the flip, not before.
4. ~~Three walks are waiting on you~~ — **cleared 2026-07-27 on your instruction** ("no more walk throughs please. just go"). screen-gallery P2, sero-run-memory P1 and audit-fixes P2 are now marked closed **unwalked**: each one's code is present, tested and green on the free suite, but none was seen on screen by you. Each plan records that in writing. Nothing else is queued for your eyes.
5. ~~Two design follow-ups need a yes or a no~~ — **the type half is now a live build, and the mockup is signed off.** You compared the Questions mockup against the live Meeting screen ("one has great typography, mine does not") and asked for a hard fix on the whole site. [type-system](docs/plans/done/type-system/plan.md) is that: Tailwind's standard scale plus Carbon/Atlassian-style role tokens, ending with `font-size` existing in exactly two files and anywhere else failing the build. You picked the 30px title ladder and the Tailwind-scale option; the [specimen](https://claude.ai/code/artifact/401c7c5c-b460-4711-a8d1-f2f27147abb3) is the approved picture. **P0 of 7 ✅ green-lit today.** Still open from the old clean-up: **P3b**, the namespace collapse (~150 call sites inside other chats' lanes) — a separate yes or no.

## ✅ Closed 2026-08-01
[coach-hints-live](docs/plans/done/coach-hints-live/plan.md) — the coaching beside your question now listens to the answer. Both phases green-lit, **$0.35 total**, LIVE in build `fb8737a`. You sent a screenshot: "the right panel is repeating itself, not connected to past answers, not connected to question either." Three complaints, three different causes, and a fourth found only by reading the paid proof run line by line. **P1:** the agenda question was the last question in the app carrying no coaching of its own, because the guard that proves every question has some walks the content folders and that one is built in code; with none, the panel borrowed the prep brief's whole-meeting cues, which are fixed for the session, so the real fault ("this question has no coaching") wore the disguise of a different fault ("the panel repeats"). **P2, the part worth keeping:** the plan blamed a prompt line, and fixing that alone would have shipped, passed every test and changed nothing on screen, because `reconcileQueue` discarded the planner's fresh coaching one line before it reached the queue. Fixing both still left **the last question of every meeting** stale: the reserved closer is stashed whole at bank time and reaches the front by three more routes, and the one that fires on real runs sat in another file. **The gate went PASS while a sixth of the meeting was broken** — only the transcript showed it, with four fresh hint sets discarded for that one question. The closer fix was then re-proved for free by replaying the paid run's own recorded stage logs through the new code. 227/227, typecheck, copy and design guards clean. Two things recorded rather than buried: **~$0.15 spent unapproved** (the shell reported no OpenAI key; the dev server it started had one), and the em-dash guard scans only the two front-end folders, so backend screen copy is outside it. [Board](https://claude.ai/code/artifact/f5eac651-d4e8-4ba9-a1b7-c19835cd56c4) · [mockup](https://claude.ai/code/artifact/6c24a91b-b025-4146-8e86-ba24a624889a).

## ✅ Closed 2026-08-02
[action-review-placement](docs/plans/done/action-review-placement/plan.md) — a repeat 1:1 opens on a question again, not a form. Both phases green-lit, a few pence total (P1 was £0; P2 spent one real evaluation call to produce a genuine recap for the walk). The old card blocked until every row was tapped, stood in front of the arc's own opening question, and broke the bi-weekly arc's own first named anti-pattern. It now sits as a quiet second button on the walk-in card you already see, and answering one of three is a real answer: whatever you leave alone stays open and is never filled in. **The two findings worth keeping.** First, the placement was not wrong when it was decided, it went stale: "beginning wins" was chosen on 2026-07-12 when nothing competed for that slot, and the merging opener arrived on 2026-07-29 for unrelated reasons. Worth asking of any placement rule: what has arrived since? Second, the clearest argument against the screen came from the product's own data files — an anti-pattern written to constrain the model, which nothing checks the interface against. **P2 caught a real defect in its own walk:** the first version read the per-1:1 record at boot as well as writing it, so two meetings with the same person in one tab offered actions the first had already closed off. Fixed, and the remaining narrow case is written down rather than hidden. Parked with reasons: the two stores doing one job, the stale Support panel on non-question cards, and Rogelberg's order objection (all researched in [docs/research/2026-07-31-action-review-open-concerns.md](docs/research/2026-07-31-action-review-open-concerns.md), all your call to park). Commits `81f6c4ef`, `6136bc60`, `6d4709f3`, local: **ships on the next push**.
[planner-prompt-trim](docs/plans/done/planner-prompt-trim/plan.md) — the planner's rule sheet says each rule once, and now has a cap that stops it growing back. Two phases green-lit, one skipped on your call, **£0 across the whole plan: no paid run was ever needed.** It started as "should we change models to save money?" after OpenAI's price-cut email, and the measurement is the part worth keeping: **86% of spend sits in one stage**, the planner that re-plans the queue after each answer, because it runs about six times a session while every other stage runs once. Per-turn prompt size dominates; the model tier barely moves it. That stage's rule sheet had been trimmed on 10 July from 46k to 28k characters and had grown back to 38.6k, **+40%, a third of it in three days**, as unrelated features each bolted on a rule. P1 gave six rules that each had four or five homes a single home each, **removing no rule**. P3 is the one that makes it hold: `npm run lint:prompt-size`, a free pure-Node check that fails when the rule sheet passes 34,400 characters, with 337 characters of headroom — about a third of a paragraph, so a wording fix passes and a whole new rule does not. Proved both ways before you saw it, and you ran it yourself. **The honest part, recorded in the plan rather than glossed: P1 saved 3.1%, not the big cut the plan implied**, because the repeats were short restatements while the mass of the file is unique rules. P2 was skipped as the weakest phase (~10% more, the only paid check, and the most quality risk, since those examples teach the planner how to word a question). **Parked with numbers:** the cache fix (about a page and a half of unchanging context billed at full price every turn instead of the cheap cached rate, ~10% of a run) and the GPT-5.6 model swap (~22%, held until validation ends so it does not muddy the signal). Commits `6d86ec58`, `a5c04bbf`, `692ee628`, `0df573b6`, local: **ships on the next push**. [Board](https://claude.ai/code/artifact/7c211d67-dc8b-43f9-8527-932cc334c6cb).

## ✅ Closed 2026-07-30
[brief-star-rating](docs/plans/done/brief-star-rating/plan.md) — the prep brief can now tell us whether it landed. Both phases green-lit the same day, £0. A one-tap score out of 5 sits between the brief and the button row, saves immediately, never blocks the manager, and counts guests; every score reaches the Feedback inbox as its own row type with a link into that 1:1. Built almost entirely from parts that already existed (`createStarRating`, the `feedback_notes` table, the inbox, and `feedback-kinds.ts`, whose own header comment had predicted this exact extension). **The find worth keeping: `upsertVerdict` matched on run id alone**, because "one row per run" was true only while there was exactly one run-tied feedback moment. A second writer would have silently overwritten the recap verdict, and a missing validation signal is the kind of bug nobody reports. A `kind` column and scoping both upserts on the pair cost four lines; migration `0023` backfills. The same shape appeared in the UI, where a layout switch would have wiped a score already given. Verified at zero cost by noticing the prep stream replays a cached brief. 216/216, typecheck, both linters, real-screen proof on laptop and phone. Commits `e21ed525` + `0d026aaa`, local: **ships on the next push**. Parked and stated: a rapid double-tap could in theory write two rows, the same risk the verdict tap has carried since it shipped.

## 🔨 Building now
| Build | State |
|---|---|
| [regression-rerun-board](docs/plans/doing/regression-rerun-board/plan.md) | 6 phases, from your "I want to go back and see what's happening after all these engine changes". Eight frozen test managers, same setup and answers every time; press Rerun and they go through today's engine, adapting to wherever the questions have moved. Free safety checks are the hard gate, one AI reviewer scores better/same/worse against last time, and you rate it yourself in the run review tool you already use. **P1 ✅** (`2365e7b0`) the screen + free check, £0. **P2 ✅** (`212f7346`) the paid rerun — proven on a real run: Priya PASS, matching her baseline. **P3 ✅** (`0fb425bf`) the AI reviewer — proven on a real call: **4/5, "improved"**, eight dimensions scored, three moved up, reason quoting the real transcript. **P4 🔨 built, awaiting you** (`703fd5b5`) Rerun all + past-reruns history; the Rerun-all button is verified on screen, the history needs the app restarted because your running server predates it. **A real defect was found and fixed on the way** (`7d8ddbbf`): the board counted only the questioning calls, so it under-reported spend by about half and the $6 batch limit was blind to the rest — now the whole run is billed properly, with a test proven to fail without the fix. P5 (live + bless) and P6 (what to do when it goes red) ⬜. Your calls: paid reruns stay **local-only**, and **one** AI reviewer not a panel. Committee record: `logs/committee/2026-07-31-regression-rerun-board.html`. [Board](https://claude.ai/code/artifact/89c153cc-fc8e-4b15-9b20-ee6afc141776) · [mockup](https://claude.ai/code/artifact/2f58f42b-7cd9-4b78-8732-e038337bb95f). |
| [audit-fixes-jul-25](docs/plans/doing/audit-fixes-jul-25/plan.md) | 9 phases from the full-app audit. P1 ✅ green-lit 2026-07-25. P2 ✅ closed **unwalked** 2026-07-27 (shell + layout; built 07-25, regression test guards it). P3–P9 ⬜ — nothing built, so this stays open. |
| [entry-redesign](docs/plans/doing/entry-redesign/plan.md) | P1 ✅ green-lit 2026-07-25, you picked Version A. P2 ⬜ (build A into the real login/register screens) — was blocked behind the google-signin lane, now free to start. |
| [demo-member](docs/plans/doing/demo-member/plan.md) | Phase 1 ✅ green-lit 2026-07-22 (example person + finished 1:1 seeded at signup, metrics-clean). Phase 2 ⬜ (Example badge + one-click remove). Must reuse `hasRealRuns` from the onboarding build. |
| [promises-loop](docs/plans/doing/promises-loop/plan.md) | P1–P2 live. P3 SPLIT: surfacing half ✅ green-lit 2026-07-18 (person page + Recap show promises + outcome chips; walkable via `scripts/seed-promises.ts`). Engine feed (turn-1 + reviewer) still to build. |
| [sero-run-memory](docs/plans/doing/sero-run-memory/plan.md) | Phase 1 ✅ closed **unwalked** 2026-07-27 (every turn tagged Good note/Thin/Skipped/Declined, chip in run detail; built 07-20, 19 new tests green). P2–P4 ⬜ not started, so this stays open. |
| [component-consolidation](docs/plans/doing/component-consolidation/plan.md) | 8 phases: one owner module per UI part (modal, button, card, empty state, chip, field, avatar, nav, router) plus a lint guard. P1 ✅ green-lit 2026-07-26 (one modal shell, 9 dialogs, 3 gained a keyboard trap they never had, -216 lines). P2 ✅ green-lit 2026-07-26 (one `avatar.ts` replaces 9 initials helpers; the two-letter rule had drifted into two different rules, so one person read "KK" on Team and "K" on Pulse). P3 ✅ green-lit 2026-07-27 (one `button.ts`, 150 call sites across 40 files, proved byte-identical). **P4 ⏸️ PAUSED 2026-07-27 (your call)** — lane `70b40d36` (loading skeletons) holds 33 files covering 17 of P4's 27 empty states and most of its card files; half-doing it would leave two empty-state systems in the app. Resumes when that lane clears, opening with a card-padding comparison for you (24px vs 20px, you pick). **P8 ✅ green-lit 2026-07-27** — `npm run lint:components`, the guard that stops P1-P3 drifting back (5 rules, 18 recorded leftovers, proved by making each rule fail). P5–P7 ⬜ and all lane-blocked on the same two chats, so this plan can build nothing more until one releases. [Board](https://claude.ai/code/artifact/7bc89958-58d5-42a4-8c6f-92cbac891cb8) · [mockup](https://claude.ai/code/artifact/200aff4b-61d2-48a8-accc-40145baac39a). |

## ✅ Closed 2026-07-27
[skeleton-shapes](docs/plans/done/skeleton-shapes/plan.md) — every loading state now previews its own page. 6 phases, £0. One central kit (`ui/skeleton-presets.ts`) with 11 presets; a ghost wears the real element's classes so it inherits the real box, and most measure exact against the loaded page. Zero screens left on the generic cards; two stay un-ghosted on purpose (a disabled input already at final size, and intake's roster, where a ghost would cause a worse shrink). Live proof sheet at Design → Loading skeletons. Known limit, stated: a ghost is right at the width its screen uses and drifts at others, because every height is a count of wrapped lines.

## ✅ Closed 2026-07-27
[design-cleanup-invisible](docs/plans/done/design-cleanup-invisible/plan.md) — the design system's dead weight, removed without moving a pixel. All 6 phases green-lit in two days, £0. Tokens 309 → 250 (54 referenced nowhere, including a whole breakpoint family that could never work); one name per value for radius, shadow and text size (four names meant 14px); Tailwind config 211 → 74 lines after finding it generated ~380 shortcuts the app used nine of; both first-paint stylesheets −18% now the customer no longer downloads the admin console's CSS. The lasting bit: two design linters that existed but **never ran anywhere** are now in `npm test` as a ratchet — drift may fall, never rise (non-token font sizes 76 → 13 already). Proved against the built CSS every phase, never by claim. Two follow-ups need you: **P3b** (~150 call sites still inside other chats' lanes) and the **visible pass** (the type ladder is inverted at the top). Committed local, ships next push.

## ✅ Closed 2026-07-26
[onboarding-firstrun](docs/plans/done/onboarding-firstrun/plan.md) — the brief-first welcome, the quiet rail, and one shared first-run rule. All 4 phases green-lit; 189/189 tests; ships on your next "go live".

## ✅ Closed 2026-07-25
[google-signin](docs/plans/done/google-signin/plan.md) — "Continue with Google" LIVE on sero.team, 3 phases in one day, zero new dependencies. Microsoft SSO stays parked.
[refactor-2026-07](docs/plans/done/refactor-2026-07/plan.md) — the full code review, 7 phases in one day, about 4,000 lines removed or de-duplicated, zero behaviour change. LIVE and verified on the deploy.
[home-screen-truth](docs/plans/done/home-screen-truth/plan.md) — the seeded example now says it is an example.

## ✅ Closed 2026-07-25
[design-consolidation](docs/plans/done/design-consolidation/plan.md) — the whole redesign, all 8 phases green-lit across 4 days (P0 foundations → P7 re-audit). Final scoreboard 35 Standard / 9 Hybrid / 1 exempt Custom (was 12/19/14); all 43 acceptance boxes ticked or Carl-parked (flow widths, Prepare lab CSS); CSS 9,874 → 9,680 with zero inline style blocks, nine namespaces deleted; fresh 42-screen baseline; design-cleanups absorbed. Shipped live across PRs #29-#33. [Board](https://claude.ai/code/artifact/68a1b2ab-13b3-4279-a35a-b6a8a96e23c0) · [reaudit](audits/design-audit-2026-07/reaudit.md).

## ✅ Closed 2026-07-21
[ia-consistency](docs/plans/done/ia-consistency/plan.md) — the app-wide nav/IA standard. All 6 phases: the 3 rules written into DESIGN.md (breadcrumb trail · a screen names what you opened · "1:1" not "meeting"), then applied across both apps — the member 1:1 recap (`run-detail`) names the person + breadcrumb (was "Past 1:1"), the person page and Monthly Check-in got the same trail (the check-in was a nav dead-end), and every user-visible "meeting"→"1:1" + the last comma joiner→middot. P6 = Carl chose KEEP the superadmin circled "Back". Verified `npm test` 167/167 + typecheck; P3–P5 built under "continue until done" and **not individually screen-walked** (SPA won't render in the automated pane) — nothing pushed, so any real-screen nit is a trivial follow-up. Commits `3068fddc`→`e39ed876`. [board](https://claude.ai/code/artifact/f6bced93-814a-460c-b5f5-590491d960cc).
[brief-style-tip](docs/plans/done/brief-style-tip/plan.md) — a new AI-written "tip for this style of meeting" in the prep brief. Both phases green-lit: (P1) the tip generates on-style and stays relational for bi-weekly/feels-off — a bi-weekly baited with a "quality slipped" note still read "mapping friction, not building a case"; schema-enforced, validated, and auto-saved in every run's prep log (part of the brief) so we can learn from them. (P2) renders as a soft-blue callout at the top of the /prepare Arc brief ("For this kind of meeting") + in Copy-all. Typecheck clean, 164/164. Committed local, ships next push.

## ✅ Closed 2026-07-20
[arc-evidence-fixes](docs/plans/done/arc-evidence-fixes/plan.md) — all 3 phases green-lit (evidence-first): per-type banned-question gates across all 5 meeting types + Performance tone relabel (P1); question-count trims (Cause/Anchor 2→1) + Growth badge 35-50 min (P2); intent reframes — self-read = "their view, not the verdict", feels-off "Underneath" opt-in/employee-led (P3). Committed local, ships next push.
[better-reads](docs/plans/done/better-reads/plan.md) — all 3 phases green-lit in one day, from your "can we improve our engine?" A three-lens audit measured the scoring bias (falls 2× as often, 3× as hard as it rises); now every held-back score is recorded (P1), short-but-real answers keep the up-score the engine already wanted to give (P2, LIVE), and repeat 1:1s open new ground instead of rewriting last time's brief — proven by feeding the engine its own prior brief (8% opener overlap, theme named as continuing; ~$0.13 paid total) (P3, committed, ships next push). Parked follow-ups in the plan: reviewer recalibration, run-health scoring block, the cost quick-wins.
[admin-lockdown](docs/plans/done/admin-lockdown/plan.md) — `/admin` is now a true internal-only console. All 3 phases green-lit: (P1) the console bundle is served only to internal admins/superadmins server-side — managers, members and logged-out visitors 302 to the normal app, closing an audit hole where the shell was handed to anyone (P1 **LIVE** on sero-obwq); (P2) internal engine tools (arcs, lexicons, library…) refuse managers on every environment, not just live; (P3) signpost sweep confirmed all emails already point at the normal app, plus a login/register eject so the admin bundle never seats a manager. P2+P3 committed local, ship next push. From a Carl bug report → full-system URL/RBAC audit.

## ✅ Closed 2026-07-19
[coach-panel](docs/plans/done/coach-panel/plan.md) — all 3 phases green-lit in one day. The questioning screen is now the full-screen 50/50 coach panel: live scores as gradient meters carrying the engine's real per-answer "why", a Support/Live-scores toggle + the manager-only hints contract, and a detect-only gate keeping performance-review language out of check-in "why" text (86 real runs, 0 false alarms). Admin app only. Two prompt lines parked behind another chat's lane (real generated hints + a P3 nudge). Local commits, ships next push.
[promises-before-recap](docs/plans/done/promises-before-recap/plan.md) — the agreement step as its own screen between the last question and the recap (You promise / {Name} promises, edit + move + lock, guests too); recap "What you agreed" grouped by owner; PDF carries the same blocks; suggestions now honestly labelled "Sero's suggestions" when nothing was locked; cross-run state leak fixed. Your green light after the consolidated walk.

## ✅ Closed 2026-07-18
[agency-engagement](docs/plans/done/agency-engagement/plan.md) (full code audit → 16/17 hardening fixes committed: live-boot DB guard, login rate-limit, session revocation + hashed tokens, cost-race fix, backups, deep health probe, more — [audit report](docs/reports/2026-07-18-agency-audit.md); one cosmetic F16 follow-up parked) · [repeat-question-fix](docs/plans/done/repeat-question-fix/plan.md) (resolved-cause gate — engine stops re-asking an answered snag in new words; from a tester flag) · [members-page](docs/plans/done/members-page/plan.md) · [team-page-redesign](docs/plans/done/team-page-redesign/plan.md) · [wrap-up-exit](docs/plans/done/wrap-up-exit/plan.md) · promises card zero (P2, now in [doing/promises-loop](docs/plans/doing/promises-loop/plan.md) — un-parked, P3 surfacing half green-lit) — all your green lights.

✅ **Live 2026-07-20:** the hardening fixes (and everything above) deployed with the go-live push — the one-off everyone-logged-out event has happened.

## Parked (12, in docs/plans/future/ — each carries a banner saying exactly where it stopped)
Newly parked 2026-07-18: [ui-look-and-feel](docs/plans/future/ui-look-and-feel/plan.md) (P4–P6) · [admin-live-deploy](docs/plans/future/admin-live-deploy/plan.md) (P4–P6) · [personal-data-security](docs/plans/future/personal-data-security/plan.md) (P3 history-scrub — needs an all-chats-closed night). *(promises-loop un-parked 2026-07-18 — now in doing/, P3 surfacing half green-lit.)*
Earlier: [design-stage-native](docs/plans/future/design-stage-native/plan.md) · [run-qa-fixes-jul04](docs/plans/future/run-qa-fixes-jul04/plan.md) · [planner-grounding](docs/plans/future/planner-grounding/plan.md) · [briefing-readability-p0](docs/plans/future/briefing-readability-p0/plan.md) · [adaptive-early-close](docs/plans/future/adaptive-early-close/plan.md) · [code-health-refactors](docs/plans/future/code-health-refactors/plan.md) · [design-cleanups](docs/plans/future/design-cleanups/plan.md) · [questions-outcome-moat](docs/plans/future/questions-outcome-moat/plan.md) · [shared-shell-layer](docs/plans/future/shared-shell-layer/plan.md)

---
`⬜ not started` · `🔨 in progress` · `✅ done + you green-lit it` — I never sign off my own work.
Last updated: 2026-07-30 (user-test-fixes live on 4f85e14). Live build `33dfdca7` on sero.team, committed 2026-07-29 09:44 (confirmed on `/api/version`). **Main is level with live** — build `4f85e14` (pushed 2026-07-30) carried the whole backlog out, including the full user-test-fixes plan.
