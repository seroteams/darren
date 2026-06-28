// Lexicon-review endpoint. GET /candidates triggers the AI reviewer (or returns
// the cached trace), maps suggestions to a UI-friendly shape. (POST /decisions —
// the non-AI write — moved into the sessions service in S2b; candidates is the
// remaining AI route and converts in S3.)

import { getSession } from "../sessions.ts";
import {
  generateSuggestions,
  suggestionId,
  shouldReview,
} from "../../engine/lexicon-reviewer.ts";
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

export { candidates };
