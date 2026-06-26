// Lexicon-review endpoints. GET /candidates triggers the AI reviewer (or
// returns the cached trace), maps suggestions to a UI-friendly shape. POST
// /decisions writes user's keeps into the candidate yaml via the same code
// path the CLI uses.

import fs from "node:fs";
import path from "node:path";
import { getSession } from "../sessions.ts";
import {
  generateSuggestions,
  commitDecisions,
  suggestionId,
  shouldReview,
} from "../../engine/lexicon-reviewer.ts";
import { listPendingPromotions, applyPromotionDecisions } from "../../engine/lexicon/promote-core.ts";
import type { RequestContext } from "../router.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type CommitResult = ReturnType<typeof commitDecisions>;

function describePhrase(s: Record<string, unknown>): string {
  if (s.type === "prefer_term") return asString(s.value);
  if (s.type === "prefer_phrase") return asString(s.value);
  if (s.type === "avoid_phrase") {
    return s.better_as ? `Avoid: "${asString(s.value)}" → try: "${asString(s.better_as)}"` : `Avoid: "${asString(s.value)}"`;
  }
  return asString(s.value);
}

function mapForUi(suggestions: unknown[]) {
  return suggestions.map((raw, i) => {
    const s = asRecord(raw);
    return {
      id: suggestionId({ type: typeof s.type === "string" ? s.type : undefined }, i),
      type: s.type,
      phrase: describePhrase(s),
      context: asString(s.reason) || asString(s.evidence) || "",
    };
  });
}

async function candidates(c: RequestContext): Promise<void> {
  const sessionId = c.query.s;
  if (!sessionId) {
    return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  }
  const session = getSession(sessionId);
  if (!session) {
    return c.json(404, { error: "session not found" });
  }
  if (!shouldReview(session.ctx)) {
    return c.json(200, { candidates: [], skipped: "out-of-scope" });
  }

  try {
    const result = await generateSuggestions({ session, ctx: session.ctx });
    if (result.skipped) {
      return c.json(200, { candidates: [], skipped: result.reason || "skipped", error: result.error || null });
    }
    return c.json(200, {
      candidates: mapForUi(result.suggestions || []),
      skipped: (result.suggestions || []).length ? null : "empty",
      fromCache: Boolean(result.fromCache),
    });
  } catch (e) {
    return c.error(Object.assign(new Error((e instanceof Error && e.message) || "lexicon review failed"), { status: 500 }));
  }
}

async function scope(c: RequestContext): Promise<void> {
  const sessionId = c.query.s;
  if (!sessionId) {
    return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  }
  const session = getSession(sessionId);
  if (!session) {
    return c.json(404, { error: "session not found" });
  }
  return c.json(200, { eligible: shouldReview(session.ctx) });
}

async function decisions(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const sessionId = body.sessionId;
  const list = body.decisions;
  if (typeof sessionId !== "string" || !sessionId) {
    return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  }
  const session = getSession(sessionId);
  if (!session) {
    return c.json(404, { error: "session not found" });
  }
  const records: unknown[] = Array.isArray(list) ? list : [];

  // Audit trail in session dir — full keep/drop log, regardless of scope.
  if (records.length) {
    const out = path.join(session.dir, "lexicon-decisions.jsonl");
    const line = records.map((r) => JSON.stringify({ ts: Date.now(), ...asRecord(r) })).join("\n") + "\n";
    fs.appendFileSync(out, line, "utf8");
  }

  // Roll keeps into candidate yaml when scope is reviewable.
  const keepIds = records
    .filter((r): r is Record<string, unknown> => isObjectRecord(r) && Boolean(r.keep))
    .map((r) => asString(r.id));
  let commit: CommitResult = { skipped: true, reason: "out-of-scope" };
  if (shouldReview(session.ctx)) {
    commit = commitDecisions({ session, ctx: session.ctx, keepIds });
  }

  const committed = "accepted" in commit && Array.isArray(commit.accepted) ? commit.accepted.length : 0;
  c.json(200, { ok: true, count: records.length, committed });
}

async function promotePending(c: RequestContext): Promise<void> {
  const items = listPendingPromotions();
  return c.json(200, { items, count: items.length });
}

async function promoteApply(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const list = body.decisions;
  const result = applyPromotionDecisions(Array.isArray(list) ? list : []);
  return c.json(200, { ok: true, ...result });
}

export { candidates, scope, decisions, promotePending, promoteApply };
