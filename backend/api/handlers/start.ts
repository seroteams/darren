import path from "node:path";
import { MEETING_TYPES } from "../../engine/meeting-types.ts";
import { pickOpener } from "../../engine/opener.ts";
import { appendEligibilityLog } from "../../engine/question-eligibility.ts";
import { loadIntroQueue } from "../../engine/intro-queue.ts";
import { getArc } from "../../engine/meeting-arcs.ts";
import { createWebSession, persistSession, INTRO_BUDGET } from "../sessions.ts";
import { generateFocusPoints } from "../../engine/generate.ts";
import { ensureRoleProfile } from "../../engine/role-profile.ts";
import { buildFingerprint } from "../../engine/run-fingerprint.ts";
import { loadPersona, scriptAnswers } from "../persona-script.ts";
import type { RequestContext } from "../router.ts";
import type { Question } from "../../shared/question.types.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function buildAgendaCheck(anchorStageId: string | null): Question {
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

export default async function start(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
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
  if (!meetingType)
    return c.error(Object.assign(new Error("meetingTypeIndex out of range"), { status: 400 }));
  const arc = getArc(meetingType.label);
  const anchorStageId = arc.arc[0]?.id || null;
  const ctx = {
    name: name.trim(),
    role: role.trim(),
    seniority: seniority.trim(),
    meetingType: meetingType.label,
    notes: asString(notes).trim(),
  };

  const openerRejections: NonNullable<Parameters<typeof appendEligibilityLog>[1]> = [];
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
  const persona = isScripted ? loadPersona(typeof personaId === "string" ? personaId : null) : null;
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
}
