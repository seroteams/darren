const fs = require("node:fs");
const path = require("node:path");
const { requireSession } = require("../sessions");
const { persist } = require("../session-persistence");

const STAGE_LABEL = {
  FOCUS_POINTS: "Focus points",
  PREPARATION: "Preparation",
  BANK: "Question bank",
  QUESTIONING: "Questioning",
  EVAL: "Evaluation",
  BRIEFING: "Briefing",
  INTAKE: "Intake",
  ERROR: "Error",
};

function fmtTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function renderMarkdown(session) {
  const ctx = session.ctx || {};
  const headerLine = [ctx.name, ctx.role, ctx.meetingType]
    .filter((v) => v && String(v).trim())
    .join(" · ");
  const lines = [`# Notes — ${session.id}`];
  if (headerLine) lines.push(headerLine);
  lines.push("");

  const groups = [];
  for (const n of session.notes || []) {
    const head =
      n.stage === "QUESTIONING" && n.turn
        ? `${STAGE_LABEL.QUESTIONING} — Q${n.turn}`
        : STAGE_LABEL[n.stage] || n.stage || "—";
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

function writeNotesFile(session) {
  try {
    fs.writeFileSync(path.join(session.dir, "notes.md"), renderMarkdown(session));
  } catch (e) {
    console.warn("[notes] write failed:", e.message);
  }
}

module.exports = async function notes(c) {
  const body = await c.readBody();
  const { sessionId, note } = body || {};
  if (!sessionId) return c.error(Object.assign(new Error("sessionId required"), { status: 400 }));
  if (!note || typeof note !== "object")
    return c.error(Object.assign(new Error("note required"), { status: 400 }));
  if (!note.id) return c.error(Object.assign(new Error("note.id required"), { status: 400 }));

  const session = requireSession(sessionId);
  if (!Array.isArray(session.notes)) session.notes = [];

  const id = String(note.id);
  const existingIdx = session.notes.findIndex((n) => n.id === id);
  const isDelete = note.deleted === true || (typeof note.text === "string" && !note.text.trim());

  if (isDelete) {
    if (existingIdx >= 0) session.notes.splice(existingIdx, 1);
  } else {
    const entry = {
      id,
      stage: String(note.stage || (existingIdx >= 0 ? session.notes[existingIdx].stage : "")),
      turn: Number.isFinite(note.turn)
        ? note.turn
        : existingIdx >= 0
        ? session.notes[existingIdx].turn
        : 0,
      ts: Number.isFinite(note.ts)
        ? note.ts
        : existingIdx >= 0
        ? session.notes[existingIdx].ts
        : Date.now(),
      text: String(note.text).slice(0, 4000),
    };
    if (existingIdx >= 0) session.notes[existingIdx] = entry;
    else session.notes.push(entry);
  }

  persist(session);
  writeNotesFile(session);

  c.json(200, { ok: true, count: session.notes.length });
};
