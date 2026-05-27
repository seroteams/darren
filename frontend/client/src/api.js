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

export async function submitAnswer(sessionId, answer) {
  return json(
    await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answer }),
    })
  );
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

export async function submitLexiconDecisions(sessionId, decisions) {
  return postJson("/api/lexicon/decisions", { sessionId, decisions });
}

