const { MEETING_TYPES } = require("../../../src/meeting-types");
const { pickOpener } = require("../../../src/opener");
const { loadIntroQueue } = require("../../../src/intro-queue");
const { getArc } = require("../../../src/meeting-arcs");
const { createWebSession, INTRO_BUDGET } = require("../sessions");
const { generateFocusPoints } = require("../../../src/generate");

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
  const { name, role, seniority, meetingTypeIndex, notes } = body;

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

  const opener = pickOpener(ctx);
  const introRest = loadIntroQueue(meetingType.label, INTRO_BUDGET - 1);
  const introQueue = [opener, buildAgendaCheck(anchorStageId), ...introRest].slice(0, INTRO_BUDGET);
  const session = createWebSession(ctx, introQueue);

  // Pre-warm focus points while the user answers intro questions
  generateFocusPoints(ctx, { session: { id: session.id, dir: session.dir } })
    .then((result) => { session.focusPointsResult = result; })
    .catch(() => {});

  c.json(201, {
    sessionId: session.id,
    sessionDir: session.dir,
    createdAt: session.createdAt,
    introQueueLen: introQueue.length,
  });
};
