---
name: committee
description: Convene Carl's advisory committee — 10 named seats that pressure-test any plan or direction decision. Trigger on "check with the committee", "ask the committee", "what would the committee say", or AUTOMATICALLY before locking in a plan or a direction call (engine design, product scope, GTM, pricing, trust/legal, evaluation, user interviews). NOT for UI tweaks, copy changes, bugfixes, or routine phase work.
---

# The Committee

Carl's standing advisory board (created 2026-07-20, deepened + expanded to 10 seats 2026-07-29). Advisory only — **Carl always decides**. The committee sharpens the decision; it never replaces his call.

## When to convene

- Carl says **"check with the committee"** (any wording close to it) → always convene.
- **Automatically** before: setting up a darren-method plan, choosing between meaningful product/engine/GTM directions, anything that changes what Sero *is* or *proves*.
- **Never** for: UI changes, styling, copy, bugfixes, refactors, routine phase execution, anything already decided.
- When unsure whether a decision "matters": if it would be expensive to reverse or shapes the validation-stage metric, it matters.

## The seats

Ten seats. This table is the index only — the depth lives in **[seats.md](seats.md)**, one method card per seat: named frameworks, signature questions, verified positions, voice tells, and the shallow-imitation traps. **Read the cards for every speaking seat before writing any verdict.**

| Seat | Voice | Speaks on | Register |
|------|-------|-----------|----------|
| Seed partner / traction | Michael Seibel (YC) | Traction truth: return-unprompted arithmetic, launch pace, metric discipline. | Cold, numbers-first |
| Design leadership / trust UX | Rasmus Andersson | Constraints before pixels, weakest-link quality, add nothing. | Craft, subtractive |
| Staff engineering / evals | Simon Willison | Evals from real failures, prompt injection, log-everything. | Enthusiast-skeptic |
| Observability | Charity Majors | Slice to the exact run; ask telemetry unplanned questions; prod watching for a nondeterministic system. | Ops-hardened |
| Trust & legal | EU AI-Act counsel (role, not named) | Annex III 4(b), Art 6(3) profiling override, Art 5(1)(f) emotion inference, deployer duties, GDPR Art 9. | Conservative, cites articles |
| Management science / org-psych | Steven Rogelberg (Glad We Met) | Whose meeting is it, talk-time, agenda ownership, the manager blind spot. | Evidence-bound |
| GTM / positioning | April Dunford (Obviously Awesome) | True alternatives, the no-decision loss, positioning-as-thesis pre-PMF. | Sharp, category-first |
| Behavioural science / perceived value | Rory Sutherland (Alchemy) | Perception vs reality problems, doorman fallacy, testing the opposite. | Digressive, contrarian |
| Discovery & negotiation | Chris Voss (Never Split the Difference) | Validation interviews, pricing conversations, hearing what users don't say. | Calm, short sentences |
| Real user | Kate Jackson + validation testers | Recorded feedback ONLY — never invented. | Practitioner, verbatim |

## The depth bar (Carl, 2026-07-29 — "average and mid-level replies" are a miss)

A verdict any seat could have written is a failed verdict. Before it reaches Carl, every seat's contribution must clear all three:

1. **A named tool, applied.** Use one of that seat's named frameworks or findings from seats.md, by name, on the specifics of THIS decision — not adjacent wisdom. ("Doorman fallacy: the recap KPI deletes the unmeasured trust job the briefing does.")
2. **Real evidence touched.** Cite an actual number, run log, validation-session note, or repo fact — or name precisely what evidence is missing and the cheapest way to get it. No verdicts from the armchair.
3. **A concrete landing.** End on a falsifiable claim or a specific change ("cut the third chip", "ask Machar X next session", "measure Y for two weeks"). Generic caution ("be careful with scope") gets rewritten, not shown.

Length stays 2–4 sentences per seat — depth comes from specificity, not word count. If two seats are saying the same thing, one of them isn't doing their job: sharpen or drop one.

## How to run a session

1. State the decision in one plain sentence (the question the committee is answering).
2. Pick the **relevant seats only** — usually 3–5. Not every seat speaks on every decision (the EU counsel has nothing to say about a question-bank tweak; Seibel has nothing to say about a legal wording). Convening all 10 every time is noise.
3. **Read the speaking seats' method cards in [seats.md](seats.md)**, then write each verdict against the depth bar above, in that seat's register. Objections must be concrete ("this adds a third chip — cut it"), not generic caution.
4. **The real-user seat is grounded ONLY in recorded feedback** — Kate Jackson's actual notes/emails and validation-session logs (docs/validation/). If there is no real signal on the question, say "no real signal on this" — never invent an opinion.
5. Synthesise: where the seats agree, where they clash, and your recommendation. A committee with no clash on a hard decision is a sign the seats went soft — check the depth bar again before presenting.

## How to present it to Carl

Carl-style. The committee table is a STANDING EXCEPTION to the postcard cap (like review tables): the table may run long, prose around it may not.

- 🟡 **YOUR TURN — decide** banner, then the decision in one plain line.
- **The committee table** — **three columns, never more** (Carl, 2026-07-29: the old five-column version was unreadable. Seat and Who said the same thing twice, and Register was a note-to-self dressed up as information).

| Who | Their call | What they said |
|-----|-----------|----------------|
| **Michael Seibel** · traction | ❌ Not yet | 2–4 sentences in that seat's own voice |

  - **Who** = the name in bold, then a middot and what they are in the room for, in plain words: *traction · 1:1 science · design · evals · ops · law · positioning · behaviour · negotiation · real user*. Never the old formal seat title.
  - **Their call** = the mark PLUS a plain-English position, so the column reads without a key: ✅ **Do it** · ⚠️ **Yes, but** (name the change) · ❌ **Not yet** / ❌ **No** (say why). Vary the words to fit the actual question ("Ship it", "Wait", "Cut it") — never a bare tick.
  - **What they said** = written in-character, carrying the depth bar. Never generic.
  - **Register is not a column.** It is how you write the cell, not something Carl reads.
- Below the table: the clash (if any) in one plain line, then lettered options A/B/C with ⭐ on the recommendation.
- If the committee is unanimous and the call is obvious, say so in one line and proceed — don't manufacture a fork.
- Extra seat-by-seat depth lives behind "more".

## Always: save the session as HTML (Carl, 2026-07-20)

**Every** committee session — every time it's convened, no exceptions — is also saved as a designed HTML log. Do this in the SAME turn you present to Carl, right after the chat reply. It is not optional and not something to ask about.

1. Copy [log-template.html](log-template.html). Keep its `<style>` block byte-for-byte — that's what keeps every log looking the same (Carl's Nordic design language: Fraunces + Inter, red points only, green completes, 14px floor).
2. Fill every `{{PLACEHOLDER}}`. Repeat the `<tr class="seat">` block once per speaking seat, in the same order as the chat table — including any "no signal" seat (verdict pill `v-none`, label `—`). Verdict pill classes: `v-back` ✅ · `v-change` ⚠️ · `v-against` ❌ · `v-none` —.
3. Options: mark the recommendation with `class="opt rec"` + a `★`; if Carl has already chosen, add `<span class="chosen">chosen</span>` to his pick and fill `{{DECISION_MADE}}` with what he decided (and, if the decision has since been acted on, one line on the outcome). If no decision yet, write "Pending Carl's call." in `{{DECISION_MADE}}`.
4. Save to `logs/committee/YYYY-MM-DD-<slug>.html` — `<slug>` is a short kebab-case of the decision (e.g. `2026-07-20-readiness-to-validate-early.html`). `logs/**` is gitignored, so these are local-only, never committed — same as run logs.
5. Tell Carl in one line where it saved. Don't paste the HTML into chat.

## Always: end with a research handoff (Carl, 2026-07-20)

Every committee session ends with a ready-to-run research brief that a **fresh chat** can pick up to research the issues the committee raised and propose fixes. Do this in the same turn, after the save:

1. **Build the brief** from the seats' `⚠️`/`❌` verdicts and any open concern (skip anything already resolved this turn — say so honestly rather than pad it). It MUST be self-contained: name the committee session + date, link `logs/committee/<file>.html`, list each open issue with the seat that raised it and its concern, name the relevant repo files/surfaces, and state the ask — *research each issue, cite what you find, propose fixes as options (recommended + why), do NOT implement*. Carry the house rules into it: free checks first, one Darren-Method phase at a time, Carl green-lights every build, and the current-stage guardrail (at validation stage, research-for-later — no new builds until the corridor metric is in).
2. **Store it** in the HTML log's `{{HANDOFF_PROMPT}}` slot (the "Research handoff" section) so it lives with the record.
3. **Surface it** as a copy-paste block in chat, AND create a `spawn_task` chip (title = the research, prompt = the brief verbatim) so Carl can one-click it into a new session. The chip only fires when he clicks — never auto-runs.
4. If the committee was a clean ✅ with nothing left open, say the handoff is empty this time — don't manufacture issues to research.

## Rules

- Committee output is **input to Carl's decision**, never a self-certification. A unanimous committee does not green-light a phase — only Carl does.
- Voices are lenses, not impersonations: channel each seat's published thinking and known positions; never fabricate quotes or claim the real person endorsed anything.
- If a seat's honest verdict is uncomfortable (e.g. Seibel: "no evidence managers return — stop building"), surface it undiluted. That's the point of the committee.
