import path from "node:path";
import * as questions from "./questions.ts";
import { getArc } from "./meeting-arcs.ts";

function sortIntroByArc(
  introItems: Array<Record<string, unknown>>,
  meetingTypeLabel: string,
): Array<Record<string, unknown>> {
  const arc = getArc(meetingTypeLabel);
  const stageOrder = new Map(arc.arc.map((stage, index): [string, number] => [stage.id, index]));
  return [...introItems].sort((a, b) => {
    const aStage = typeof a.stage === "string" ? a.stage : "";
    const bStage = typeof b.stage === "string" ? b.stage : "";
    const ai = stageOrder.has(aStage) ? stageOrder.get(aStage) ?? 999 : 999;
    const bi = stageOrder.has(bStage) ? stageOrder.get(bStage) ?? 999 : 999;
    if (ai !== bi) return ai - bi;
    return String(a.alias || "").localeCompare(String(b.alias || ""));
  });
}

function loadIntroQueue(meetingTypeLabel: string, budget: number): Array<Record<string, unknown>> {
  const slug = questions.slugify(meetingTypeLabel);
  const loaded = questions.loadDir(path.join("_intro", slug));
  const sorted = sortIntroByArc(loaded, meetingTypeLabel);
  return sorted.slice(0, budget);
}

export { loadIntroQueue, sortIntroByArc };
