// Finished-run history + Run Review logic: list/read runs, delete/archive, and
// write a review verdict. Never touches req/res or storage — data access goes
// through the injected repo. reviewStatusOf/REVIEW_DIM_KEYS are pure engine
// helpers (no I/O), so they're used directly.

import { badRequest, notFound } from "../../middleware/http-error.ts";
import { reviewStatusOf, REVIEW_DIM_KEYS } from "../../../engine/run-history.ts";
import type { RunsRepo } from "./runs.repo.ts";
import { isObjectRecord, asRecord } from "../../../shared/guards.ts";

// Manual overall verdict + the per-review note cap (mirrors the old handler).
const OVERALL_VALUES = ["keep", "fix", "block"];
const NOTE_CAP = 4000;

// Continuity Phase 2 — the four outcome answers for a prior agreed action, and the
// cap on the stored action label (a snapshot of the agreed text, for display + audit).
const OUTCOME_VALUES = ["yes", "partly", "no", "changed"] as const;
type OutcomeAnswer = (typeof OUTCOME_VALUES)[number];
const ACTION_LABEL_CAP = 500;

interface ReviewResult {
  ok: true;
  reviewStatus: string;
  overall: string | null;
  failedCount: number;
}

// Every method takes the caller's orgId (the company behind the cookie) so reads
// and run lookups are fenced to that company — the data wall (Phase 007/2). The
// controller derives it from the session; undefined/null = unfenced (legacy).
export interface RunsService {
  recent(limit: unknown, orgId?: string | null): { runs: unknown[] };
  finished(orgId?: string | null): { runs: unknown[] };
  overview(id: string | undefined, orgId?: string | null): unknown;
  full(id: string | undefined, orgId?: string | null): unknown;
  stages(id: string | undefined, orgId?: string | null): { id: string; stages: unknown };
  remove(id: string | undefined, orgId?: string | null): { deleted: true; id: string };
  archive(id: string | undefined, body: unknown, orgId?: string | null): { ok: true; id: string; archived: boolean | undefined };
  review(id: string | undefined, body: unknown, orgId?: string | null): ReviewResult;
  // Member-safe reads (member-nav Phase 2): a logged-in member's OWN finished runs, and
  // one own run's read-only view. Fenced by both orgId and userId; myRun 404s a run the
  // member doesn't own. `open` is the raw ?open= query value — the literal "1" also
  // includes the caller's started-but-unfinished preps (Team-for-managers).
  myFinished(orgId: string | null | undefined, userId: string | null | undefined, open?: unknown): { runs: unknown[] };
  // The 1:1s ABOUT the caller (people-roster Phase 5): runs stamped with a personId the
  // caller's account is linked to. LIST-ONLY by ruling — the service re-cuts every row
  // to { id, meetingType, lastSeenAt, completedAt, managerName } even if the repo
  // over-shares, so notes/briefings/ratings can never leak to the member.
  aboutMe(orgId: string | null | undefined, personIds: string[], managerNames: Record<string, string>): { runs: unknown[] };
  myRun(id: string | undefined, orgId: string | null | undefined, userId: string | null | undefined): unknown;
  // Rate one of the member's OWN 1:1s (pre-go-live PG3): 1-5 stars + optional note,
  // stored as a rating.json sidecar. Fenced by org AND user — a run the caller doesn't
  // own is a 404 (same answer a stranger gets), so ids can't be probed or rated.
  rateMine(id: string | undefined, body: unknown, orgId: string | null | undefined, userId: string | null | undefined): { ok: true; stars: number; note: string };
  // Record whether one of last time's agreed actions happened (continuity Phase 2):
  // { index, answer: yes|partly|no|changed, action? } onto the prior run's outcomes.json.
  // Same org+user fence as rateMine (a run you don't own → 404). The latest answer for an
  // index wins; only answered indices are stored, so skipping stays blank. Returns the
  // full merged map so the caller can re-render every mark from one response.
  setOutcomeMine(id: string | undefined, body: unknown, orgId: string | null | undefined, userId: string | null | undefined): { ok: true; index: number; answer: OutcomeAnswer; outcomes: Record<string, unknown> };
  // Dev-only "prefill a run" (admin-guarded at the route). clonable lists every finished
  // run on disk (unfenced) so there's always something to seed from; clone copies one into
  // a fresh run owned by the caller so it drops straight into their /mine.
  clonable(): { runs: unknown[] };
  clone(sourceId: string | undefined, orgId: string | null, userId: string | null): { id: string };
}

export function createRunsService(repo: RunsRepo): RunsService {
  // A missing run id is a 400 (id required), distinct from an unknown run (404).
  function requireId(id: string | undefined): string {
    if (!id) throw badRequest("id required");
    return id;
  }

  function review(id: string | undefined, body: unknown, orgId?: string | null): ReviewResult {
    const runId = requireId(id);
    const dir = repo.findRunDir(runId, orgId);
    if (!dir) throw notFound("unknown run");
    if (!isObjectRecord(body)) throw badRequest("invalid payload");
    const rawMarks = asRecord(body.marks);

    // Strict schema: only the known dimensions, only pass/fail/null. Unknown keys
    // are dropped; anything other than "pass"/"fail" becomes null.
    const marks: Record<string, "pass" | "fail" | null> = {};
    for (const key of REVIEW_DIM_KEYS) {
      const v = rawMarks[key];
      marks[key] = v === "pass" || v === "fail" ? v : null;
    }
    const rawOverall = body.overall;
    const overall = typeof rawOverall === "string" && OVERALL_VALUES.includes(rawOverall) ? rawOverall : null;
    const note = String(body.note != null ? body.note : "").slice(0, NOTE_CAP);

    const reviewStatus = reviewStatusOf({ marks });
    const failedCount = REVIEW_DIM_KEYS.filter((k) => marks[k] === "fail").length;
    const prev = repo.readReview(dir);
    const now = new Date().toISOString();

    const out = {
      version: 1,
      runId,
      reviewer: "carl",
      marks,
      overall,
      note,
      createdAt: isObjectRecord(prev) && prev.createdAt ? prev.createdAt : now,
      updatedAt: now,
    };

    try {
      repo.writeReview(dir, out);
    } catch (e) {
      // Surface the failure honestly: legacy keeps this message, v1 masks 5xx.
      throw Object.assign(new Error("review write failed: " + (e instanceof Error ? e.message : String(e))), {
        status: 500,
      });
    }
    return { ok: true, reviewStatus, overall, failedCount };
  }

  return {
    recent: (limit, orgId) => {
      const n = Math.max(1, Math.min(20, Number(limit) || 3));
      const runs = repo.listRecent(n, orgId).map((r) => {
        const o = asRecord(r);
        return {
          id: o.id,
          headline: o.headline,
          lastSeenAt: o.lastSeenAt,
          stage: o.stage,
          pipelineDigest: o.pipelineDigest,
          reviewStatus: o.reviewStatus,
        };
      });
      return { runs };
    },
    finished: (orgId) => ({ runs: repo.listFinished(orgId) }),
    myFinished: (orgId, userId, open) => ({ runs: repo.listFinishedForMember(orgId, userId, open === "1") }),
    aboutMe: (orgId, personIds, managerNames) => {
      if (!personIds.length) return { runs: [] }; // unlinked member — nothing to walk
      const runs = repo.listAboutPerson(orgId, personIds).map((r) => {
        const o = asRecord(r);
        return {
          id: o.id,
          meetingType: o.meetingType,
          lastSeenAt: o.lastSeenAt,
          completedAt: o.completedAt ?? null,
          managerName: (typeof o.managerId === "string" && managerNames[o.managerId]) || null,
        };
      });
      return { runs };
    },
    myRun: (id, orgId, userId) => {
      const view = repo.memberRun(requireId(id), orgId, userId);
      if (!view) throw notFound("unknown run");
      return view;
    },
    rateMine: (id, body, orgId, userId) => {
      const runId = requireId(id);
      // Ownership first: the run must be the caller's own (org + user). Not theirs /
      // unknown → 404, the same answer a stranger gets, so ids can't be probed.
      if (!repo.memberRun(runId, orgId, userId)) throw notFound("unknown run");
      if (!isObjectRecord(body)) throw badRequest("invalid payload");
      const stars = body.stars;
      if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) throw badRequest("stars must be an integer 1-5");
      // The note is a private manager field — trimmed + capped, never logged.
      const note = String(body.note != null ? body.note : "").trim().slice(0, NOTE_CAP);
      const dir = repo.findRunDir(runId, orgId);
      if (!dir) throw notFound("unknown run");
      const prev = repo.readRating(dir);
      const now = new Date().toISOString();
      const out = {
        version: 1,
        runId,
        stars,
        note,
        ratedBy: userId ?? null,
        createdAt: isObjectRecord(prev) && prev.createdAt ? prev.createdAt : now,
        updatedAt: now,
      };
      try {
        repo.writeRating(dir, out);
      } catch (e) {
        throw Object.assign(new Error("rating write failed: " + (e instanceof Error ? e.message : String(e))), { status: 500 });
      }
      return { ok: true, stars, note };
    },
    setOutcomeMine: (id, body, orgId, userId) => {
      const runId = requireId(id);
      // Ownership first — a run the caller doesn't own is a 404 (the stranger's answer),
      // so ids can't be probed or annotated.
      if (!repo.memberRun(runId, orgId, userId)) throw notFound("unknown run");
      if (!isObjectRecord(body)) throw badRequest("invalid payload");
      const index = body.index;
      if (typeof index !== "number" || !Number.isInteger(index) || index < 0) throw badRequest("index must be a non-negative integer");
      const answer = body.answer;
      if (typeof answer !== "string" || !OUTCOME_VALUES.includes(answer as OutcomeAnswer)) {
        throw badRequest("answer must be one of: " + OUTCOME_VALUES.join(", "));
      }
      // The action label is a snapshot of the agreed text for display — trimmed + capped.
      const action = String(body.action != null ? body.action : "").trim().slice(0, ACTION_LABEL_CAP);
      const dir = repo.findRunDir(runId, orgId);
      if (!dir) throw notFound("unknown run");
      const prev = repo.readOutcomes(dir);
      const now = new Date().toISOString();
      // Merge onto any prior answers — latest answer for THIS index wins, siblings untouched.
      const prevOutcomes = isObjectRecord(prev) && isObjectRecord(prev.outcomes) ? prev.outcomes : {};
      const outcomes: Record<string, unknown> = { ...prevOutcomes };
      outcomes[String(index)] = { action, answer, answeredBy: userId ?? null, updatedAt: now };
      const out = {
        version: 1,
        runId,
        outcomes,
        createdAt: isObjectRecord(prev) && prev.createdAt ? prev.createdAt : now,
        updatedAt: now,
      };
      try {
        repo.writeOutcomes(dir, out);
      } catch (e) {
        throw Object.assign(new Error("outcome write failed: " + (e instanceof Error ? e.message : String(e))), { status: 500 });
      }
      return { ok: true, index, answer: answer as OutcomeAnswer, outcomes };
    },
    overview: (id, orgId) => {
      const summary = repo.summarize(requireId(id), orgId);
      if (!summary) throw notFound("unknown run");
      return summary;
    },
    full: (id, orgId) => {
      const data = repo.compare(requireId(id), orgId);
      if (!data) throw notFound("unknown run");
      return data;
    },
    stages: (id, orgId) => {
      const runId = requireId(id);
      const data = repo.readStages(runId, orgId);
      if (!data) throw notFound("unknown run");
      return { id: runId, stages: data };
    },
    remove: (id, orgId) => {
      const runId = requireId(id);
      const result = repo.deleteRun(runId, orgId);
      if (!result.deleted) throw notFound("unknown run");
      repo.dropSession(runId);
      return { deleted: true, id: runId };
    },
    archive: (id, body, orgId) => {
      const runId = requireId(id);
      const result = repo.setArchived(runId, Boolean(asRecord(body).archived), orgId);
      if (!result.ok) throw notFound("unknown run");
      return { ok: true, id: runId, archived: result.archived };
    },
    review,
    clonable: () => ({ runs: repo.listFinished(null) }),
    clone: (sourceId, orgId, userId) => {
      const result = repo.cloneRun(requireId(sourceId), orgId, userId);
      if (!result) throw notFound("unknown run");
      return result;
    },
  };
}
