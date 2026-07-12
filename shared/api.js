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

// Forgot-password (forgot-password). requestPasswordReset ALWAYS resolves 200 { ok } — the
// server won't reveal whether the email has an account, so the UI shows one generic
// confirmation either way. submitPasswordReset sets the new password from the one-time
// token in the emailed link; a bad/used/expired link throws the server's plain message.
export async function requestPasswordReset({ email }) {
  return postJson("/api/v1/auth/forgot-password", { email });
}
export async function submitPasswordReset({ token, password }) {
  return postJson("/api/v1/auth/reset-password", { token, password });
}

// Hand an ownerless (guest) finished run to the logged-in caller (guest-run Phase 1
// endpoint). Owned-by-someone-else answers 404; re-claim by the owner is a no-op.
export async function claimSession(id) {
  return postJson(`/api/v1/sessions/${encodeURIComponent(id)}/claim`, {});
}

// Who am I? 200 { userId, orgId, roles, isSuperadmin } when logged in; throws (401) when
// not. isSuperadmin is a server-computed flag the nav uses to show the Registered item.
export async function me() {
  return json(await fetch("/api/v1/auth/me"));
}

// The superadmin's cross-company alpha view (pre-go-live PG7). Gated server-side by
// requireSuperadminRoute — a normal owner gets 401/403 (json() throws). Shape:
// { companies: [{ id, name, createdAt, users: [...] }], summary: { avgStars, ratedCount, lowCount } }.
/** @returns {Promise<{ companies?: unknown[], summary?: unknown }>} */
export async function getRegistered() {
  return json(await fetch("/api/v1/admin/registered"));
}

// The founder Pulse dashboard (admin-live-deploy Phase 3) — one payload folding the Gate-1
// return number, managers, run volume + type mix, drop-offs, guests, errors and latest
// feedback. Same superadmin gate as getRegistered (a normal owner gets 401/403 → json() throws).
/** @returns {Promise<Record<string, unknown>>} */
export async function getPulse() {
  return json(await fetch("/api/v1/admin/pulse"));
}

// The superadmin's cross-company error log (error-log Phase 2). Same gate as
// getRegistered — a normal owner gets 401/403 (json() throws). Shape:
// { errors: [{ id, environment, source, email, userName, company, method, path, status, message, createdAt }] }, newest-first.
/** @returns {Promise<{ errors?: unknown[] }>} */
export async function getErrorLog() {
  return json(await fetch("/api/v1/admin/errors"));
}

// The superadmin's cross-company feedback inbox (feedback-inbox). Same gate as
// getErrorLog — a normal manager gets 401/403 (json() throws). Shape:
// { notes: [{ id, email, userName, company, page, message, createdAt }] }, newest-first.
/** @returns {Promise<{ notes?: unknown[] }>} */
export async function getFeedbackInbox() {
  return json(await fetch("/api/v1/admin/feedback"));
}

// Permanently delete one feedback note (feedback-inbox delete). Superadmin-gated + origin-guarded
// server-side. Returns { id }.
export async function deleteFeedbackNote(id) {
  return json(await fetch(`/api/v1/admin/feedback/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

// Report a client-side error (error-log Phase 3): a browser crash / failed load the app
// caught. Best-effort — the caller swallows failures. Origin-guarded + rate-limited server-side.
export async function reportClientError({ message, path }) {
  return postJson("/api/v1/errors", { message, path });
}

// Mark an error resolved / reopened (error-log Phase 4). Superadmin-only + origin-guarded.
// Returns { id, resolved }.
export async function resolveError(id, resolved) {
  return json(
    await fetch(`/api/v1/admin/errors/${encodeURIComponent(id)}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    }),
  );
}

// One user's finished 1:1s for the superadmin drilldown (pre-go-live PG8). Same gate as
// getRegistered — a normal owner gets 401/403 (json() throws). Shape:
// { runs: [{ id, headline, ctx, lastSeenAt, rating }] }, newest-first.
/** @returns {Promise<{ runs?: unknown[] }>} */
export async function getUserRuns(userId) {
  return json(await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/runs`));
}

// Superadmin, read-only (PG8 Step 3): one finished run's briefing across companies.
// Unknown/unfinished id → 404. Gated by requireSuperadminRoute.
export async function getAdminRun(id) {
  return json(await fetch(`/api/v1/admin/runs/${encodeURIComponent(id)}`));
}

// The unclaimed guest pile (guest-run Phase 4) — superadmin-only; a normal
// manager/admin gets 401/403 (json() throws). Shape: { runs: [...] }.
export async function getGuestRuns() {
  return json(await fetch("/api/v1/admin/guest-runs"));
}

// Superadmin, change a user's account role (user-management Phase 2). PATCH so it reads as a
// partial update; the server validates the role + guards the "last manager/admin" case.
export async function setUserRole(id, role) {
  return json(
    await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }),
  );
}

// Deactivate / reactivate a user (user-management Phase 3). Superadmin-only + origin-guarded.
// Deactivate blocks their login and kills their live sessions; the server's guardrails may
// refuse (409) — the caller surfaces the plain message. No body. Returns { id, deactivated }.
export async function deactivateUser(id) {
  return json(
    await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}/deactivate`, { method: "POST" }),
  );
}
export async function reactivateUser(id) {
  return json(
    await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}/reactivate`, { method: "POST" }),
  );
}

// Delete a user (user-management Phase 4). Superadmin-only + origin-guarded. Permanent: the
// account is removed, their past 1:1s are KEPT under the company but lose their owner. The
// server's guardrails may refuse (409) — the caller surfaces the plain message. Returns { id, deleted }.
export async function deleteUser(id) {
  return json(
    await fetch(`/api/v1/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  );
}

// Feedback (Phase 5): send a short tester note. Login required (any role); stored to a
// local file on the server, no external service. Returns { ok: true }.
export async function submitFeedback(message, page) {
  return postJson("/api/v1/feedback", { message, page });
}

// Briefing verdict tap (validation-kit Phase 3): the one-tap "Would you run this 1:1
// differently now?" answer, tied to the run. No login needed (a guest's tap counts);
// re-sending for the same run updates that run's row (a late comment attaches to the
// same tap). Returns { ok: true }.
export async function submitRunVerdict(runId, verdict, message) {
  return postJson("/api/v1/feedback/verdict", { runId, verdict, message });
}

// Tasks board (Phase 3): run ONE free, offline check by id ("tests" | "replay").
// The server allow-lists these and refuses anything paid. Returns { ok, summary, output }.
export async function runFreeCheck(check) {
  return postJson("/api/v1/checks/run", { check });
}

export async function getMeetingTypes() {
  return json(await fetch("/api/v1/meeting-types"));
}

// The running API's build id (git short SHA + commit date) — for the build stamp.
export async function getVersion() {
  return json(await fetch("/api/version"));
}

// The heartbeat: what the codebase looks like right now (screens on disk, npm
// commands, axes, question count, build) — the Guide renders and diffs this.
export async function getHeartbeat() {
  return json(await fetch("/api/v1/heartbeat"));
}

export async function getArcs() {
  return json(await fetch("/api/v1/arcs"));
}

export async function saveArc(slug, { arc, tone_register, anti_patterns, confirm = false }) {
  return postJson(`/api/v1/arcs/${encodeURIComponent(slug)}`, { arc, tone_register, anti_patterns, confirm });
}

export async function resetArc(slug) {
  return postJson(`/api/v1/arcs/${encodeURIComponent(slug)}/reset`, {});
}

export async function getPersonaBench() {
  return json(await fetch("/api/v1/personas"));
}

// Test-engine hub: start a scripted full-engine run for one persona (paid — the
// click IS the go-ahead). Admin + origin-guarded server-side; refuses (409) when a
// run is already going. Returns 202 { personaId }.
export async function startPersonaRun(personaId) {
  return postJson("/api/v1/persona-runs", { personaId });
}

// Poll the single active persona run. Shape: { status: idle|running|done|failed,
// personaId, sessionId, stageLabel, turn, total, error, costUsd, ... }.
export async function getPersonaRunCurrent() {
  return json(await fetch("/api/v1/persona-runs/current"));
}

// Sessions + runs are org-fenced (Phase 007/2): these call the v1 routes (id in the
// path), so the session cookie fences every read/write to the logged-in company.
// Everything else calls /api/v1/ too (live-data-cleanup Phase 2) — /api/version is the
// one exception, it has no v1 twin.

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
  return json(await fetch("/api/v1/role-lexicons"));
}

export async function runRegression() {
  return json(await fetch("/api/v1/regression/run"));
}

export async function addRoleLexiconTerm(key, term, meaning) {
  return postJson("/api/v1/role-lexicons/term", { key, term, meaning });
}

export async function removeRoleLexiconTerm(key, term) {
  return postJson("/api/v1/role-lexicons/term/remove", { key, term });
}

export async function hideRoleLexiconTerm(key, term) {
  return postJson("/api/v1/role-lexicons/term/hide", { key, term });
}

export async function unhideRoleLexiconTerm(key, term) {
  return postJson("/api/v1/role-lexicons/term/unhide", { key, term });
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

// The logged-in member's OWN finished 1:1s (member-nav). Fenced server-side by
// company AND user, so a member only ever gets their own — never a colleague's or
// the admin's whole-company list. Pass { open: true } to also get started-but-
// unfinished preps (Team-for-managers), each row flagged `finished`.
// Shape: { runs: [{ id, headline, ctx, lastSeenAt, finished }] }.
/** @returns {Promise<{ runs?: unknown[] }>} */
export async function listMyRuns(opts) {
  return json(await fetch(`/api/v1/runs/mine${opts && opts.open ? "?open=1" : ""}`));
}

// One of the member's OWN finished 1:1s, read-only (pre-go-live PG2). Same org+user
// fence; a run the member doesn't own → 404 (json() throws). Shape:
// { id, headline, ctx, briefing, lastSeenAt, completedAt }.
export async function getMyRun(id) {
  return json(await fetch(`/api/v1/runs/mine/${encodeURIComponent(id)}`));
}

// Rate one of the member's OWN runs (pre-go-live PG3): { stars: 1-5, note? }. Member-safe
// + origin-guarded server-side; a run you don't own → 404. Returns { ok, stars, note }.
export async function rateMyRun(id, { stars, note }) {
  return postJson(`/api/v1/runs/mine/${encodeURIComponent(id)}/rating`, { stars, note });
}

// Team people-aliases (pre-go-live PG9): the caller's own merge/rename overrides.
// Keys are the normalized person key the Team groups on. All member-safe + user-fenced.
// Each returns the updated { merges, names } map. Merge folds `from` into `into`.
export async function getTeamAliases() {
  return json(await fetch("/api/v1/team/aliases"));
}
export async function mergePeople(from, into) {
  return postJson("/api/v1/team/merge", { from, into });
}
export async function renamePerson(key, name) {
  return postJson("/api/v1/team/rename", { key, name });
}

// People roster (people-roster Phase 4): the caller's real roster in the DB — manager/admin
// only, fenced to their org + managerId server-side. A person can exist with no 1:1 yet, so
// the Team page is roster-driven. list → { people:[...] }; create/rename → { person }.
export async function listPeople() {
  return json(await fetch("/api/v1/team/people"));
}
export async function createPerson({ name, role, seniority } = {}) {
  return postJson("/api/v1/team/people", { name, role, seniority });
}
export async function renamePersonV2(id, name) {
  return json(await fetch(`/api/v1/team/people/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }));
}
export async function mergePeopleV2(id, intoId) {
  return postJson(`/api/v1/team/people/${encodeURIComponent(id)}/merge`, { intoId });
}
export async function archivePerson(id) {
  return postJson(`/api/v1/team/people/${encodeURIComponent(id)}/archive`, {});
}

// Person ↔ member-account link (people-roster Phase 5). linkable-users lists the org's
// login accounts (id/name/email) a person can link to; link/unlink stamp/clear the row.
// getRunsAboutMe is the member read: list-only rows about the caller's linked people.
export async function getLinkableUsers() {
  return json(await fetch("/api/v1/team/linkable-users"));
}
export async function linkPerson(id, userId) {
  return postJson(`/api/v1/team/people/${encodeURIComponent(id)}/link`, { userId });
}
export async function unlinkPerson(id) {
  return postJson(`/api/v1/team/people/${encodeURIComponent(id)}/unlink`, {});
}
/** @returns {Promise<{ runs?: unknown[] }>} */
export async function getRunsAboutMe() {
  return json(await fetch("/api/v1/runs/about-me"));
}

// Dev-only "prefill a run" (admin-only server-side). clonable = every finished run on
// disk to seed from; cloneRun copies one into a fresh run the caller owns (lands in
// their /mine). Free — all file copies, no OpenAI. Shapes: { runs: [...] } and { id }.
export async function getClonableRuns() {
  return json(await fetch("/api/v1/runs/clonable"));
}

export async function cloneRun(sourceId) {
  return postJson("/api/v1/runs/clone", { sourceId });
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

// The questioning-panel "Rules" view: the guardrails active for this meeting type
// + what fired last turn. Free (no model). Returns null when there's no session.
export async function getSessionRules(sessionId) {
  const res = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/rules`);
  if (res.status === 404) return null;
  return json(res);
}

// Preview the exact payload the current stage is about to send to the model —
// assembled with zero API calls. Returns null when there's no session (404) or
// the stage's inputs aren't ready yet (409), so callers fall back gracefully.
export async function getStagePreview(sessionId, stage, draft) {
  const params = new URLSearchParams();
  if (stage) params.set("stage", stage);
  // A draft answer (being typed) drives the live "Sending" preview for questioning.
  // Sent even when empty so the server can answer "nothing to send yet" honestly.
  if (typeof draft === "string") params.set("draft", draft);
  const qs = params.toString();
  const res = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/preview${qs ? `?${qs}` : ""}`);
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
    await fetch("/api/v1/suggest-fix", {
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
  return json(await fetch(`/api/v1/pipeline/status${q}`));
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
  return json(await fetch("/api/v1/lexicon/promotions/pending"));
}

export async function submitLexiconPromote(decisions) {
  return postJson("/api/v1/lexicon/promotions", { decisions });
}


// The join flow (member-onboarding-invites): a manager mints a one-time join link for a
// roster person; the invitee previews it logged-out and accepts with name+password —
// which creates their member account, links the person, and logs them straight in.
export async function invitePerson(id, email) {
  return postJson(`/api/v1/team/people/${encodeURIComponent(id)}/invite`, { email });
}
export async function getInvite(token) {
  return json(await fetch(`/api/v1/invites/${encodeURIComponent(token)}`));
}
export async function acceptInvite(token, { name, password }) {
  return postJson(`/api/v1/invites/${encodeURIComponent(token)}/accept`, { name, password });
}
