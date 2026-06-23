// Fetch wrappers for /api endpoints.

async function json(res) {
  let body = {};
  try { body = await res.json(); } catch { /* non-JSON body (e.g. 502 HTML gateway page) */ }
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
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

export async function getMeetingTypes() {
  return json(await fetch("/api/meeting-types"));
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

export async function startSession(payload) {
  return json(
    await fetch("/api/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function getSession(sessionId) {
  const res = await fetch(`/api/session?s=${encodeURIComponent(sessionId)}`);
  if (res.status === 404) return null;
  return json(res);
}

export async function getRoleProfile(sessionId) {
  return json(await fetch(`/api/role-profile?s=${encodeURIComponent(sessionId)}`));
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
  return json(await fetch(`/api/question?s=${encodeURIComponent(sessionId)}`));
}

export async function suggestAnswers(sessionId) {
  return json(await fetch(`/api/suggest-answers?s=${encodeURIComponent(sessionId)}`));
}

export async function submitAnswer(sessionId, answer, { answerSource = "manual", alias = null } = {}) {
  return json(
    await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answer, answerSource, alias }),
    })
  );
}

export async function goBack(sessionId) {
  return postJson("/api/back", { sessionId });
}

export async function setAgendaCovered(sessionId, covered) {
  return postJson("/api/agenda/cover", { sessionId, covered });
}

export async function setSelectedFocus(sessionId, focusPointIds) {
  return postJson("/api/focus-points/select", { sessionId, focusPointIds });
}

export async function postNote(sessionId, note) {
  return json(
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, note }),
    })
  );
}

export async function listRecentRuns(limit = 3) {
  return json(await fetch(`/api/runs/recent?limit=${limit}`));
}

export async function getFinishedRuns() {
  return json(await fetch("/api/runs/finished"));
}

export async function getRunOverview(id) {
  return json(await fetch(`/api/runs/${encodeURIComponent(id)}/overview`));
}

export async function getRunFull(id) {
  return json(await fetch(`/api/runs/${encodeURIComponent(id)}/full`));
}

export async function getRunStages(id) {
  return json(await fetch(`/api/runs/${encodeURIComponent(id)}/stages`));
}

// Preview the exact payload the current stage is about to send to the model —
// assembled with zero API calls. Returns null when there's no session (404) or
// the stage's inputs aren't ready yet (409), so callers fall back gracefully.
export async function getStagePreview(sessionId, stage) {
  const q = stage ? `&stage=${encodeURIComponent(stage)}` : "";
  const res = await fetch(`/api/preview?s=${encodeURIComponent(sessionId)}${q}`);
  if (res.status === 404 || res.status === 409) return null;
  return json(res);
}

export async function saveReview(id, review) {
  return postJson(`/api/runs/${encodeURIComponent(id)}/review`, review);
}

export async function setArchived(id, archived) {
  return postJson(`/api/runs/${encodeURIComponent(id)}/archive`, { archived });
}

export async function postVerdict(sessionId, { verdict, issue_type, note }) {
  return json(
    await fetch("/api/verdict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, verdict, issue_type, note }),
    })
  );
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
  return json(await fetch(`/api/runs/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export async function getPipelineStatus(baseline = "latest") {
  const q =
    baseline === "latest"
      ? ""
      : `?baseline=${encodeURIComponent(baseline)}`;
  return json(await fetch(`/api/pipeline/status${q}`));
}

export async function getLexiconCandidates(sessionId) {
  const res = await fetch(`/api/lexicon/candidates?s=${encodeURIComponent(sessionId)}`);
  if (res.status === 404) return { candidates: [] };
  return json(res);
}

export async function getLexiconScope(sessionId) {
  const res = await fetch(`/api/lexicon/scope?s=${encodeURIComponent(sessionId)}`);
  if (res.status === 404) return { eligible: false };
  return json(res);
}

export async function submitLexiconDecisions(sessionId, decisions) {
  return postJson("/api/lexicon/decisions", { sessionId, decisions });
}

export async function getLexiconPromotePending() {
  return json(await fetch("/api/lexicon/promote/pending"));
}

export async function submitLexiconPromote(decisions) {
  return postJson("/api/lexicon/promote", { decisions });
}

