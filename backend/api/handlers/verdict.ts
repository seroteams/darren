import { requireSession, persistSession } from "../sessions.ts";
import type { RequestContext } from "../router.ts";
import type { TesterVerdict } from "../../shared/session.types.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

type Verdict = TesterVerdict["verdict"];
type IssueType = Exclude<TesterVerdict["issue_type"], null>;

function isVerdict(v: unknown): v is Verdict {
  return v === "keep" || v === "fix" || v === "block";
}
const ISSUE_TYPES = new Set<string>([
  "too_generic",
  "wrong_level",
  "bad_tone",
  "over_inferred",
  "missed_focus",
  "weak_action",
]);
function isIssueType(v: unknown): v is IssueType {
  return typeof v === "string" && ISSUE_TYPES.has(v);
}

// Structured tester verdict — the ground truth the Suggest-fix step consumes.
export default async function verdict(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const session = requireSession(asString(body.sessionId));
  const verdictValue = body.verdict;
  const issueType = body.issue_type;
  const note = body.note;

  if (!isVerdict(verdictValue))
    return c.error(Object.assign(new Error("invalid verdict"), { status: 400 }));
  if (issueType && !isIssueType(issueType))
    return c.error(Object.assign(new Error("invalid issue_type"), { status: 400 }));

  session.verdict = {
    verdict: verdictValue,
    issue_type: isIssueType(issueType) ? issueType : null,
    note: typeof note === "string" ? note.trim() || null : null,
    at: Date.now(),
  };
  persistSession(session);
  c.json(200, { ok: true, verdict: session.verdict });
}
