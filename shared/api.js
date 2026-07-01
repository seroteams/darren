// Fetch wrappers for /api endpoints.

async function json(res) {
  let body = {};
  try { body = await res.json(); } catch { /* non-JSON body (e.g. 502 HTML gateway page) */ }
  if (!res.ok) {
    // Legacy /api/ returns { error: "msg" }; v1 returns { error: { code, message } }.
    const e = body.error;
    const msg = (typeof e === "string" ? e : e?.message) || `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return body;
}

export async function postJson(url, payload) {
  return json(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

// --- Auth (Phase 006 endpoints; cookie is httpOnly + automatic) ---

export async function register({ email, name, password, company }) {
  return postJson("/api/v1/auth/register", { email, name, password, company });
}

export async function login({ email, password }) {
  return postJson("/api/v1/auth/login", { email, password });
}

export async function logout() {
  return postJson("/api/v1/auth/logout", {});
}

// Who am I? 200 { userId, orgId, roles } when logged in; throws (status 401) when not.
export async function me() {
  return json(await fetch("/api/v1/auth/me"));
}

// Feedback (Phase 5): send a short tester note. Login required (any role); stored to a
// local file on the server, no external service. Returns { ok: true }.
export async function submitFeedback(message, page) {
  return postJson("/api/v1/feedback", { message, page });
}

// Tasks board (Phase 3): run ONE free, offline check by id ("tests" | "replay").
// The server allow-lists these and refuses anything paid. Returns { ok, summary, output }.
export async function runFreeCheck(check) {
  return postJson("/api/v1/checks/run", { check });
}

export async function getMeetingTypes() {
  return json(await fetch("/api/meeting-types"));
}

// The running API's build id (git short SHA + commit date) — for the build stamp.
export async function getVersion() {
  return json(await fetch("/api/version"));
}

export async function getArcs() {
  return json(await fetch("/api/arcs"));
}

export async function saveArc(slug, { arc, tone_register, anti_patterns, confirm = false }) {
  return postJson(`/api/arcs/${encodeURIComponent(slug)}`, { arc, tone_register, anti_patterns, confirm });
}

export async function resetArc(slug) {
  return postJson(`/api/arcs/${encodeURIComponent(slug)}/reset`, {});
}

export async function getPersonaBench() {
  return json(await fetch("/api/persona-bench"));
}

// Sessions + runs are org-fenced (Phase 007/2): these call the v1 routes (id in the
// path), so the session cookie fences every read/write to the logged-in company.
// Shared config / QA endpoints (meeting-types, arcs, role-lexicons, pipeline, …) are
// not per-company, so they stay on the legacy /api/ paths — no isolation to gain.

export async function startSession(payload) {
  return postJson("/api/v1/sessions", payload);
}

export async function getSession(sessionId) {
  const res = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}`);
  if (res.status === 404) return null;
  return json(res);
}

export async function getRoleProfile(sessionId) {
  return json(await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/role-profile`));
}

export async function getRoleLexicons() {
  return json(await fetch("/api/role-lexicons"));
}

export async function runRegression() {
  return json(await fetch("/api/regression/run"));
}

export async function addRoleLexiconTerm(key, term, meaning) {
  return postJson("/api/role-lexicons/term", { key, term, meaning });
}

export async function removeRoleLexiconTerm(key, term) {
  return postJson("/api/role-lexicons/term/remove", { key, term });
}

export async function getQuestion(sessionId) {
  return json(await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/question`));
}

export async function suggestAnswers(sessionId) {
  return json(await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/suggest-answers`));
}

export async function submitAnswer(sessionId, answer, { answerSource = "manual", alias = null } = {}) {
  return postJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/answer`, { answer, answerSource, alias });
}

export async function goBack(sessionId) {
  return postJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/back`, {});
}

export async function setAgendaCovered(sessionId, covered) {
  return postJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/agenda/cover`, { covered });
}

export async function setSelectedFocus(sessionId, focusPointIds) {
  return postJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/focus-points/select`, { focusPointIds });
}

export async function postNote(sessionId, note) {
  return postJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/notes`, { note });
}

export async function listRecentRuns(limit = 3) {
  return json(await fetch(`/api/v1/runs/recent?limit=${limit}`));
}

export async function getFinishedRuns() {
  return json(await fetch("/api/v1/runs/finished"));
}

export async function getRunOverview(id) {
  return json(await fetch(`/api/v1/runs/${encodeURIComponent(id)}/overview`));
}

export async function getRunFull(id) {
  return json(await fetch(`/api/v1/runs/${encodeURIComponent(id)}/full`));
}

export async function getRunStages(id) {
  return json(await fetch(`/api/v1/runs/${encodeURIComponent(id)}/stages`));
}

// Preview the exact payload the current stage is about to send to the model —
// assembled with zero API calls. Returns null when there's no session (404) or
// the stage's inputs aren't ready yet (409), so callers fall back gracefully.
export async function getStagePreview(sessionId, stage) {
  const q = stage ? `?stage=${encodeURIComponent(stage)}` : "";
  const res = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/preview${q}`);
  if (res.status === 404 || res.status === 409) return null;
  return json(res);
}

export async function saveReview(id, review) {
  return postJson(`/api/v1/runs/${encodeURIComponent(id)}/review`, review);
}

export async function setArchived(id, archived) {
  return postJson(`/api/v1/runs/${encodeURIComponent(id)}/archive`, { archived });
}

export async function postVerdict(sessionId, { verdict, issue_type, note }) {
  return postJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/verdict`, { verdict, issue_type, note });
}

export async function suggestFix(runId, stage) {
  return json(
    await fetch("/api/suggest-fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, stage }),
    })
  );
}

export async function deleteRun(id) {
  return json(await fetch(`/api/v1/runs/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export async function getPipelineStatus(baseline = "latest") {
  const q =
    baseline === "latest"
      ? ""
      : `?baseline=${encodeURIComponent(baseline)}`;
  return json(await fetch(`/api/pipeline/status${q}`));
}

export async function getLexiconCandidates(sessionId) {
  const res = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/lexicon/candidates`);
  if (res.status === 404) return { candidates: [] };
  return json(res);
}

export async function getLexiconScope(sessionId) {
  const res = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/lexicon/scope`);
  if (res.status === 404) return { eligible: false };
  return json(res);
}

export async function submitLexiconDecisions(sessionId, decisions) {
  return postJson(`/api/v1/sessions/${encodeURIComponent(sessionId)}/lexicon/decisions`, { decisions });
}

export async function getLexiconPromotePending() {
  return json(await fetch("/api/lexicon/promote/pending"));
}

export async function submitLexiconPromote(decisions) {
  return postJson("/api/lexicon/promote", { decisions });
}

