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

export async function getPersonaBench() {
  const res = await fetch("/api/persona-bench");
  // #region agent log
  fetch('http://127.0.0.1:7925/ingest/e673dfbc-6f65-48a9-97ae-e3c6f92777f0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'be19bb'},body:JSON.stringify({sessionId:'be19bb',location:'api.js:getPersonaBench',message:'persona-bench response',data:{ok:res.ok,status:res.status,url:res.url},timestamp:Date.now(),hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion
  return json(res);
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

export async function getQuestion(sessionId) {
  return json(await fetch(`/api/question?s=${encodeURIComponent(sessionId)}`));
}

export async function suggestAnswers(sessionId) {
  return json(await fetch(`/api/suggest-answers?s=${encodeURIComponent(sessionId)}`));
}

export async function submitAnswer(sessionId, answer, { goDeeper = false, answerSource = "manual", alias = null } = {}) {
  return json(
    await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answer, goDeeper, answerSource, alias }),
    })
  );
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

export async function getRunOverview(id) {
  return json(await fetch(`/api/runs/${encodeURIComponent(id)}/overview`));
}

export async function getRunFull(id) {
  return json(await fetch(`/api/runs/${encodeURIComponent(id)}/full`));
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

