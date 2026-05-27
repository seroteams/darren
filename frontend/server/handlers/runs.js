const { listRecentRuns, summarizeRun, deleteRun } = require("../../../src/run-history");
const { dropSession } = require("../sessions");

function recent(c) {
  const limit = Math.max(1, Math.min(20, Number(c.query.limit) || 3));
  const runs = listRecentRuns(limit).map(({ id, headline, lastSeenAt, stage, pipelineDigest }) => ({
    id,
    headline,
    lastSeenAt,
    stage,
    pipelineDigest,
  }));
  c.json(200, { runs });
}

function overview(c) {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const summary = summarizeRun(id);
  if (!summary) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));
  c.json(200, summary);
}

function del(c) {
  const id = c.params.id;
  if (!id) return c.error(Object.assign(new Error("id required"), { status: 400 }));
  const result = deleteRun(id);
  if (!result.deleted) return c.error(Object.assign(new Error("unknown run"), { status: 404 }));
  dropSession(id);
  c.json(200, { deleted: true, id });
}

module.exports = { recent, overview, del };
