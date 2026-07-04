// Shared sessions runtime: the single service instance (repo + injected engine
// boundaries) plus the id-resolution and caller-fence helpers. Both the thin
// controller (JSON reads/writes) and the SSE stream handlers import from here,
// so there is exactly one service singleton and one live-session wall.

import type { RequestContext } from "../../router.ts";
import { createSessionsService } from "./sessions.service.ts";
import type { Prewarm, DraftAnswers, ReviewLexicon } from "./sessions.service.ts";
import { fileSessionsRepo, pgSessionsRepo } from "./sessions.repo.ts";
import { hasDatabaseUrl } from "../../../db/client.ts";
import { buildIdentity } from "../../middleware/request-context.ts";
import { ensureRoleProfile } from "../../../engine/role-profile.ts";
import { generateFocusPoints } from "../../../engine/generate.ts";
import { suggestAnswers as draftAnswersEngine } from "../../../engine/answer-suggester.ts";
import { generateSuggestions } from "../../../engine/lexicon-reviewer.ts";
import { asString } from "../../../shared/guards.ts";

export const IS_DEV = process.env.NODE_ENV !== "production";

// The real AI pre-warm wired into the service's injected boundary: role profile
// first (cache hit adds ~0ms), then focus points — so every stage finds the
// profile on disk. Fire-and-forget, exactly as the legacy /start handler did.
const prewarm: Prewarm = (session, ctx) => {
  ensureRoleProfile(ctx, { session: { id: session.id, dir: session.dir } })
    .catch((e) => {
      console.warn(`[prewarm] role profile failed for ${session.id} (continuing):`, e?.message ?? e);
      return null;
    })
    .then(() => generateFocusPoints(ctx, { session: { id: session.id, dir: session.dir } }))
    .then((result) => {
      session.focusPointsResult = result;
    })
    .catch((e) => {
      console.warn(`[prewarm] focus points failed for ${session.id} (stage will retry live):`, e?.message ?? e);
    });
};

// The real model calls wired into the S3 injected boundaries (deferred paid walk).
const draftAnswers: DraftAnswers = (i) =>
  draftAnswersEngine({
    ...i.ctx,
    question: i.question,
    questionLabel: i.questionLabel,
    questionDescription: i.questionDescription,
    transcript: i.transcript,
  });
const reviewLexicon: ReviewLexicon = (i) => generateSuggestions({ session: i.session, ctx: i.ctx });

// Same interface, swappable storage (Phase 005): Postgres when DATABASE_URL is set,
// else the file-backed repo — so the app still runs with no database configured.
const repo = hasDatabaseUrl() ? pgSessionsRepo : fileSessionsRepo;
export const service = createSessionsService(repo, { prewarm, draftAnswers, reviewLexicon });

// Reads take the id from the path (v1) or ?s= (legacy).
export function sessionId(c: RequestContext): string {
  return c.params.id || c.query.s || "";
}
// Writes take it from the path (v1) or the body's sessionId (legacy).
export function writeId(c: RequestContext, body: Record<string, unknown>): string {
  return c.params.id || asString(body.sessionId) || "";
}

// The caller's company + person from the session cookie — the live-session wall (auth-
// hardening Phase 1 + member-nav Phase 2). Both null for an anonymous request.
export async function callerFence(c: RequestContext): Promise<{ orgId: string | null; userId: string | null }> {
  const identity = await buildIdentity(c.req);
  return { orgId: identity.orgId, userId: identity.userId };
}
// Assert the caller owns this session before we touch it. A cross-company OR cross-member
// id throws 404 inside service.require — so a member can't read, write, or even confirm
// the existence of another member's (or another company's) session.
export async function assertOwner(c: RequestContext, id: string): Promise<void> {
  const { orgId, userId } = await callerFence(c);
  service.require(id, orgId, userId);
}
