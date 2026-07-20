---
name: committee
description: Convene Carl's advisory committee — eight named seats that pressure-test any plan or direction decision that matters. Trigger when Carl says "check with the committee", "ask the committee", "what would the committee say", or AUTOMATICALLY before locking in any plan (darren-method setup) or any direction choice that matters (engine design, product scope, GTM, pricing, trust/legal, evaluation strategy). Do NOT trigger for UI tweaks, copy changes, bugfixes, or routine phase work.
---

# The Committee

Carl's standing advisory board (created 2026-07-20). Advisory only — **Carl always decides**. The committee sharpens the decision; it never replaces his call.

## When to convene

- Carl says **"check with the committee"** (any wording close to it) → always convene.
- **Automatically** before: setting up a darren-method plan, choosing between meaningful product/engine/GTM directions, anything that changes what Sero *is* or *proves*.
- **Never** for: UI changes, styling, copy, bugfixes, refactors, routine phase execution, anything already decided.
- When unsure whether a decision "matters": if it would be expensive to reverse or shapes the validation-stage metric, it matters.

## The seats

| Seat | Voice | Pressure-tests | Register |
|------|-------|----------------|----------|
| Seed partner / traction | Michael Seibel (YC blunt-partner voice) | "How many managers prepped a real 1:1 last week? Do they come back?" Kills narrative-over-evidence. | Cold, numbers-first |
| Design leadership / trust UX | Rasmus Andersson (Nordic craft, restraint) | Chip count, progressive disclosure, "add nothing." Matches Sero's design system. | Craft, subtractive |
| Staff engineering / evals | Simon Willison (pragmatic LLM eval) | Determinism, logs, replay, "LLMs assist inside contracts." Guards final-evaluation miscalibration. | Skeptical, test-first |
| Observability | Charity Majors (optional 2nd eng seat) | "Can you debug this from the run log alone?" | Ops-hardened |
| Trust & legal | EU AI-Act counsel (role, not named) | No-Inference architecture, GDPR special-category data, no public legal-exemption claims. | Conservative |
| Management science / org-psych | Steven Rogelberg (Glad We Met) | Are the four arcs sound? Is prep the real lever? | Evidence-bound |
| GTM / positioning | April Dunford (Obviously Awesome) | Honesty-as-credibility, buyer-fork discipline, no dashboard drift. | Sharp, category-first |
| Real user | Kate Jackson (Siemens, actual tester) | "Would a real EM open this twice?" | Practitioner |

## How to run a session

1. State the decision in one plain sentence (the question the committee is answering).
2. Pick the **relevant seats only** — usually 3–5. Not every seat speaks on every decision (the EU counsel has nothing to say about a question-bank tweak; Seibel has nothing to say about a legal wording). Convening all 8 every time is noise.
3. For each seat, channel the named lens honestly: 1–2 sentences of verdict or objection, in that seat's register. Objections must be concrete ("this adds a third chip — cut it"), not generic caution.
4. **Kate Jackson's seat is grounded ONLY in her actual recorded feedback** (session notes, run logs, emails). If there is no real Kate signal on the question, say "no real signal from Kate on this" — never invent her opinion.
5. Synthesise: where the seats agree, where they clash, and your recommendation.

## How to present it to Carl

Carl-style. The committee table is a STANDING EXCEPTION to the postcard cap (like review tables): the table may run long, prose around it may not.

- 🟡 **YOUR TURN — decide** banner, then the decision in one plain line.
- **The committee table** (Carl chose this format 2026-07-20) — one row per speaking seat, columns:

| Seat | Who | Verdict | What they said | Register |
|------|-----|---------|----------------|----------|
| Seed partner / traction | Michael Seibel | ✅ / ⚠️ / ❌ | 1–2 sentences in the seat's own voice and register | Cold, numbers-first |

  Verdict marks: ✅ back it · ⚠️ back it with a change (name the change) · ❌ against (say why). "What they said" is written in-character — blunt for Seibel, subtractive for Rasmus, etc. — never generic.
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
