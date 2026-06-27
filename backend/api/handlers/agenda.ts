import { requireSession, persistSession } from "../sessions.ts";
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

// POST /api/agenda/cover — records the closing-check answer ("Did you cover this?").
export default async function agendaCover(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const session = requireSession(asString(body.sessionId));
  session.agendaCovered = body.covered === true;
  persistSession(session);
  c.json(200, { ok: true, covered: session.agendaCovered });
}
