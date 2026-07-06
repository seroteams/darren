// Continuity Phase 1 — carry-forward on prep.
// Turn a prior 1:1's briefing into a plain, VISIBLE, EDITABLE notes block for the
// next conversation, so the manager continues from what was agreed instead of
// starting cold. This rides the ordinary notes path — no hidden context, no engine
// change (that's Phase 3). Returns "" when there's nothing to carry, so a blank
// slate stays blank (no scaffolding). Mirrors the fields sinceLastTime() shows on
// the person page, in plain text the notes textarea can hold.

export type CarryAction = { when?: string; action?: string };
export type CarryBriefing = { next_actions?: CarryAction[]; watch_for?: string[] } | null | undefined;

const HEADER = "Since last time (edit or clear this before you run):";

export function buildCarryForward(b: CarryBriefing): string {
  if (!b) return "";
  const actions = (b.next_actions || []).filter((a) => a && ((a.action || "").trim() || (a.when || "").trim()));
  const watch = (b.watch_for || []).map((w) => (w || "").trim()).filter(Boolean);
  if (!actions.length && !watch.length) return "";

  const lines: string[] = [HEADER];
  if (actions.length) {
    lines.push("What you agreed:");
    for (const a of actions) {
      const action = (a.action || "").trim();
      const when = (a.when || "").trim();
      const label = action ? (when ? `${when}: ${action}` : action) : when;
      lines.push(`- ${label}`);
    }
  }
  if (watch.length) {
    lines.push("What to watch for:");
    for (const w of watch) lines.push(`- ${w}`);
  }
  return lines.join("\n");
}
