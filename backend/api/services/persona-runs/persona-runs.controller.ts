// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. The origin guard on the mutating route lives in server.ts.

import type { RequestContext } from "../../router.ts";
import { createPersonaRunsService } from "./persona-runs.service.ts";
import type { PersonaRunner } from "./persona-runs.service.ts";
import { loadPersona } from "../../persona-script.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin } from "../../middleware/require-auth.ts";
import { asRecord } from "../../../shared/guards.ts";

// Phase 1 stand-in — the real engine runner lands in Phase 2. An honest dry run:
// it says so on its label, spends nothing, and finishes by itself so the guard
// rails (single slot, status window) can be walked end to end today.
const dryRunner: PersonaRunner = async (_input, hooks) => {
  hooks.onProgress({ stageLabel: "Dry run — no engine yet (Phase 2 wires it)" });
  await new Promise((r) => setTimeout(r, 5000));
  return { sessionId: null, costUsd: null };
};

const service = createPersonaRunsService({
  loadPersona,
  hasApiKey: () => Boolean(process.env.OPENAI_API_KEY),
  runner: dryRunner,
});

// Persona runs are internal QA tooling: admin console roles only (same gate as
// the runs endpoints). The caller's company is stamped on the run so the Library
// shows it; QA runs carry no userId, so they never appear under "My runs".
async function callerOrgId(c: RequestContext): Promise<string | null> {
  const identity = await buildIdentity(c.req);
  requireAdmin(identity);
  return identity.orgId;
}

export async function start(c: RequestContext): Promise<void> {
  const orgId = await callerOrgId(c);
  const body = asRecord(await c.readBody());
  c.json(202, await service.start(body.personaId, orgId));
}

export async function current(c: RequestContext): Promise<void> {
  await callerOrgId(c);
  c.json(200, service.current());
}
