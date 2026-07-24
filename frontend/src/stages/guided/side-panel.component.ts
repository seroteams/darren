// The right-hand side panel — opened from a request/goal row or an "+ Add" button. From Phase 2
// it edits REAL tracker items: the fields carry data-field="…" and the runner collects them on
// Save (data-save) and PATCHes/POSTs. Close (data-close) discards. Lives in the body portal so
// it's fixed over any stage. Footer actions ride the shared .btn primitives (P5 F10).

import { ICONS } from "./guided-icons.ts";
import { esc } from "./guided-util.ts";
import type { CopyCtx } from "./coaching-copy.ts";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  GOAL_STATUS_OPTIONS,
  REQUEST_STATUS_OPTIONS,
  STATUS_LABELS,
  statusClass,
} from "./coaching-copy.ts";
import type { GroupedTrackers, TrackerEvent, TrackerItem } from "./guided.types.ts";

export type Panel =
  | { type: "request"; id: string }
  | { type: "goal"; id: string }
  | { type: "add-request" }
  | { type: "add-goal" }
  | { type: "add-promise" };

const field = (label: string, inner: string): string =>
  `<div class="gd-field"><label>${esc(label)}</label>${inner}</div>`;

const selectField = (name: string, label: string, opts: [string, string][], current: string): string =>
  field(
    label,
    `<select data-field="${name}">${opts
      .map(([v, l]) => `<option value="${esc(v)}"${v === current ? " selected" : ""}>${esc(l)}</option>`)
      .join("")}</select>`,
  );

const inputField = (name: string, label: string, placeholder: string, value = "", type = "text"): string =>
  field(label, `<input type="${type}" data-field="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" />`);

const textareaField = (name: string, label: string, placeholder: string): string =>
  field(label, `<textarea data-field="${name}" placeholder="${esc(placeholder)}"></textarea>`);

function eventLine(e: TrackerEvent): string {
  if (e.type === "note" && e.note) return esc(e.note);
  if (e.type === "status" || e.type === "outcome") return `Status → ${esc(STATUS_LABELS[e.to ?? ""] ?? e.to ?? "")}`;
  if (e.type === "progress") return `Progress → ${esc(e.to ?? "")}%`;
  if (e.type === "created") return "Raised";
  return esc(e.type);
}
const historyBlock = (history: TrackerEvent[]): string =>
  history.length
    ? `<div class="gd-hist">${history.map((h) => `<div>${eventLine(h)}</div>`).join("")}</div>`
    : `<div class="gd-hist"><div>No history yet.</div></div>`;

function byId(items: TrackerItem[], id: string): TrackerItem | undefined {
  return items.find((i) => i.id === id);
}

export function panelHtml(panel: Panel, trackers: GroupedTrackers, copy: CopyCtx): string {
  let eyebrow = "";
  let body = "";
  let saveLabel = "Save";

  if (panel.type === "request") {
    const r = byId(trackers.requests, panel.id);
    if (!r) return "";
    eyebrow = "Request";
    body = `
      <div class="gd-panel__title">${esc(r.text)}</div>
      <div class="gd-panel__meta">${r.category ? `<span class="gd-row__cat">${esc(CATEGORY_LABELS[r.category] ?? r.category)}</span>` : ""}<span class="gd-status gd-status--${statusClass(r.status)}">${esc(STATUS_LABELS[r.status] ?? r.status)}</span></div>
      ${selectField("status", "Status", REQUEST_STATUS_OPTIONS, r.status)}
      ${textareaField("note", "Discussion notes", "What you two talked through…")}
      ${inputField("nextStep", "Next step", "e.g. Pair with a senior on the checkout flow next sprint")}
      ${field("History", historyBlock(r.history))}`;
  } else if (panel.type === "goal") {
    const g = byId(trackers.goals, panel.id);
    if (!g) return "";
    eyebrow = "Goal";
    body = `
      <div class="gd-panel__title">${esc(g.text)}</div>
      <div class="gd-panel__meta"><span class="gd-row__pct">${g.progress}%</span><span class="gd-status gd-status--${statusClass(g.status)}">${esc(STATUS_LABELS[g.status] ?? g.status)}</span></div>
      <div class="gd-bar"><span style="width:${g.progress}%"></span></div>
      ${selectField("status", "Status", GOAL_STATUS_OPTIONS, g.status)}
      ${inputField("progress", "Progress (%)", "0–100", String(g.progress), "number")}
      ${field("Progress history", historyBlock(g.history))}
      ${textareaField("note", "Add an update", "What moved this month…")}`;
  } else if (panel.type === "add-goal") {
    eyebrow = "New goal";
    saveLabel = "Add goal";
    body = `
      ${inputField("text", "Goal", "e.g. Own a feature end-to-end by Q4")}
      ${selectField("status", "Status", GOAL_STATUS_OPTIONS, "not_started")}
      ${textareaField("note", "First note (optional)", "Where it stands today…")}`;
  } else if (panel.type === "add-promise") {
    eyebrow = "New promise";
    saveLabel = "Add promise";
    body = `
      ${selectField("owner", "Whose promise", [["manager", "You"], ["member", copy.name]], "manager")}
      ${inputField("text", "Promise", "e.g. Send the training budget by Friday")}`;
  } else {
    // add-request
    eyebrow = "New request";
    saveLabel = "Add request";
    body = `
      ${inputField("text", "Request", `What ${copy.name} is asking for`)}
      ${selectField("category", "Category", CATEGORY_OPTIONS, "growth_development")}
      ${textareaField("note", "Detail", "Context…")}`;
  }

  const foot = `<button type="button" class="btn btn--ghost" data-close>${panel.type.startsWith("add-") ? "Cancel" : "Close"}</button><button type="button" class="btn" data-save>${esc(saveLabel)}</button>`;

  return `
    <div class="gd-backdrop" data-close></div>
    <aside class="gd-panel" role="dialog" aria-label="${esc(eyebrow)}">
      <div class="gd-panel__head">
        <span class="eyebrow">${esc(eyebrow)}</span>
        <button type="button" class="gd-panel__x" data-close aria-label="Close">${ICONS.x}</button>
      </div>
      <div class="gd-panel__body">${body}</div>
      <div class="gd-panel__foot">${foot}</div>
    </aside>`;
}
