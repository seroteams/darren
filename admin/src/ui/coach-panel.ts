// Coach panel (coach-panel Phase 1 + 2) — the lavender right half of the questioning
// split. Two views, switched by the Support / Live-scores toggle in the header:
//  • Live scores — the four axes as gradient meters (POC design 5) with the planner's
//    REAL per-answer rationale as each axis's "why" (assessment.note; never invented).
//  • Support — up to 3 coaching hints per question ("How to ask" / "Listen for"). A
//    question's own generated hints win; when it has none we fall back to role-level
//    listen-for lines, plainly LABELLED as role-level, never faked as per-question.
// Idle lines for unrated axes are plainly UI copy about the absence of a read.

import "../styles/coach-panel.css";
import { icon } from "./icon.js";
import { MessageCircle, Ear } from "lucide";
import { AXIS_ORDER } from "./axes.js";
import { escapeCopy as escape } from "./html.js";
import {
  createNoteAttacher,
  rowStateFor,
  meterFor,
  parseStoredWhys,
  cleanHints,
  type AxisRead,
  type WhyMap,
  type Hint,
} from "./coach-panel-state.ts";

const AXIS_LABELS: Record<string, string> = {
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  clarity: "Clarity",
  growth: "Growth",
};

// UI copy, deliberately about the ABSENCE of a read — never fake reasoning.
const IDLE_LINES: Record<string, string> = {
  wellbeing: "Nothing's touched wellbeing yet. It moves when they talk about energy or load.",
  engagement: "No engagement signal yet. It moves when they show what they care about.",
  clarity: "Clarity's unrated so far. It moves when they can (or can't) name priorities cleanly.",
  growth: "No growth signal yet. It moves when a stretch or ambition comes up.",
};

// ---- DOM (pure state lives in coach-panel-state.ts, tested there) ---------------------------

const signed = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");
const dirOf = (v: number): string => (v > 0 ? "up" : v < 0 ? "down" : "flat");

function storageKey(sessionId: string): string {
  return `sero.coach.whys.${sessionId}`;
}

export function createCoachPanel({ sessionId }: { sessionId: string; personName?: string }) {
  // Rows only — the split screen (questioning.js) owns the header row (incl. the
  // Support/Live-scores toggle), so the panel sits bare on the lavender half.
  const el = document.createElement("div");
  el.className = "coach-panel";
  el.innerHTML = `<div class="coach-panel__rows"></div>`;
  const rowsHost = el.querySelector(".coach-panel__rows") as HTMLElement;

  let mode: "support" | "scores" = "support"; // POC default: coaching first
  let questionHints: Hint[] = [];

  const attacher = createNoteAttacher(readStored());
  let lastAxes: AxisRead[] = AXIS_ORDER.map((id: string) => ({
    id, label: AXIS_LABELS[id] || id, score: 0, lastDelta: 0, historyLen: 0,
  }));

  function readStored(): WhyMap {
    try {
      return parseStoredWhys(window.sessionStorage.getItem(storageKey(sessionId)));
    } catch {
      return {};
    }
  }
  function persist(): void {
    try {
      window.sessionStorage.setItem(storageKey(sessionId), JSON.stringify(attacher.whys()));
    } catch {
      /* storage full/blocked — the live view still works */
    }
  }

  function rowHtml(axis: AxisRead): string {
    const state = rowStateFor(axis, attacher.whys());
    const label = AXIS_LABELS[axis.id] || axis.label || axis.id;
    if (state.kind === "unrated") {
      return `<div class="coach-row" data-axis="${escape(axis.id)}">
        <div class="coach-row__head">
          <span class="coach-row__label">${escape(label)}</span>
          <span class="coach-row__delta coach-row__delta--flat">Not rated</span>
        </div>
        <div class="coach-meter"><span class="coach-meter__mid"></span>
          <span class="coach-meter__thumb" style="left:50%">0</span>
        </div>
        <p class="coach-row__why coach-row__why--idle">${escape(IDLE_LINES[axis.id] || "No read on this yet.")}</p>
      </div>`;
    }
    const m = meterFor(state.delta);
    return `<div class="coach-row" data-axis="${escape(axis.id)}">
      <div class="coach-row__head">
        <span class="coach-row__label">${escape(label)}</span>
        <span class="coach-row__delta coach-row__delta--${dirOf(state.delta)}">${signed(state.delta)}</span>
      </div>
      <div class="coach-meter"><span class="coach-meter__mid"></span>
        ${state.delta !== 0 ? `<span class="coach-meter__fill" style="left:${m.fillLeft}%;width:${m.fillWidth}%"></span>` : ""}
        <span class="coach-meter__thumb" style="left:${m.pct}%">${signed(state.delta)}</span>
      </div>
      ${state.why ? `<p class="coach-row__why">${escape(state.why)}</p>` : ""}
    </div>`;
  }

  function hintHtml(h: Hint): string {
    const ask = h.kind === "ask";
    const label = ask ? "How to ask" : "Listen for";
    return `<div class="coach-hint">
      <span class="coach-pill">${icon(ask ? MessageCircle : Ear, { size: 16 })}${label}</span>
      <p class="coach-hint__text">${escape(h.text)}</p>
    </div>`;
  }

  function supportHtml(): string {
    if (!questionHints.length) {
      return `<p class="coach-empty">No coaching hints for this question yet. The Live scores tab still updates as you go.</p>`;
    }
    return questionHints.map(hintHtml).join("");
  }

  function render(): void {
    rowsHost.innerHTML = mode === "scores" ? lastAxes.map(rowHtml).join("") : supportHtml();
  }

  // Same duck-type surface as createAxesPanel, plus the Phase-2 methods.
  function renderInitial(axes: AxisRead[]): void {
    lastAxes = axes;
    attacher.onAxes(axes.map((a) => ({ ...a, lastDelta: 0 }))); // initial paint moves nothing
    render();
  }

  function update(axes: AxisRead[]): void {
    lastAxes = axes;
    attacher.onAxes(axes);
    persist();
    render();
  }

  function setNote(note: string): void {
    if (!note) return;
    attacher.onNote(note);
    persist();
    render();
  }

  function setMode(next: "support" | "scores"): void {
    if (next === mode) return;
    mode = next;
    render();
  }

  // Called each question with that question's wire hints (validated here).
  function setQuestionHints(raw: unknown): void {
    questionHints = cleanHints(raw);
    render();
  }

  render();
  return { el, renderInitial, update, setNote, setMode, setQuestionHints };
}
