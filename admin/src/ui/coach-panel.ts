// Coach panel (coach-panel Phase 1 + 2) — the lavender right half of the questioning
// split. Two views, switched by the Support / Live-scores toggle in the header:
//  • Live scores — the four axes as gradient meters (POC design 5) with the planner's
//    REAL per-answer rationale as each axis's "why" (assessment.note; never invented).
//  • Support — up to 3 coaching hints per question ("How to ask" / "Listen for"). A
//    question's own generated hints win; when it has none (openers, agenda and seed
//    questions never get them) we fall back to the prep brief's real listen-for cues,
//    plainly LABELLED as brief-level, never faked as per-question.
// Idle lines for unrated axes are plainly UI copy about the absence of a read.

import "../styles/coach-panel.css";
import { icon } from "./icon.js";
import { MessageCircle, Ear } from "lucide";
import { AXIS_ORDER } from "./axes.js";
import { escapeCopy as escape } from "./html.js";
import { renderPromiseList } from "./briefing-view.ts";
import { whenLabel } from "./time.ts";
import {
  createNoteAttacher,
  rowStateFor,
  meterFor,
  parseStoredWhys,
  cleanHints,
  cleanBriefCues,
  cleanRecap,
  type AxisRead,
  type WhyMap,
  type Hint,
  type PriorRecap,
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

export function createCoachPanel({
  sessionId,
  personName = "",
  briefCues,
}: {
  sessionId: string;
  personName?: string;
  briefCues?: unknown; // the prep brief's listenFor lines, if this session has a brief
}) {
  // Rows only — the split screen (questioning.js) owns the header row (incl. the
  // Support/Live-scores toggle), so the panel sits bare on the lavender half.
  const el = document.createElement("div");
  el.className = "coach-panel";
  el.innerHTML = `<div class="coach-panel__rows"></div>`;
  const rowsHost = el.querySelector(".coach-panel__rows") as HTMLElement;

  let mode: "support" | "scores" | "last" = "support"; // POC default: coaching first
  let recap: PriorRecap | null = null; // the previous 1:1, before this one starts
  let questionHints: Hint[] = [];
  let hintsInherited = false; // lines written for the question this one follows up on
  const fallbackCues = cleanBriefCues(briefCues); // brief-level, only when the question has none

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
    if (questionHints.length) {
      // Only replayed sessions from before 2026-07-30 reach this label: back then
      // a follow-up was minted in code with no model call, so it borrowed the
      // hints of the question it followed. Say so — the alternative is passing
      // whole-thread coaching off as written for this exact question
      // (question-support-hints Phase 3). Model-written follow-ups have their own.
      const label = hintsInherited
        ? `<p class="coach-source">From the question this follows up on.</p>`
        : "";
      return label + questionHints.map(hintHtml).join("");
    }
    // Openers, agenda and seed questions never carry generated hints. Rather than an
    // empty shrug, fall back to the prep brief's real listen-for cues for this person,
    // LABELLED as brief-level so it is never mistaken for per-question coaching.
    if (fallbackCues.length) {
      const who = personName ? ` for ${escape(personName)}` : "";
      return `<p class="coach-source">From your prep brief${who}. Written for the whole meeting, not this question.</p>
        ${fallbackCues.map(hintHtml).join("")}`;
    }
    return `<p class="coach-empty">No coaching hints for this question yet. The Live scores tab still updates as you go.</p>`;
  }

  // The walk-in glance (last-one-to-one Phase 3). Everything here is quoted from the
  // previous finished 1:1: the briefing's own headline, the agreements the manager
  // confirmed at that wrap-up with the outcome they were later tapped, and the four
  // reads that run ended on. Deliberately NOT the whole record — the first prototype
  // put the transcript here and it ran past 2,200px of scroll, which is a reading
  // task and not the 20-second glance this screen has to be.
  //
  // Last meeting's reads ride as chips rather than the meters below, because those
  // meters are a per-answer DELTA on a plus/minus 3 scale and these are a whole-meeting
  // SCORE on plus/minus 10. Drawing them the same way would say they are the same
  // number. An axis that meeting never read says so and shows none.
  function scoreChip(a: PriorRecap["axes"][number]): string {
    const label = AXIS_LABELS[a.id] || a.id;
    if (!a.read || a.score === null) return `<span class="chip chip--plain">${escape(label)} not read</span>`;
    const tone = a.score > 0 ? "chip--mint" : a.score < 0 ? "chip--coral" : "chip--plain";
    const n = a.score > 0 ? `+${a.score}` : String(a.score);
    return `<span class="chip ${tone}">${escape(label)} ${escape(n)}</span>`;
  }

  function lastHtml(): string {
    if (!recap) return supportHtml();
    const when = whenLabel(recap.when);
    const stamp = [recap.meetingType || "Last 1:1", when].filter(Boolean).join(" · ");
    // "You agreed" is only honest about manager-confirmed promises. A run that armed
    // no loop falls back to what the briefing SUGGESTED, which nobody signed off and
    // nobody owns. Those render as a plain list: no owner column (picking one would
    // invent a fact) and no outcome chip, because "Open" against a suggestion reads
    // as an agreement somebody failed to keep.
    const suggested = recap.agreedSource === "suggested";
    const agreed = recap.agreed.length
      ? `<div class="coach-last__sep">
          <span class="eyebrow">${suggested ? "Sero suggested, never agreed" : "You agreed"}</span>
          ${
            suggested
              ? `<ul class="promise-list">${recap.agreed
                  .map((a) => `<li class="promise-row"><span class="promise-row__action">${escape(a.action)}</span></li>`)
                  .join("")}</ul>`
              : renderPromiseList(
                  recap.agreed.map((a, i) => ({ id: String(i), owner: a.owner ?? "manager", action: a.action, outcome: a.outcome })),
                  personName,
                )
          }
        </div>`
      : "";
    const scores = recap.axes.length
      ? `<div class="coach-last__sep"><div class="coach-last__scores">${recap.axes.map(scoreChip).join("")}</div></div>`
      : "";
    // A meeting whose briefing never generated has no sentence to quote. Say that,
    // rather than quoting the fallback's own "Briefing generation failed" line as
    // what the conversation was about. What it agreed and how it scored are real
    // and still show.
    const line = recap.summaryMissing
      ? `<p class="coach-row__why coach-row__why--idle">No written summary was generated for that 1:1, so there is no line to carry in. What you agreed and how it scored are below.</p>`
      : `<p class="coach-hint__text">${escape(recap.headline)}</p>`;
    return `<div class="coach-last">
      <div>
        <p class="coach-source">${escape(stamp)}</p>
        ${line}
      </div>
      ${agreed}${scores}
    </div>`;
  }

  function render(): void {
    rowsHost.innerHTML =
      mode === "scores" ? lastAxes.map(rowHtml).join("") : mode === "last" ? lastHtml() : supportHtml();
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

  function setMode(next: "support" | "scores" | "last"): void {
    if (next === mode) return;
    mode = next;
    render();
  }

  // Called once, before the gate, with the wire payload from /prior-recap. A recap
  // takes the first segment over from Support until the meeting starts; no recap
  // (a first 1:1, a guest run, an unfinished last time) leaves the panel exactly as
  // it is today, which is why this never renders an empty "nothing here yet" card.
  function setPriorRecap(raw: unknown): boolean {
    recap = cleanRecap(raw);
    if (recap && mode === "support") mode = "last";
    render();
    return Boolean(recap);
  }

  // The meeting has started: the glance is done and the panel goes back to coaching
  // for the question in front of you. Idempotent, so a resumed session is safe.
  function endGlance(): void {
    recap = null;
    if (mode === "last") mode = "support";
    render();
  }

  // Called each question with that question's wire hints (validated here).
  // `source` is "inherited" only when the lines belong to the question this one
  // follows up on; anything else means they were written for this question.
  function setQuestionHints(raw: unknown, source?: unknown): void {
    questionHints = cleanHints(raw);
    hintsInherited = questionHints.length > 0 && source === "inherited";
    render();
  }

  render();
  return { el, renderInitial, update, setNote, setMode, setQuestionHints, setPriorRecap, endGlance };
}
