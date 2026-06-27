// POST /api/v1/checks/run (+ legacy /api/checks/run) — runs one free, offline
// check for the Tasks board button and returns pass/fail + a short summary. All
// the safety lives in the service (allow-list, refusal); this just parses the
// request and formats the reply.

import type { RequestContext } from "../../router.ts";
import { runFreeCheck } from "./checks.service.ts";

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

export default async function checks(c: RequestContext): Promise<void> {
  const body = await c.readBody();
  const check = isRecord(body) && typeof body.check === "string" ? body.check : "";
  // runFreeCheck throws a 400 for any non-free id; the router turns that into the
  // right error response.
  const result = runFreeCheck(check);
  c.json(200, result);
}
