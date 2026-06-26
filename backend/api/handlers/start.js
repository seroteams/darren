const path = require("node:path");
const { MEETING_TYPES } = require("../../engine/meeting-types.ts");
const { pickOpener } = require("../../engine/opener.ts");
const { appendEligibilityLog } = require("../../engine/question-eligibility.ts");
const { loadIntroQueue } = require("../../engine/intro-queue.ts");
const { getArc } = require("../../engine/meeting-arcs.ts");
const { createWebSession, persistSession, INTRO_BUDGET } = require("../sessions.ts");
const { generateFocusPoints } = require("../../engine/generate.ts");
const { ensureRoleProfile } = require("../../engine/role-profile.ts");
const { buildFingerprint } = require("../../engine/run-fingerprint.ts");
const { loadPersona, scriptAnswers } = require("../persona-script.ts");

function buildAgendaCheck(anchorStageId) {
  return Object.freeze({
    alias: "q_intro_agenda_check",
    label: "Agenda check",
    name: "Before we get into it, anything you want to make sure we cover today?",
    description:
      "Semi-set early question. Gives the team member explicit permission to set the agenda before the manager's plan takes over.",
    purpose: "engagement",
    stage: anchorStageId,
    axis_effects: { engagement: 1, clarity: 1 },
    source: "semi_set",
  });
}

module.exports = async function start(c) {
  const body = await c.readBody();
  const { name, role, seniority, meetingTypeIndex, notes, mode, runLabel, personaId } = body;

  if (typeof name !== "string" || !name.trim())
    return c.error(Object.assign(new Error("name required"), { status: 400 }));
  if (typeof role !== "string" || !role.trim())
    return c.error(Object.assign(new Error("role required"), { status: 400 }));
  if (typeof seniority !== "string" || !seniority.trim())
    return c.error(Object.assign(new Error("seniority required"), { status: 400 }));

  const idx = Number(meetingTypeIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= MEETING_TYPES.length)
    return c.error(Object.assign(new Error("meetingTypeIndex out of range"), { status: 400 }));

  const meetingType = MEETING_TYPES[idx];
  const arc = getArc(meetingType.label);
  const anchorStageId = arc.arc[0]?.id || null;
  const ctx = {
    name: name.trim(),
    role: role.trim(),
    seniority: seniority.trim(),
    meetingType: meetingType.label,
    notes: (notes || "").trim(),
  };

  const openerRejections = [];
  const opener = pickOpener(ctx, { rejections: openerRejections });
  const introRest = loadIntroQueue(meetingType.label, INTRO_BUDGET - 1);
  const introQueue = [opener, buildAgendaCheck(anchorStageId), ...introRest].slice(0, INTRO_BUDGET);
  const session = createWebSession(ctx, introQueue);
  if (openerRejections.length) {
    appendEligibilityLog(path.join(session.dir, "eligibility-log.json"), openerRejections);
  }

  // Scripted test lane: stamp the run fingerprint + load the persona's fixed
  // script so the bank/planner can freeze the question path (manual mode skips all this).
  const isScripted = mode === "scripted";
  const persona = isScripted ? loadPersona(personaId) : null;
  session.mode = isScripted ? "scripted" : "manual";
  session.runLabel = typeof runLabel === "string" ? runLabel.trim() || null : null;
  session.fingerprint = buildFingerprint({
    mode: session.mode,
    runLabel: session.runLabel,
    personaId: persona ? persona.id : null,
    scriptVersion: persona ? persona.script_version : null,
  });
  if (persona) {
    session.scriptAnswers = scriptAnswers(persona);
    session.scriptedFallback = persona.scripted_fallback || null;
    session.scriptCoverage = { aliases_answered_by_script: [], aliases_missing_script: [], fallback_count: 0 };
  }
  persistSession(session);

  // Pre-warm while the user answers intro questions: role profile first (cache
  // hit adds ~0ms), then focus points — so every stage finds the profile on disk.
  ensureRoleProfile(ctx, { session: { id: session.id, dir: session.dir } })
    .catch(() => null)
    .then(() => generateFocusPoints(ctx, { session: { id: session.id, dir: session.dir } }))
    .then((result) => { session.focusPointsResult = result; })
    .catch(() => {});

  c.json(201, {
    sessionId: session.id,
    sessionDir: session.dir,
    createdAt: session.createdAt,
    introQueueLen: introQueue.length,
  });
};
