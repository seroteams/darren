// The right-hand side panel — opened from a request/goal row or an "+ Add" button. Ported
// from the approved prototype. PHASE-1 SHELL: it shows the mock request/goal detail and its
// Close/Save buttons just dismiss it; real tracker reads + writes (status, notes, history,
// add) arrive in Phase 2. Lives in the body portal so it's fixed over any stage.

import { ICONS } from "./guided-icons.ts";
import { esc } from "./guided-util.ts";
import { MOCK_GOALS, MOCK_REQUESTS } from "./mock-content.ts";
import type { CopyCtx } from "./coaching-copy.ts";

export type Panel =
  | { type: "request"; i: number }
  | { type: "goal"; i: number }
  | { type: "add-request" }
  | { type: "add-goal" };

const statusCls = (s: string): string =>
  s === "Done" ? "done" : s === "In progress" ? "prog" : "new";

const selectField = (label: string, opts: string[], current: string): string =>
  `<div class="mcr-field"><label>${esc(label)}</label><select>${opts
    .map((o) => `<option${o === current ? " selected" : ""}>${esc(o)}</option>`)
    .join("")}</select></div>`;

export function panelHtml(panel: Panel, copy: CopyCtx): string {
  let eyebrow = "";
  let body = "";
  let foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Close</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Save</button>`;

  if (panel.type === "request") {
    const r = MOCK_REQUESTS[panel.i]!;
    eyebrow = "Request";
    body = `
      <div class="mcr-panel__title">${esc(r.text)}</div>
      <div class="mcr-panel__meta"><span class="mcr-row__cat">${esc(r.cat)}</span><span class="mcr-status mcr-status--${statusCls(r.status)}">${esc(r.status)}</span><span class="mcr-q__src" style="margin:0">${esc(r.raised)}</span></div>
      <div class="mcr-hist"><div>${esc(r.note)}</div></div>
      ${selectField("Status", ["New", "In progress", "Resolved"], r.status)}
      <div class="mcr-field"><label>Discussion notes</label><textarea placeholder="What you two talked through…"></textarea></div>
      <div class="mcr-field"><label>Next step</label><input type="text" placeholder="e.g. Pair with a senior on the checkout flow next sprint" /></div>`;
  } else if (panel.type === "goal") {
    const g = MOCK_GOALS[panel.i]!;
    eyebrow = "Goal";
    body = `
      <div class="mcr-panel__title">${esc(g.text)}</div>
      <div class="mcr-panel__meta"><span class="mcr-row__pct">${g.pct}%</span><span class="mcr-status mcr-status--${statusCls(g.status)}">${esc(g.status)}</span></div>
      <div class="mcr-bar"><span style="width:${g.pct}%"></span></div>
      ${selectField("Status", ["Not started", "In progress", "Done"], g.status)}
      <div class="mcr-field"><label>Progress history</label><div class="mcr-hist">${g.history.map((h) => `<div>${esc(h)}</div>`).join("")}</div></div>
      <div class="mcr-field"><label>Add an update</label><textarea placeholder="What moved this month…"></textarea></div>`;
  } else if (panel.type === "add-goal") {
    eyebrow = "New goal";
    body = `
      <div class="mcr-field"><label>Goal</label><input type="text" placeholder="e.g. Own a feature end-to-end by Q4" /></div>
      ${selectField("Status", ["Not started", "In progress", "Done"], "Not started")}
      <div class="mcr-field"><label>First note (optional)</label><textarea placeholder="Where it stands today…"></textarea></div>`;
    foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Cancel</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Add goal</button>`;
  } else {
    // add-request
    eyebrow = "New request";
    body = `
      <div class="mcr-field"><label>Request</label><input type="text" placeholder="What ${esc(copy.name)} is asking for" /></div>
      ${selectField("Category", ["Growth & development", "Ideas & suggestions", "Concerns & feedback"], "Growth & development")}
      <div class="mcr-field"><label>Detail</label><textarea placeholder="Context…"></textarea></div>`;
    foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Cancel</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Add request</button>`;
  }

  return `
    <div class="mcr-backdrop" data-close></div>
    <aside class="mcr-panel" role="dialog" aria-label="${esc(eyebrow)}">
      <div class="mcr-panel__head">
        <span class="mcr-panel__eyebrow">${esc(eyebrow)}</span>
        <button type="button" class="mcr-panel__x" data-close aria-label="Close">${ICONS.x}</button>
      </div>
      <div class="mcr-panel__body">${body}</div>
      <div class="mcr-panel__foot">${foot}</div>
    </aside>`;
}
