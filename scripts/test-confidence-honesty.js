#!/usr/bin/env node
// Offline unit test for Phase 6 (engine-trust-gates): confidence honesty.
//   1. Concentration guard — a high-magnitude score from ≤2 distinct answer
//      excerpts caps confidence at medium and sets evidence_basis.
//   2. A high score from several distinct excerpts keeps high confidence.
//   3. Rule-echo guard — a meaning echoing rule-example framing ships at low
//      confidence (runtime) and trips RULE_ECHO_MEANING (gate warning), never
//      rewritten.

const { applyManagerBriefingPostProcess } = require("../backend/engine/reviewer.ts");
const { runMeaningRuleEchoCheck } = require("../backend/engine/golden-checks.ts");

let failed = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? `  —  ${detail}` : ""}`);
  }
}

function axis(id, score, meaning) {
  return { id, score, meaning, read_status: "read", confidence: "high", evidence_basis: "mixed" };
}

// History helper: n entries, `distinct` of them with unique excerpts.
function history(score, excerpts) {
  return excerpts.map((ex) => ({ q: "q_x", delta: score > 0 ? 3 : -3, answer_excerpt: ex }));
}

function briefingWith(axes) {
  return {
    headline: "h",
    summary_bullets: ["a", "b"],
    understanding_paragraph: "p",
    axes,
    brutal_truth_employee: "e",
    brutal_truth_manager: "m",
    next_actions: [{ when: "now", action: "x" }],
    watch_for: ["w"],
  };
}

console.log("\n─── confidence-honesty unit ───");

// 1. wellbeing -6 from one fact repeated across 3 turns → concentrated_signal, ≤ medium
{
  const b = briefingWith([axis("wellbeing", -6, "Carrying real strain after naming how stretched he feels.")]);
  const axisState = {
    wellbeing: { score: -6, history: history(-6, ["got a cold", "got a cold", "still a cold"]) },
  };
  // transcript carries explicit wellbeing evidence so the wellbeing-evidence
  // guard doesn't independently force low — isolating the concentration guard.
  const transcript = [{ answer: "he said he feels stretched and exhausted lately", skipped: false }];
  const out = applyManagerBriefingPostProcess(b, axisState, transcript);
  const wb = out.axes.find((a) => a.id === "wellbeing");
  check("one repeated fact → confidence capped at medium", wb.confidence === "medium", `confidence=${wb.confidence}`);
  check("one repeated fact → evidence_basis concentrated_signal", wb.evidence_basis === "concentrated_signal", `basis=${wb.evidence_basis}`);
}

// 2. growth +6 from 4 distinct excerpts → stays high
{
  const b = briefingWith([axis("growth", 6, "Owned the miss, named the cause, committed to a rule.")]);
  const axisState = {
    growth: { score: 6, history: history(6, ["admits the miss", "names retry cause", "writes a checklist", "commits to escalate"]) },
  };
  const transcript = [{ answer: "long substantive answer about the miss and the fix", skipped: false }];
  const out = applyManagerBriefingPostProcess(b, axisState, transcript);
  const g = out.axes.find((a) => a.id === "growth");
  check("four distinct excerpts → confidence stays high", g.confidence === "high", `confidence=${g.confidence}`);
}

// 3. rule-echo phrase in a wellbeing meaning → forced low + flagged, not rewritten
{
  const ECHO = "Weak wellbeing signal — mostly a clarity read from rushed handoffs and timelines.";
  const b = briefingWith([axis("wellbeing", -3, ECHO)]);
  const axisState = {
    wellbeing: { score: -3, history: history(-3, ["timelines tight", "handoffs slipping"]) },
  };
  const transcript = [{ answer: "he mentioned the timelines were tight this sprint", skipped: false }];
  const out = applyManagerBriefingPostProcess(b, axisState, transcript);
  const wb = out.axes.find((a) => a.id === "wellbeing");
  check("rule-echo meaning → confidence forced low", wb.confidence === "low", `confidence=${wb.confidence}`);
  check("rule-echo meaning is NOT rewritten (surfaced, not masked)", wb.meaning === ECHO, wb.meaning);
  check("rule-echo trips RULE_ECHO_MEANING gate check", runMeaningRuleEchoCheck(out).length > 0, JSON.stringify(runMeaningRuleEchoCheck(out)));
}

// 4. clean wellbeing meaning → no rule-echo flag
{
  const b = briefingWith([axis("wellbeing", -3, "He said the renewal pressure has been wearing on him.")]);
  check("clean meaning → no rule-echo flag", runMeaningRuleEchoCheck(b).length === 0, JSON.stringify(runMeaningRuleEchoCheck(b)));
}

// ── Single-touch cap (no-inference ruling, Phase 4 / S2) ────────────────────

// 5. A strong claim (|score| ≥ 3) standing on ONE answer → insufficient_signal,
//    not a score. One answer cannot carry a session-defining axis read.
{
  const b = briefingWith([axis("clarity", -4, "Direction feels murky to him.")]);
  const axisState = { clarity: { score: -4, history: history(-4, ["unsure what the goal is"]) } };
  const transcript = [{ answer: "long substantive answer about goals", skipped: false }];
  const out = applyManagerBriefingPostProcess(b, axisState, transcript);
  const c = out.axes.find((a) => a.id === "clarity");
  check("single-touch |score|≥3 → not_read", c.read_status === "not_read", `read_status=${c.read_status}`);
  check("single-touch |score|≥3 → insufficient_signal", c.not_read_reason === "insufficient_signal", `reason=${c.not_read_reason}`);
}

// 6. A small single-touch read (|score| = 2) survives, but capped: one answer
//    is one observable — never more than low confidence.
{
  const b = briefingWith([axis("clarity", -2, "Slightly unsure on direction.")]);
  const axisState = { clarity: { score: -2, history: history(-2, ["unsure what the goal is"]) } };
  const transcript = [{ answer: "long substantive answer about goals", skipped: false }];
  const out = applyManagerBriefingPostProcess(b, axisState, transcript);
  const c = out.axes.find((a) => a.id === "clarity");
  check("single-touch |score|=2 stays read", c.read_status === "read", `read_status=${c.read_status}`);
  check("single-touch read → confidence capped low", c.confidence === "low", `confidence=${c.confidence}`);
  check("single-touch read → basis concentrated_signal", c.evidence_basis === "concentrated_signal", `basis=${c.evidence_basis}`);
}

// 7. Two distinct touches at |score| ≥ 3 are NOT capped by the single-touch rule.
{
  const b = briefingWith([axis("clarity", -4, "Direction feels murky to him.")]);
  const axisState = { clarity: { score: -4, history: history(-4, ["unsure what the goal is", "asked twice who decides"]) } };
  const transcript = [{ answer: "long substantive answer about goals", skipped: false }];
  const out = applyManagerBriefingPostProcess(b, axisState, transcript);
  const c = out.axes.find((a) => a.id === "clarity");
  check("two touches |score|≥3 → stays read", c.read_status === "read", `read_status=${c.read_status}`);
}

console.log(`\n  ${failed === 0 ? "all confidence-honesty tests passed" : `${failed} confidence-honesty test(s) failed`}\n`);
process.exit(failed ? 1 : 0);
