// Thin controller — resolve the request, call the service, format the response.
// No logic, no storage. Phase 004 step 3, sub-phase S1a: the first sessions reads.
//
// v1 puts the session id in the PATH (/api/v1/sessions/:id/…, decision D4); the
// legacy /api/ aliases pass it as ?s=<id>. One controller fn serves both route
// variants — resolve the id here, the service just takes the string (storage-
// agnostic). This id resolution is the only wiring delta vs the other domains.

import type { RequestContext } from "../../router.ts";
import { createSessionsService } from "./sessions.service.ts";
import type { Prewarm } from "./sessions.service.ts";
import { fileSessionsRepo } from "./sessions.repo.ts";
import { ensureRoleProfile } from "../../../engine/role-profile.ts";
import { generateFocusPoints } from "../../../engine/generate.ts";

// The real AI pre-warm wired into the service's injected boundary: role profile
// first (cache hit adds ~0ms), then focus points — so every stage finds the
// profile on disk. Fire-and-forget, exactly as the legacy /start handler did.
const prewarm: Prewarm = (session, ctx) => {
  ensureRoleProfile(ctx, { session: { id: session.id, dir: session.dir } })
    .catch(() => null)
    .then(() => generateFocusPoints(ctx, { session: { id: session.id, dir: session.dir } }))
    .then((result) => {
      session.focusPointsResult = result;
    })
    .catch(() => {});
};

const service = createSessionsService(fileSessionsRepo, prewarm);

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// Reads take the id from the path (v1) or ?s= (legacy).
function sessionId(c: RequestContext): string {
  return c.params.id || c.query.s || "";
}
// Writes take it from the path (v1) or the body's sessionId (legacy).
function writeId(c: RequestContext, body: Record<string, unknown>): string {
  return c.params.id || asString(body.sessionId) || "";
}

// GET /api/v1/sessions/:id  ·  GET /api/session?s=<id>
export function snapshot(c: RequestContext): void {
  c.json(200, service.getSnapshot(sessionId(c)));
}

// GET /api/v1/sessions/:id/lexicon/scope  ·  GET /api/lexicon/scope?s=<id>
export function lexiconScope(c: RequestContext): void {
  c.json(200, service.lexiconScope(sessionId(c)));
}

// GET /api/v1/sessions/:id/role-profile  ·  GET /api/role-profile?s=<id>
export function roleProfile(c: RequestContext): void {
  c.json(200, service.roleProfile(sessionId(c)));
}

// GET /api/v1/sessions/:id/preview  ·  GET /api/preview?s=<id>&stage=<stage>
export function preview(c: RequestContext): void {
  c.json(200, service.preview(sessionId(c), c.query.stage));
}

// GET /api/v1/sessions/:id/question  ·  GET /api/question?s=<id>
export function question(c: RequestContext): void {
  c.json(200, service.question(sessionId(c)));
}

// POST /api/v1/sessions  ·  POST /api/start
// Creates a session (the origin guard + per-IP rate limit live in server.ts, as
// today). 201 with the new session's id/dir/createdAt/introQueueLen.
export async function start(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(201, service.start(body));
}

// POST /api/v1/sessions/:id/answer  ·  POST /api/answer   (202, as today)
export async function answer(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(202, service.answer(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/back  ·  POST /api/back
export async function back(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.back(writeId(c, body)));
}

// POST /api/v1/sessions/:id/notes  ·  POST /api/notes
export async function notes(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.notes(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/agenda/cover  ·  POST /api/agenda/cover
export async function agendaCover(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.agendaCover(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/verdict  ·  POST /api/verdict
export async function verdict(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.verdict(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/focus-points/select  ·  POST /api/focus-points/select
export async function selectedFocus(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.selectedFocus(writeId(c, body), body));
}

// POST /api/v1/sessions/:id/lexicon/decisions  ·  POST /api/lexicon/decisions
export async function lexiconDecisions(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  c.json(200, service.lexiconDecisions(writeId(c, body), body));
}
