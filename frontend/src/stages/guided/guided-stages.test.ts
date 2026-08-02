import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGE_RENDERERS, type RenderCtx } from "./guided-stages.ts";
import type { CopyCtx } from "./coaching-copy.ts";
import type { GuidedState } from "./guided.types.ts";

// The question card is built as an HTML string and written with root.innerHTML, and the
// question stem carries the roster person's name. A person named with a script payload
// used to reach the DOM unescaped and run in the manager's session.

const PAYLOAD = `<img src=x onerror="alert(1)">`;

function copyWith(name: string): CopyCtx {
  return { name, full: name, requestCount: 0, goalCount: 0 };
}

const CTX: RenderCtx = { trackers: {} as RenderCtx["trackers"], lastScores: {}, lastEngagement: null };

function feedbackBody(name: string): string {
  const state = { v: 1, arc: "monthly", step: 3, visited: [0] } as unknown as GuidedState;
  return STAGE_RENDERERS.feedback(state, copyWith(name), CTX).body;
}

test("a person's name cannot inject markup into the question card", () => {
  const body = feedbackBody(PAYLOAD);
  assert.ok(!body.includes("<img"), "raw <img must not reach the markup");
  assert.ok(!body.includes('onerror="alert(1)"'), "the handler must not survive as an attribute");
  assert.ok(body.includes("&lt;img"), "the name renders as visible text instead");
});

test("an ordinary name still renders as readable copy", () => {
  const body = feedbackBody("Aisha");
  assert.ok(body.includes("Aisha"), "the name is still shown");
  assert.ok(body.includes("gd-q__stem"), "the question card is still built");
});
