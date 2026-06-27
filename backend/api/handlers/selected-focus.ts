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

export default async function selectedFocus(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const session = requireSession(asString(body.sessionId));
  const ids = Array.isArray(body.focusPointIds)
    ? body.focusPointIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
    : [];

  session.selectedFocusPoints = ids;
  persistSession(session);
  c.json(200, { selectedFocusPoints: ids });
}
