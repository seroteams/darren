import { listRecentRuns, listFinishedRuns, summarizeRun, compareRun, readRunStages, deleteRun, setArchived } from "../../engine/run-history.ts";
import { dropSession } from "../sessions.ts";
import type { RequestContext } from "../router.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function recent(c: RequestContext): void {
  const limit = Math.max(1, Math.min(20, Number(c.query.limit) || 3));
  const runs = listRecentRuns(limit).map(({ id, headline, lastSeenAt, stage, pipelineDigest, reviewStatus }) => ({
    id,
    headline,
    lastSeenAt,
    stage,
    pipelineDigest,
    reviewStatus,
  }));
  c.json(200, { runs });
}

// Library: all finished runs with review badge inputs (reviewStatus, overall,
// failedCount). Read-only, no limit.
function finished(c: RequestContext): void {
  c.json(200, { runs: listFinishedRuns() });
}

function overview(c: RequestContext): void {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const summary = summarizeRun(id);
  if (!summary) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));
  c.json(200, summary);
}

function full(c: RequestContext): void {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const data = compareRun(id);
  if (!data) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));
  c.json(200, data);
}

// Stage-by-stage I/O for the right-rail Sent/Reply tabs: what was fed to the AI
// and what came back, per stage. Read-only.
function stages(c: RequestContext): void {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const data = readRunStages(id);
  if (!data) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));
  c.json(200, { id, stages: data });
}

function del(c: RequestContext): void {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const result = deleteRun(id);
  if (!result.deleted) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));
  dropSession(id);
  c.json(200, { deleted: true, id });
}

async function archive(c: RequestContext): Promise<void> {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const body = await c.readBody();
  const result = setArchived(id, Boolean(isObjectRecord(body) && body.archived));
  if (!result.ok) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));
  c.json(200, { ok: true, id, archived: result.archived });
}

export { recent, finished, overview, full, stages, del, archive };
