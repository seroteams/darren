// The agenda carry-forward (machar-fixes P2).
//
// The first corridor manager answered the opening with "nothing specific" and Sero spent
// a whole turn asking what he meant by nothing, having quietly added that turn to the
// meeting: "asking me the question on what does nothing specific mean is a wasted
// opportunity" (docs/validation/machar-2026-07-29.md, F2).
//
// The rule these tests pin: a real topic is carried forward, a polite decline is not, and
// the line between them is the one `read-quality.ts` already draws for every other stage.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { shouldCarryAgendaForward, summarizeAgenda, buildCarryForwardQuestion } from "./agenda.ts";

test("a real agenda is carried forward", () => {
  for (const text of [
    "his workload and the beta test date",
    "the app delivery date, and how the team is getting on",
    "nothing has improved on the handover, want to talk about that",
  ]) {
    assert.equal(shouldCarryAgendaForward({ text }), true, `dropped a real agenda: "${text}"`);
  }
});

test("a polite decline is not an agenda", () => {
  // Machar's exact answer first. The rest are the phrases read-quality already knows,
  // so the two paths can never disagree about what counts as a decline.
  for (const text of [
    "nothing specific",
    "Nothing specific.",
    "  nothing to add  ",
    "nothing from me",
    "no nothing",
    "happy to start",
  ]) {
    assert.equal(
      shouldCarryAgendaForward({ text }),
      false,
      `"${text}" would still cost the manager a question`,
    );
  }
});

test("a skip or an empty answer carries nothing", () => {
  assert.equal(shouldCarryAgendaForward({ skipped: true, text: "anything" }), false);
  assert.equal(shouldCarryAgendaForward({ text: "" }), false);
  assert.equal(shouldCarryAgendaForward({ text: "   " }), false);
  assert.equal(shouldCarryAgendaForward({}), false);
});

test("a bare 'nothing' is still a real answer", () => {
  // The decline list is deliberately multi-word. "nothing has changed since we spoke" is
  // signal, not a decline, and must not be swallowed by a loose match on "nothing".
  assert.equal(shouldCarryAgendaForward({ text: "nothing has changed since we spoke" }), true);
  assert.equal(shouldCarryAgendaForward({ text: "nothing is landing on time" }), true);
});

test("the stream asks the rule instead of re-deciding inline", () => {
  // The carry-forward lives inside planStream, AFTER the paid model call, so there is no
  // free way to drive it end to end. This guard covers the one regression that actually
  // happened: the decision being written inline again as "not skipped and not empty".
  // Path off the repo root, not import.meta: this file builds to CommonJS.
  const src = readFileSync(
    join(process.cwd(), "backend/api/services/sessions/session-streams.ts"),
    "utf8",
  ).replace(/^[ \t]*\/\/.*$/gm, "");

  const block = src.slice(src.indexOf('q.alias === "q_intro_agenda_check"'));
  assert.match(
    block.slice(0, 400),
    /shouldCarryAgendaForward\(pending\)/,
    "The carry-forward stopped consulting the rule. A decline would cost a question again.",
  );
  assert.ok(
    !/!pending\.skipped\s*&&\s*\n?\s*pending\.text\.trim\(\)/.test(block.slice(0, 400)),
    "The old inline test is back: not-skipped-and-not-empty treats 'nothing specific' as an agenda.",
  );
  // The extra turn is bought inside the same block, so guarding the block guards the budget.
  assert.match(
    block.slice(0, 700),
    /session\.totalBudget \+= 1/,
    "The budget bump moved out of the guarded block; a decline could grow the meeting again.",
  );
});

test("the carried question quotes the topic, not the whole ramble", () => {
  const raw = "the beta test, and then the app delivery date, and honestly the way the team has been handing work over between themselves";
  const summary = summarizeAgenda(raw);
  assert.ok(summary.length <= 81, `summary too long: ${summary.length}`);
  assert.ok(summary.startsWith("the beta test"), `lost the head of the answer: "${summary}"`);

  const q = buildCarryForwardQuestion(summary, "pulse");
  assert.match(q.name, /the beta test/);
  assert.equal(q.alias, "q_agenda_carry_forward");
  assert.equal(q.stage, "pulse");
});
