const fs = require("node:fs");
const path = require("node:path");
const { LOGS_ROOT } = require("../../src/session");
const { initState } = require("../../src/axes");
const cost = require("../../src/cost");

const STATE_FILE = "session-state.json";

// Fields that are safe to persist and restore (skip ephemeral Maps and functions)
function serialize(s) {
  return {
    id: s.id,
    dir: s.dir,
    createdAt: s.createdAt,
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
    pendingAnswer: s.pendingAnswer,
    notes: s.notes || [],
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

function loadPersistedSessions(sessions, ttlMs) {
  if (!fs.existsSync(LOGS_ROOT)) return;
  const cutoff = Date.now() - ttlMs;
  let restored = 0;
  // Sessions live one level deep under a month folder: logs/<month>/<id>/
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
      const stateFile = path.join(sessionDir, STATE_FILE);
      if (!fs.existsSync(stateFile)) continue;
      try {
        const s = JSON.parse(fs.readFileSync(stateFile, "utf8"));
        if (!s.id || s.lastSeenAt < cutoff) continue;
        if (sessions.has(s.id)) continue;
        // Trust the on-disk location over the serialised `dir` field — old
        // state files have a pre-move absolute path baked in.
        s.dir = sessionDir;
        // Restore ephemeral fields that can't be serialised
        s.lastPlanByTurn = new Map();
        s.inFlight = new Map();
        s.tracker = cost.createTracker();
        // axisState history entries may lack the full slot shape — re-init missing axes
        if (!s.axisState || typeof s.axisState !== "object") s.axisState = initState();
        sessions.set(s.id, s);
        restored++;
      } catch {
        // Corrupted state file — skip silently
      }
    }
  }
  if (restored > 0) console.log(`[session-persistence] restored ${restored} session(s) from disk`);
}

module.exports = { persist, loadPersistedSessions };
