import fs from "node:fs";
import path from "node:path";
import { requireSession } from "../sessions.ts";
import type { RequestContext } from "../router.ts";
import type { Session } from "../../shared/session.types.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const MAX_ANSWER_CHARS = 4000;

function isSkip(input: string): boolean {
  const s = (input || "").trim().toLowerCase();
  return s === "" || s === "skip" || s === "pass" || s === "-";
}

// Scripted test lane only: track which questions got a locked answer vs the
// per-persona fallback, so Compare can flag runs that drifted off-script.
function recordCoverage(session: Session, alias: string, answerSource: string): void {
  if (session.mode !== "scripted") return;
  const cov = session.scriptCoverage || {
    aliases_answered_by_script: [],
    aliases_missing_script: [],
    fallback_count: 0,
  };
  if (answerSource === "scripted") {
    if (alias && !cov.aliases_answered_by_script.includes(alias)) cov.aliases_answered_by_script.push(alias);
  } else if (answerSource === "fallback") {
    cov.fallback_count += 1;
    if (alias && !cov.aliases_missing_script.includes(alias)) cov.aliases_missing_script.push(alias);
  }
  session.scriptCoverage = cov;
  try {
    fs.writeFileSync(path.join(session.dir, "script-coverage.json"), JSON.stringify(cov, null, 2));
  } catch (e) {
    console.warn("[answer] coverage write failed:", e instanceof Error ? e.message : String(e));
  }
}

export default async function answer(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const { sessionId, answer, answerSource, alias } = body;
  const session = requireSession(asString(sessionId));

  if (session.turn >= session.totalBudget || session.queueRef.length === 0)
    return c.error(Object.assign(new Error("no question pending"), { status: 409 }));

  const raw = typeof answer === "string" ? answer : "";
  const truncated = raw.length > MAX_ANSWER_CHARS;
  const text = raw.slice(0, MAX_ANSWER_CHARS);
  const skipped = isSkip(text);
  session.pendingAnswer = { raw: text, skipped, text: skipped ? "(skipped)" : text };
  recordCoverage(session, asString(alias), asString(answerSource));
  c.json(202, { turn: session.turn + 1, skipped, truncated });
}
