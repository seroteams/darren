// Agenda carry-forward: turn the report's agenda-check answer into a durable
// one-line item that gets re-asked in the runner and surfaced in the briefing.

const MAX_SUMMARY_CHARS = 80;

// Deterministic one-line condense of the raw agenda answer. No model call.
function summarizeAgenda(raw) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  // Prefer the first sentence if it fits cleanly.
  const firstSentence = text.match(/^.*?[.!?](?=\s|$)/);
  let out = firstSentence ? firstSentence[0] : text;
  if (out.length > MAX_SUMMARY_CHARS) {
    const slice = out.slice(0, MAX_SUMMARY_CHARS);
    const lastSpace = slice.lastIndexOf(" ");
    out = (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim() + "…";
  }
  return out.replace(/[.,;:\s]+$/, "").trim();
}

function buildCarryForwardQuestion(summary, stageId) {
  return Object.freeze({
    alias: "q_agenda_carry_forward",
    label: "Also cover today",
    name: `At the start they wanted to make sure you covered: "${summary}". Dig into it.`,
    description: "Carried forward from the agenda check.",
    purpose: "engagement",
    stage: stageId,
    axis_effects: { engagement: 1 },
    source: "agenda_carry_forward",
  });
}

module.exports = { summarizeAgenda, buildCarryForwardQuestion };
