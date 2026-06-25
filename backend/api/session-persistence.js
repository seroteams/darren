const fs = require("node:fs");
const path = require("node:path");
const { LOGS_ROOT } = require("../engine/session");
const { findRunDir } = require("../engine/run-history");
const { initState } = require("../engine/axes.ts");
const cost = require("../engine/cost.ts");

const STATE_FILE = "session-state.json";

// Fields that are safe to persist and restore (skip ephemeral Maps and functions)
function serialize(s) {
  return {
    id: s.id,
    dir: s.dir,
    createdAt: s.createdAt,
    completedAt: s.completedAt ?? null,
    lastSeenAt: s.lastSeenAt,
    ctx: s.ctx,
    introQueue: s.introQueue,
    focusPointsResult: s.focusPointsResult,
    selectedFocusPoints: s.selectedFocusPoints,
    preparationResult: s.preparationResult,
    bankReady: s.bankReady,
    briefing: s.briefing,
    queueRef: s.queueRef,
    axisState: s.axisState,
    transcript: s.transcript,
    turn: s.turn,
    totalBudget: s.totalBudget,
    closer: s.closer,
    prepOpener: s.prepOpener ?? null,
    sessionBank: s.sessionBank ?? null,
    pendingAnswer: s.pendingAnswer,
    turnSnapshots: s.turnSnapshots ?? [],
    notes: s.notes || [],
    agendaInput: s.agendaInput ?? null,
    agendaInjected: Boolean(s.agendaInjected),
    agendaCovered: s.agendaCovered ?? null,
    mode: s.mode || "manual",
    runLabel: s.runLabel ?? null,
    fingerprint: s.fingerprint ?? null,
    scriptAnswers: s.scriptAnswers ?? null,
    scriptedFallback: s.scriptedFallback ?? null,
    scriptCoverage: s.scriptCoverage ?? null,
    verdict: s.verdict ?? null,
  };
}

function persist(session) {
  try {
    fs.writeFileSync(
      path.join(session.dir, STATE_FILE),
      JSON.stringify(serialize(session), null, 2)
    );
  } catch (e) {
    console.warn("[session-persistence] write failed:", e.message);
  }
}

function hydrateSession(s, sessionDir) {
  // Trust the on-disk location over the serialised `dir` field — old
  // state files have a pre-move absolute path baked in.
  s.dir = sessionDir;
  s.lastPlanByTurn = new Map();
  s.inFlight = new Map();
  s.tracker = cost.createTracker();
  if (!Array.isArray(s.turnSnapshots)) s.turnSnapshots = [];
  if (s.agendaInjected == null) s.agendaInjected = false;
  if (s.agendaCovered === undefined) s.agendaCovered = null;
  if (s.agendaInput === undefined) s.agendaInput = null;
  if (!s.axisState || typeof s.axisState !== "object") s.axisState = initState();
  return s;
}

function restoreSessionAtDir(sessionDir, sessions, { ttlCutoff } = {}) {
  const stateFile = path.join(sessionDir, STATE_FILE);
  if (!fs.existsSync(stateFile)) return null;
  try {
    const s = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    if (!s.id) return null;
    if (ttlCutoff != null && s.lastSeenAt < ttlCutoff) return null;
    if (sessions.has(s.id)) return sessions.get(s.id);
    hydrateSession(s, sessionDir);
    sessions.set(s.id, s);
    return s;
  } catch {
    return null;
  }
}

function restoreFromDisk(id, sessions) {
  if (sessions.has(id)) return sessions.get(id);
  const sessionDir = findRunDir(id);
  if (!sessionDir) return null;
  const s = restoreSessionAtDir(sessionDir, sessions);
  return s && s.id === id ? s : null;
}

function loadPersistedSessions(sessions, ttlMs) {
  if (!fs.existsSync(LOGS_ROOT)) return;
  const ttlCutoff = Date.now() - ttlMs;
  let restored = 0;
  for (const monthEntry of fs.readdirSync(LOGS_ROOT, { withFileTypes: true })) {
    if (!monthEntry.isDirectory()) continue;
    const monthDir = path.join(LOGS_ROOT, monthEntry.name);
    let sessionEntries;
    try {
      sessionEntries = fs.readdirSync(monthDir, { withFileTypes: true });
    } catch { continue; }
    for (const entry of sessionEntries) {
      if (!entry.isDirectory()) continue;
      const sessionDir = path.join(monthDir, entry.name);
      const sizeBefore = sessions.size;
      restoreSessionAtDir(sessionDir, sessions, { ttlCutoff });
      if (sessions.size > sizeBefore) restored++;
    }
  }
  if (restored > 0) console.log(`[session-persistence] restored ${restored} session(s) from disk`);
}

module.exports = { persist, loadPersistedSessions, restoreFromDisk, hydrateSession };
