import test from "node:test";
import assert from "node:assert/strict";
import { assertNoUnresolvedPlaceholders, parseAIJson, assertNotTruncated } from "./ai-client.ts";

// H2 — output cap. Every model call sends a max_tokens ceiling; if the model
// stops because it hit that ceiling (OpenAI finish_reason "length" / Gemini
// "MAX_TOKENS"), the response is truncated — flag it clearly and non-retryably
// instead of letting it surface downstream as generic invalid JSON.
test("assertNotTruncated: throws a clear, non-retryable error when the token cap was hit", () => {
  for (const reason of ["length", "MAX_TOKENS"]) {
    let thrown: (Error & { retryable?: boolean }) | undefined;
    try {
      assertNotTruncated(reason, "Evaluator");
    } catch (e) {
      thrown = e as Error & { retryable?: boolean };
    }
    assert.ok(thrown, `expected a throw for finish reason "${reason}"`);
    assert.match(thrown.message, /truncat/i);
    assert.equal(thrown.retryable, false, "truncation must be non-retryable (no re-bill)");
  }
});

test("assertNotTruncated: passes when the model finished normally", () => {
  assert.doesNotThrow(() => assertNotTruncated("stop", "Evaluator"));
  assert.doesNotThrow(() => assertNotTruncated("STOP", "Evaluator"));
  assert.doesNotThrow(() => assertNotTruncated(undefined, "Evaluator"));
});

// Regression lock for the {{NAME}} leak found in CTOCheckJuly (findings-2): an old
// run shipped a brief whose coreIssue still read "…skills {{NAME}} needs…" — a raw
// template token in manager-facing text. Two guards now hard-block it: one before
// the model call (the prompt must be fully filled) and one after (the model must
// not echo a placeholder back). These tests fail loudly if either guard regresses.

test("assertNoUnresolvedPlaceholders: throws when a {{NAME}} token survives in the prompt", () => {
  assert.throws(
    () => assertNoUnresolvedPlaceholders("Discuss the skills {{NAME}} needs.", "test prompt"),
    /Unresolved prompt placeholders in test prompt: \{\{NAME\}\}/,
  );
});

test("assertNoUnresolvedPlaceholders: passes a fully-filled prompt", () => {
  assert.doesNotThrow(() =>
    assertNoUnresolvedPlaceholders("Discuss the skills Alex needs.", "test prompt"),
  );
});

test("parseAIJson: throws when the model output echoes a {{NAME}} placeholder", () => {
  const leaked = JSON.stringify({
    coreIssue: "communication skills {{NAME}} needs to develop",
    openingQuestion: "What communication challenges have you faced?",
  });
  assert.throws(
    () => parseAIJson(leaked, "Preparation model", ["coreIssue", "openingQuestion"]),
    /unresolved placeholders/,
  );
});

test("parseAIJson: returns clean JSON once the name is substituted", () => {
  const clean = JSON.stringify({
    coreIssue: "communication skills Alex needs to develop",
    openingQuestion: "What communication challenges have you faced?",
  });
  const out = parseAIJson(clean, "Preparation model", ["coreIssue", "openingQuestion"]) as Record<string, unknown>;
  assert.equal(out.coreIssue, "communication skills Alex needs to develop");
});
