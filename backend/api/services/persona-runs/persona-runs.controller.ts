// Thin controller — parse the request, call the service, format the response.
// No logic, no storage. The origin guard on the mutating route lives in server.ts.
// This is also where the real engine + sessions boundaries get wired into the
// runner (adapters only, like suggest-fix's runFix).

import type { RequestContext } from "../../router.ts";
import { createPersonaRunsService } from "./persona-runs.service.ts";
import { createPersonaRunner } from "./persona-runs.runner.ts";
import { createSessionsService } from "../sessions/sessions.service.ts";
import { sessionsRepo } from "../sessions/session-runtime.ts";
import { createCatalogService } from "../catalog/catalog.service.ts";
import { fileCatalogRepo } from "../catalog/catalog.repo.ts";
import { loadPersona, scriptedQuestions } from "../../persona-script.ts";
import { ensureRoleProfile } from "../../../engine/role-profile.ts";
import { generateFocusPoints } from "../../../engine/generate.ts";
import { generatePreparation } from "../../../engine/preparation.ts";
import { planTurn } from "../../../engine/queue-manager.ts";
import { evaluate } from "../../../engine/reviewer.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { requireAdmin } from "../../middleware/require-auth.ts";
import { asRecord, asString } from "../../../shared/guards.ts";

// A QA sessions-service instance over the SAME live-session store as the web app,
// but with no pre-warm boundary — the runner makes every paid call itself, once.
const qaSessions = createSessionsService(sessionsRepo, {});
const catalog = createCatalogService(fileCatalogRepo);

const runner = createPersonaRunner({
  catalog: {
    findPersona: (id) => catalog.listPersonas().find((p) => asString(p.id) === id) ?? null,
  },
  loadScript: (personaId) => scriptedQuestions(loadPersona(personaId)),
  sessions: qaSessions,
  engine: {
    ensureRoleProfile: (ctx, opts) => ensureRoleProfile(ctx, opts),
    generateFocusPoints: (ctx, opts) => generateFocusPoints(ctx, opts),
    generatePreparation: (inputs, opts) => generatePreparation(inputs, opts),
    planTurn: (input) => planTurn(input as Parameters<typeof planTurn>[0]),
    evaluate: (input, opts) => evaluate(input as Parameters<typeof evaluate>[0], opts),
    // (evaluate's input is opaque unknown at this boundary; the runner builds the
    // exact shape evaluationStream builds, asserted here like suggest-fix's adapter.)
  },
});

const service = createPersonaRunsService({
  loadPersona,
  hasApiKey: () => Boolean(process.env.OPENAI_API_KEY),
  runner,
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
