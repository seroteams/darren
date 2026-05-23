const path = require("node:path");
const { MEETING_TYPES } = require("../../../src/meeting-types");
const questions = require("../../../src/questions");
const { pickOpener } = require("../../../src/opener");
const { createWebSession, INTRO_BUDGET } = require("../sessions");
const { generateFocusPoints } = require("../../../src/generate");

function loadIntroQueue(meetingTypeLabel) {
  const slug = questions.slugify(meetingTypeLabel);
  const loaded = questions.loadDir(path.join("_intro", slug));
  return loaded.slice(0, INTRO_BUDGET);
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
  const ctx = {
    name: name.trim(),
    role: role.trim(),
    seniority: seniority.trim(),
    meetingType: meetingType.label,
    notes: (notes || "").trim(),
  };

  const opener = pickOpener(ctx);
  const introRest = loadIntroQueue(meetingType.label);
  const introQueue = [opener, ...introRest].slice(0, INTRO_BUDGET);
  const session = createWebSession(ctx, introQueue);

  // Pre-warm focus points while the user answers intro questions
  generateFocusPoints(ctx, { session: { id: session.id, dir: session.dir } })
    .then((result) => { session.focusPointsResult = result; })
    .catch(() => {});

  c.json(201, {
    sessionId: session.id,
    sessionDir: session.dir,
    introQueueLen: introQueue.length,
  });
};
