// The guided-sessions service (monthly-checkin Phase 1). Owns the rules of a manager-walked
// 1:1: create it for one of the caller's roster people, auto-save the draft as they walk the
// stages, and complete it. Every op is fenced to the caller's orgId + managerId (and, for
// create/list, to their OWN roster person); a miss answers "not found", never "forbidden"
// (don't confirm the row exists). The interview pipeline is untouched — own table, own service.

import { pgGuidedSessionsRepo } from "./guided-sessions.repo.ts";
import type { GuidedSessionsRepo, GuidedSessionRow, GuidedSessionState } from "./guided-sessions.repo.ts";
import { pgPeopleRepo } from "../team/people.repo.ts";
import { trackersService } from "../trackers/trackers.service.ts";
import { pgBlockScoresRepo, SCORE_BLOCKS, type BlockScoresRepo, type ScoreBlock } from "./block-scores.repo.ts";
import { badRequest, notFound } from "../../middleware/http-error.ts";
import type { GuidedWrapupInput, GuidedWrapupResult } from "../../../engine/guided/wrapup.ts";

/** The slice of the trackers service the guided service needs: resolve a Catch-up promise
 *  (complete) + read the person's trackers (wrap-up assembly). */
export interface TrackerGateway {
  applyOutcome(id: string, orgId: string, managerId: string, outcome: string): Promise<unknown>;
  listForPerson(
    personId: string,
    orgId: string,
    managerId: string,
    opts?: { includeArchived?: boolean },
  ): Promise<{ promises: unknown[]; requests: unknown[]; goals: unknown[] }>;
}

/** The injected AI boundary — the real engine (wired in guided-runtime.ts), a fake in tests so
 *  service unit tests never touch a model. */
export type GuidedWrapupFn = (
  input: GuidedWrapupInput,
  session?: { id?: string; dir: string },
) => Promise<GuidedWrapupResult>;

const rejectWrapup: GuidedWrapupFn = () =>
  Promise.reject(new Error("guided wrap-up boundary not provided"));

/** One session's block score, as the runner reads it for the last-time marker + trends. */
export interface BlockScoreDto {
  block: string;
  score: number;
  note: string | null;
  guidedSessionId: string;
  createdAt: string;
}

// Rating scores are 1.0–10.0 in 0.5 steps. Anything else is a tampered draft — reject, never store.
function validScore(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 10) return null;
  return Math.round(n * 2) === n * 2 ? n : null;
}

// Pull the rated blocks out of state.rating (scores + optional per-block notes). Unrated blocks
// are skipped; an out-of-range/off-step score throws (aborts complete() before anything is written).
function collectBlockScores(
  state: GuidedSessionState,
): { block: ScoreBlock; score: number; note: string | null }[] {
  const rating = state.rating;
  if (!rating || typeof rating !== "object" || Array.isArray(rating)) return [];
  const r = rating as Record<string, unknown>;
  const asMap = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const scoreMap = asMap(r.scores);
  const noteMap = asMap(r.blockNotes);
  const out: { block: ScoreBlock; score: number; note: string | null }[] = [];
  for (const block of SCORE_BLOCKS) {
    const raw = scoreMap[block];
    if (raw === undefined || raw === null || raw === "") continue; // unrated block
    const s = validScore(raw);
    if (s === null) throw badRequest(`Invalid score for ${block} — must be 1.0–10.0 in 0.5 steps`);
    const noteRaw = noteMap[block];
    const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 500) : null;
    out.push({ block, score: s, note });
  }
  return out;
}

const GUIDED_STATE_VERSION = 1;
const MONTHLY_ARC = "monthly_check_in";
const FIRST_STAGE = "catchup";
// The runner stages of the monthly arc + the terminal "done". PATCH validates the stage
// against this so a tampered value can't land a nonsense stage. When arc #2 arrives this
// widens to the union of all arcs' stages (architecture.md §2b).
const VALID_STAGES = new Set([
  "catchup",
  "requests",
  "rating",
  "feedback",
  "goals",
  "summary",
  "wrapup",
  "done",
]);

/** The narrow person lookup the guided service needs: a fenced name resolve. Backed by the
 *  people repo in production; a fake in tests. */
export interface GuidedPeopleGateway {
  findForManager(id: string, orgId: string, managerId: string): Promise<{ id: string; name: string } | null>;
}

const defaultPeopleGateway: GuidedPeopleGateway = {
  findForManager: (id, orgId, managerId) => pgPeopleRepo.findForManager(id, orgId, managerId),
};

/** What the runner receives — dates as ISO strings, state passed through. */
export interface GuidedSessionDto {
  id: string;
  personId: string;
  personName: string;
  stage: string;
  state: GuidedSessionState;
  engagement: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function toDto(row: GuidedSessionRow): GuidedSessionDto {
  return {
    id: row.id,
    personId: row.personId,
    personName: row.personName,
    stage: row.stage,
    state: row.state,
    engagement: row.engagement,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

// state arrives from the client on each auto-save. Keep the runner's spine sane (v/arc/step/
// visited) and store the per-stage drafts verbatim — the client owns their shape. Reject a
// non-object outright; never corrupt a good draft by over-validating.
function coerceState(input: unknown): GuidedSessionState {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw badRequest("state must be an object");
  }
  const s = input as Record<string, unknown>;
  const step = typeof s.step === "number" && Number.isFinite(s.step) ? s.step : 0;
  const visited = Array.isArray(s.visited) ? s.visited.filter((n): n is number => typeof n === "number") : [];
  const arc = typeof s.arc === "string" ? s.arc : MONTHLY_ARC;
  const v = typeof s.v === "number" ? s.v : GUIDED_STATE_VERSION;
  return { ...s, v, arc, step, visited };
}

// Read the Catch-up promise outcomes out of state — a { promiseId: "yes"|"partly"|"no"|
// "changed" } map the runner writes as the manager taps the chips. Applied to the real
// tracker rows at complete(). Defensive: a missing/garbage shape yields no outcomes.
function readOutcomes(state: GuidedSessionState): Record<string, string> {
  const catchup = state.catchup;
  if (!catchup || typeof catchup !== "object" || Array.isArray(catchup)) return {};
  const raw = (catchup as Record<string, unknown>).outcomes;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v) out[k] = v;
  }
  return out;
}

// Read the private engagement out of state.wrapup for denormalization at complete().
// Defensive — absent/empty in Phase 1 (the wrap-up UI arrives in Phase 4), so returns null.
function readEngagement(state: GuidedSessionState): number | null {
  const wrapup = state.wrapup;
  if (wrapup && typeof wrapup === "object" && !Array.isArray(wrapup)) {
    const e = (wrapup as Record<string, unknown>).engagement;
    if (typeof e === "number" && Number.isFinite(e)) return e;
  }
  return null;
}

// Defensive readers for the state blob (Phase 5 assembly).
function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(asStr) : [];
}

// The cached wrap-up the client persisted after a prior draft (summary → state.summary.draft,
// suggestions → state.wrapup.suggestions). Presence of a summary draft ⇒ "already drafted",
// so re-entering Summary never re-spends (Phase 5 scenario 4).
function readCachedWrapup(
  state: GuidedSessionState,
): { summary: { headline: string; bullets: string[] }; suggestions: { individual: string[]; team: string[]; company: string[] } } | null {
  const draft = asObj(asObj(state.summary).draft);
  const headline = asStr(draft.headline);
  const bullets = asStrArr(draft.bullets);
  if (!headline && bullets.length === 0) return null;
  const sug = asObj(asObj(state.wrapup).suggestions);
  return {
    summary: { headline, bullets },
    suggestions: { individual: asStrArr(sug.individual), team: asStrArr(sug.team), company: asStrArr(sug.company) },
  };
}

export interface GuidedSessionsService {
  create(orgId: string, managerId: string, input: { personId: unknown }): Promise<GuidedSessionDto>;
  get(id: string, orgId: string, managerId: string): Promise<GuidedSessionDto>;
  listForPerson(personId: string, orgId: string, managerId: string): Promise<{ sessions: GuidedSessionDto[] }>;
  patch(
    id: string,
    orgId: string,
    managerId: string,
    input: { stage?: unknown; state?: unknown },
  ): Promise<GuidedSessionDto>;
  complete(id: string, orgId: string, managerId: string): Promise<GuidedSessionDto>;
  /** This person's block scores across sessions — for the Rating stage's last-time marker. */
  listBlockScores(personId: string, orgId: string, managerId: string): Promise<{ scores: BlockScoreDto[] }>;
  /** Draft (or return the cached) end-of-session AI wrap-up: Summary + private suggestions. */
  wrapupDraft(
    id: string,
    orgId: string,
    managerId: string,
    opts?: { regenerate?: boolean },
  ): Promise<GuidedWrapupResult & { cached: boolean }>;
}

export function createGuidedSessionsService(
  repo: GuidedSessionsRepo = pgGuidedSessionsRepo,
  people: GuidedPeopleGateway = defaultPeopleGateway,
  trackers: TrackerGateway = trackersService,
  blockScores: BlockScoresRepo = pgBlockScoresRepo,
  wrapup: GuidedWrapupFn = rejectWrapup,
): GuidedSessionsService {
  /** The caller's own session or a 404 — the fence everything else builds on. */
  async function owned(id: string, orgId: string, managerId: string): Promise<GuidedSessionRow> {
    const row = await repo.findForManager(id, orgId, managerId);
    if (!row) throw notFound("Guided session not found");
    return row;
  }

  /** The caller's own roster person or a 404 (never confirm someone else's exists). */
  async function ownedPerson(
    personId: string,
    orgId: string,
    managerId: string,
  ): Promise<{ id: string; name: string }> {
    const person = await people.findForManager(personId, orgId, managerId);
    if (!person) throw notFound("Person not found");
    return person;
  }

  // Build the grounded wrap-up input: this session's notes/outcomes/scores/feedback/trackers +
  // the PREVIOUS completed check-in's summary + scores (for the deltas). Reads real rows through
  // the injected deps, so the wrap-up test stays model-free AND db-free with fakes.
  async function assembleWrapupInput(
    row: GuidedSessionRow,
    orgId: string,
    managerId: string,
  ): Promise<GuidedWrapupInput> {
    const state = row.state;
    const grouped = await trackers.listForPerson(row.personId, orgId, managerId);
    const promises = grouped.promises as Array<Record<string, unknown>>;
    const requests = grouped.requests as Array<Record<string, unknown>>;
    const goals = grouped.goals as Array<Record<string, unknown>>;

    const blockRows = await blockScores.listForPerson(row.personId, orgId);
    const lastByBlock: Record<string, number> = {};
    for (const b of blockRows) if (b.guidedSessionId !== row.id) lastByBlock[b.block] = b.score; // oldest-first → most recent prior wins

    const scoresMap = asObj(asObj(state.rating).scores);
    const scores = SCORE_BLOCKS.filter((blk) => scoresMap[blk] != null).map((blk) => ({
      block: blk,
      score: Number(scoresMap[blk]),
      last: lastByBlock[blk] ?? null,
    }));

    const outcomes = asObj(asObj(state.catchup).outcomes);
    const byId = new Map(promises.map((p) => [asStr(p.id), p]));
    const promiseOutcomes = Object.entries(outcomes).map(([pid, o]) => {
      const p = byId.get(pid);
      return { promise: p ? asStr(p.text) : "(a promise)", owner: p ? asStr(p.owner) : "", outcome: asStr(o) };
    });

    const prior = (await repo.listForPerson(row.personId, orgId, managerId)).filter(
      (s) => s.id !== row.id && s.completedAt,
    );
    prior.sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
    const prev = prior[0];
    let previous: Record<string, unknown> | null = null;
    if (prev) {
      const prevSummary =
        asStr(asObj(prev.state.summary).edited) || asStr(asObj(asObj(prev.state.summary).draft).headline);
      const prevScores = blockRows
        .filter((b) => b.guidedSessionId === prev.id)
        .map((b) => ({ block: b.block, score: b.score }));
      previous = { summary: prevSummary || null, scores: prevScores };
    }

    return {
      personName: row.personName,
      thisSession: {
        catchupNotes: asStr(asObj(state.catchup).notes),
        promiseOutcomes,
        scores,
        feedback: asObj(state.feedback),
        requests: requests.map((r) => ({ text: asStr(r.text), status: asStr(r.status) })),
        goals: goals.map((g) => ({ text: asStr(g.text), progress: Number(g.progress ?? 0), status: asStr(g.status) })),
        managerNotes: asStr(asObj(state.summary).edited),
      },
      previous,
    };
  }

  return {
    async create(orgId, managerId, input) {
      const person = await ownedPerson(String(input.personId ?? ""), orgId, managerId);
      const state: GuidedSessionState = {
        v: GUIDED_STATE_VERSION,
        arc: MONTHLY_ARC,
        step: 0,
        visited: [0],
      };
      const row = await repo.insert({
        orgId,
        managerId,
        personId: person.id,
        personName: person.name,
        stage: FIRST_STAGE,
        state,
      });
      return toDto(row);
    },

    async get(id, orgId, managerId) {
      return toDto(await owned(id, orgId, managerId));
    },

    async listForPerson(personId, orgId, managerId) {
      const person = await ownedPerson(personId, orgId, managerId);
      const rows = await repo.listForPerson(person.id, orgId, managerId);
      return { sessions: rows.map(toDto) };
    },

    async patch(id, orgId, managerId, input) {
      const row = await owned(id, orgId, managerId);
      if (row.completedAt) throw badRequest("This check-in is already finished");
      const patch: { stage?: string; state?: GuidedSessionState } = {};
      if (input.stage !== undefined) {
        const stage = String(input.stage);
        if (!VALID_STAGES.has(stage)) throw badRequest("Unknown stage");
        patch.stage = stage;
      }
      if (input.state !== undefined) patch.state = coerceState(input.state);
      await repo.update(row.id, patch);
      return toDto({ ...row, ...patch });
    },

    async complete(id, orgId, managerId) {
      const row = await owned(id, orgId, managerId);
      if (row.completedAt) return toDto(row); // idempotent — a double-fire never double-writes
      // Phase 3: validate the six-block scores FIRST, so a tampered/out-of-range value aborts the
      // whole complete() before anything is written (QA: 0/11/7.3 → error, nothing in the DB).
      const scoreRows = collectBlockScores(row.state);
      // Phase 2: apply the Catch-up promise outcomes to the real tracker rows. Best-effort per
      // row — a since-deleted or foreign promise id must never block finishing the 1:1.
      for (const [promiseId, outcome] of Object.entries(readOutcomes(row.state))) {
        try {
          await trackers.applyOutcome(promiseId, orgId, managerId, outcome);
        } catch (e) {
          console.warn("[guided] outcome apply skipped:", promiseId, e instanceof Error ? e.message : String(e));
        }
      }
      // Phase 3: upsert the block scores (idempotent on the (session, block) unique key).
      if (scoreRows.length) {
        await blockScores.upsert(
          scoreRows.map((r) => ({
            orgId,
            guidedSessionId: row.id,
            personId: row.personId,
            block: r.block,
            score: r.score,
            note: r.note,
          })),
        );
      }
      const completedAt = new Date();
      const engagement = readEngagement(row.state);
      // (the AI wrap-up lands in Phase 5.)
      await repo.update(row.id, { stage: "done", completedAt, engagement });
      return toDto({ ...row, stage: "done", completedAt, engagement });
    },

    async listBlockScores(personId, orgId, managerId) {
      await ownedPerson(personId, orgId, managerId);
      const rows = await blockScores.listForPerson(personId, orgId);
      return {
        scores: rows.map((r) => ({
          block: r.block,
          score: r.score,
          note: r.note,
          guidedSessionId: r.guidedSessionId,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    },

    async wrapupDraft(id, orgId, managerId, opts) {
      const row = await owned(id, orgId, managerId);
      // Cached unless ?regenerate — the client persists the draft into state after the first call,
      // so re-entering Summary never re-spends.
      if (!opts?.regenerate) {
        const cached = readCachedWrapup(row.state);
        if (cached) return { ...cached, runId: "cached", cached: true };
      }
      const input = await assembleWrapupInput(row, orgId, managerId);
      const result = await wrapup(input, { id: row.id, dir: row.id });
      return { ...result, cached: false };
    },
  };
}
