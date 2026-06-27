import fs from "node:fs";
import path from "node:path";
import { requireSession } from "../sessions.ts";
import { persist } from "../session-persistence.ts";
import type { RequestContext } from "../router.ts";
import type { Session, SessionNote } from "../../shared/session.types.ts";

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

function renderMarkdown(session: Session): string {
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

function writeNotesFile(session: Session): void {
  try {
    fs.writeFileSync(path.join(session.dir, "notes.md"), renderMarkdown(session));
  } catch (e) {
    console.warn("[notes] write failed:", e instanceof Error ? e.message : String(e));
  }
}

export default async function notes(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const note = asRecord(body.note);
  if (!body.sessionId) return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  if (!body.note || typeof body.note !== "object")
    return c.error(Object.assign(new Error("note required"), { status: 400 }));
  if (!note.id) return c.error(Object.assign(new Error("note.id required"), { status: 400 }));

  const session = requireSession(asString(body.sessionId));
  if (!Array.isArray(session.notes)) session.notes = [];

  const id = String(note.id);
  const existingIdx = session.notes.findIndex((n) => n.id === id);
  const isDelete = note.deleted === true || (typeof note.text === "string" && !note.text.trim());

  if (isDelete) {
    if (existingIdx >= 0) session.notes.splice(existingIdx, 1);
  } else {
    const existing = existingIdx >= 0 ? session.notes[existingIdx] : undefined;
    const entry: SessionNote = {
      id,
      stage: String(note.stage || (existing ? existing.stage : "")),
      turn: Number.isFinite(note.turn) ? Number(note.turn) : existing ? existing.turn : 0,
      ts: Number.isFinite(note.ts) ? Number(note.ts) : existing ? existing.ts : Date.now(),
      text: String(note.text).slice(0, 4000),
      question_alias: String(note.question_alias || (existing ? existing.question_alias : ""))
        .trim()
        .slice(0, 120),
      question_stem: String(note.question_stem || (existing ? existing.question_stem : ""))
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80),
    };
    if (existingIdx >= 0) session.notes[existingIdx] = entry;
    else session.notes.push(entry);
  }

  persist(session);
  writeNotesFile(session);

  c.json(200, { ok: true, count: session.notes.length });
}

export { formatNotesForEvaluation };
