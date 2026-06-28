// Pure note formatters for the sessions domain, moved verbatim from the old
// handlers/notes.ts when the notes write converted to clean layers (S2b):
//  - renderNotesMarkdown(session) → the notes.md the notes write persists.
//  - formatNotesForEvaluation(notes) → the captured-notes string the evaluation
//    stage feeds the model. The evaluation stream (not yet layered) imports this
//    from here; it lands at its final home when evaluation converts in S4.
// No storage, no req/res — these only shape strings.

import type { Session, SessionNote } from "../../../shared/session.types.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const STAGE_LABEL: Record<string, string> = {
  FOCUS_POINTS: "Focus points",
  PREPARATION: "Preparation",
  BANK: "Question bank",
  QUESTIONING: "Questioning",
  EVAL: "Evaluation",
  BRIEFING: "Briefing",
  INTAKE: "Intake",
  ERROR: "Error",
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function fmtTimeShort(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function truncate(text: unknown, maxLen: number): string {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen).trimEnd()}...`;
}

function formatNotesForEvaluation(notes: unknown): string {
  if (!Array.isArray(notes) || notes.length === 0) return "";
  const lines: string[] = [];
  for (const raw of notes) {
    const n = asRecord(raw);
    const text = asString(n.text).trim();
    if (!text) continue;
    const stamp = fmtTimeShort(Number.isFinite(n.ts) ? Number(n.ts) : Date.now());
    const alias = asString(n.question_alias).trim();
    const stem = truncate(n.question_stem, 60);
    if (alias && stem) lines.push(`[${stamp} @ ${alias}] ${stem} - ${text}`);
    else if (alias) lines.push(`[${stamp} @ ${alias}] ${text}`);
    else if (stem) lines.push(`[${stamp}] ${stem} - ${text}`);
    else lines.push(`[${stamp}] ${text}`);
  }
  return lines.join("\n");
}

interface NoteGroup {
  head: string;
  items: SessionNote[];
}

function renderNotesMarkdown(session: Session): string {
  const ctx = session.ctx;
  const headerLine = [ctx.name, ctx.role, ctx.meetingType]
    .filter((v) => v && String(v).trim())
    .join(" · ");
  const lines = [`# Notes — ${session.id}`];
  if (headerLine) lines.push(headerLine);
  lines.push("");

  const groups: NoteGroup[] = [];
  for (const n of session.notes || []) {
    const stem = String(n.question_stem || "").trim();
    const alias = String(n.question_alias || "").trim();
    const base =
      n.stage === "QUESTIONING" && n.turn
        ? `${STAGE_LABEL.QUESTIONING} — Q${n.turn}`
        : STAGE_LABEL[n.stage] || n.stage || "—";
    const head =
      n.stage === "QUESTIONING" && (stem || alias)
        ? [base, stem, alias].filter(Boolean).join(" · ")
        : base;
    const last = groups[groups.length - 1];
    if (last && last.head === head) last.items.push(n);
    else groups.push({ head, items: [n] });
  }

  for (const g of groups) {
    lines.push(`## ${g.head}`);
    for (const n of g.items) {
      const raw = String(n.text || "").replace(/\r\n/g, "\n");
      const parts = raw.split("\n");
      const first = parts.shift() ?? "";
      lines.push(`- [${fmtTime(n.ts)}] ${first}`);
      for (const p of parts) {
        lines.push(p.trim() === "" ? "" : `  ${p}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

export { renderNotesMarkdown, formatNotesForEvaluation };
