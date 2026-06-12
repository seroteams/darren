const path = require("node:path");
const { requireSession, persistSession } = require("../sessions");
const {
  checkQuestionEligibility,
  dropIneligibleHeads,
  appendEligibilityLog,
} = require("../../../src/question-eligibility");

module.exports = function question(c) {
  const session = requireSession(c.query.s);

  // Serve-time gate — the last line of defence: no question reaches the UI
  // without passing the eligibility check, whichever path queued it. Scripted
  // runs keep their frozen path (log-only) so fixture comparisons stay stable.
  const askedNames = session.transcript.map((t) => t.question.name);
  if (session.mode === "scripted") {
    const head = session.queueRef[0];
    if (head) {
      const check = checkQuestionEligibility(head, {
        meetingType: session.ctx.meetingType,
        askedNames,
      });
      if (!check.ok) {
        console.warn(
          `[question] scripted question would be rejected (${check.reason}): ${head.alias || head.name}`
        );
      }
    }
  } else {
    const rejected = dropIneligibleHeads(session.queueRef, {
      meetingType: session.ctx.meetingType,
      askedNames,
    });
    if (rejected.length) {
      appendEligibilityLog(path.join(session.dir, "eligibility-log.json"), rejected);
      persistSession(session);
    }
  }

  if (session.turn >= session.totalBudget || session.queueRef.length === 0) {
    return c.json(200, {
      done: true,
      agenda: {
        summary: session.agendaInput?.summary ?? null,
        covered: session.agendaCovered ?? null,
      },
    });
  }
  const q = session.queueRef[0];
  const returningToArc = Boolean(session.showReturningToArcHint);
  if (returningToArc) session.showReturningToArcHint = false;
  const scripted = session.mode === "scripted"
    ? {
        alias: q.alias,
        answer: session.scriptAnswers?.[q.alias] ?? null,
        fallback: session.scriptedFallback || "",
      }
    : null;
  c.json(200, {
    turn: session.turn + 1,
    total: session.totalBudget,
    queueLen: session.queueRef.length,
    returningToArc,
    scripted,
    question: {
      alias: q.alias,
      label: q.label,
      name: q.name,
      description: q.description,
      purpose: q.purpose,
    },
  });
};
