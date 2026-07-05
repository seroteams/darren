// Pure "Rules" view for the questioning panel — the guardrails a founder never
// normally sees, in plain language. Two parts, both derived with ZERO API calls:
//   active   — the filters/gates that apply to THIS meeting type (config-derived).
//   lastTurn — what actually fired on the most recent turn, read straight off the
//              live session's transcript (the planner already records [SKIP]/[SHALLOW]
//              markers in the turn note and clamped score-changes in unbooked_signal).
// No new logging, no storage, no model. Sibling of preparation-inputs.ts.

import { isRelationalArc } from "../../../engine/relational-arcs.ts";
import type { Session } from "../../../shared/session.types.ts";

interface Rule {
  title: string;
  detail: string;
}
interface RulesView {
  meetingType: string;
  active: Rule[];
  lastTurn: { turn: number; fired: Rule[] } | null;
}

// The always-on planner guardrails, in plain words.
const ALWAYS_ON: Rule[] = [
  { title: "No repeats", detail: "The planner won't re-ask something you've already covered." },
  { title: "Grounded questions", detail: "A new question has to connect to what's actually been said — no generic probing." },
  { title: "Shallow-answer damping", detail: "A vague or one-word answer moves the live scores less than a full one." },
  { title: "Skip shortcut", detail: "If an answer adds no new signal, the planner skips re-planning and moves straight on." },
];

function buildSessionRules(session: Session): RulesView {
  const meetingType = session.ctx?.meetingType || "";
  const active: Rule[] = [];
  // Relational check-ins hide performance/skill-probing questions (the focus-arc gate).
  if (isRelationalArc(meetingType)) {
    active.push({
      title: "Competency questions hidden",
      detail: `This is a relational check-in (${meetingType}), so performance / skill-probing questions are filtered out.`,
    });
  }
  active.push(...ALWAYS_ON);

  const last = session.transcript[session.transcript.length - 1];
  let lastTurn: RulesView["lastTurn"] = null;
  if (last) {
    const note = String(last.note || "");
    const fired: Rule[] = [];
    if (/\[SKIP\]/i.test(note)) {
      fired.push({ title: "Planner skipped", detail: "That answer added no new signal, so the queue carried forward without re-planning." });
    }
    if (/\[SHALLOW\]/i.test(note)) {
      fired.push({ title: "Shallow answer", detail: "That answer looked thin, so the scoring was damped for this turn." });
    }
    const held = Array.isArray(last.unbooked_signal) ? last.unbooked_signal.length : 0;
    if (held > 0) {
      fired.push({
        title: "Signal held back",
        detail: `The planner clamped ${held} score change${held === 1 ? "" : "s"} that ran past what the question was built to measure.`,
      });
    }
    lastTurn = { turn: Number(last.turn) || 0, fired };
  }

  return { meetingType, active, lastTurn };
}

export { buildSessionRules };
export type { RulesView, Rule };
