import { requireSession } from "../sessions.ts";
import { suggestAnswers } from "../../engine/answer-suggester.ts";
import type { RequestContext } from "../router.ts";

// Dev-only roleplay aid: draft a few in-character employee answers for the
// question currently on screen. Failures degrade to an empty list — the UI
// just shows nothing rather than blocking the run.
export default async function suggestAnswersHandler(c: RequestContext): Promise<void> {
  const session = requireSession(c.query.s ?? "");
  const q = session.queueRef[0];
  if (!q) return c.json(200, { answers: [] });

  try {
    const answers = await suggestAnswers({
      ...session.ctx,
      question: q.name,
      questionLabel: q.label || "",
      questionDescription: q.description || "",
      transcript: session.transcript,
    });
    c.json(200, { answers });
  } catch (e) {
    console.warn("[suggest-answers] failed:", e instanceof Error ? e.message : String(e));
    c.json(200, { answers: [] });
  }
}
