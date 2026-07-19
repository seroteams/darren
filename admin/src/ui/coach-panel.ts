// Coach panel (coach-panel Phase 1) — the lavender right half of the questioning
// split. Shows the four axes as gradient meters (the POC's design 5, Carl's pick
// 2026-07-19) with the planner's REAL per-answer rationale as each axis's "why".
// The why text is only ever the engine's assessment.note — this module attaches
// and displays it, it never writes coaching copy that pretends to be the model's.
// Idle lines for unrated axes are plainly UI copy about absence of signal.

import "../styles/coach-panel.css";
import { AXIS_ORDER } from "./axes.js";
import { escapeCopy as escape } from "./html.js";
import {
  createNoteAttacher,
  rowStateFor,
  meterFor,
  parseStoredWhys,
  type AxisRead,
  type WhyMap,
} from "./coach-panel-state.ts";

const AXIS_LABELS: Record<string, string> = {
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  clarity: "Clarity",
  growth: "Growth",
};

// UI copy, deliberately about the ABSENCE of a read — never fake reasoning.
const IDLE_LINES: Record<string, string> = {
  wellbeing: "Nothing's touched wellbeing yet — it moves when they talk about energy or load.",
  engagement: "No engagement signal yet — it moves when they show what they care about.",
  clarity: "Clarity's unrated so far — it moves when they can (or can't) name priorities cleanly.",
  growth: "No growth signal yet — it moves when a stretch or ambition comes up.",
};

// ---- DOM (pure state lives in coach-panel-state.ts, tested there) ---------------------------

const signed = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");
const dirOf = (v: number): string => (v > 0 ? "up" : v < 0 ? "down" : "flat");

function storageKey(sessionId: string): string {
  return `sero.coach.whys.${sessionId}`;
}

export function createCoachPanel({ sessionId }: { sessionId: string; personName?: string }) {
  // Rows only — the split screen (questioning.js) owns the header row, so the
  // panel sits bare on the lavender half exactly like the POC.
  const el = document.createElement("div");
  el.className = "coach-panel";
  el.innerHTML = `<div class="coach-panel__rows"></div>`;
  const rowsHost = el.querySelector(".coach-panel__rows") as HTMLElement;

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

  function render(): void {
    rowsHost.innerHTML = lastAxes.map(rowHtml).join("");
  }

  // Same duck-type surface as createAxesPanel, plus setNote.
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

  render();
  return { el, renderInitial, update, setNote };
}
