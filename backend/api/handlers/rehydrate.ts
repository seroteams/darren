import { getSession, snapshot } from "../sessions.ts";
import type { RequestContext } from "../router.ts";

export default function rehydrate(c: RequestContext): void {
  const id = c.query.s;
  if (!id) return c.error(Object.assign(new Error("s required"), { status: 400 }));
  const session = getSession(id);
  if (!session) return c.error(Object.assign(new Error("unknown session"), { status: 404 }));
  c.json(200, snapshot(session));
}
