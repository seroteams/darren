// Monthly Check-in stage content (monthly-one-on-one Phase 2). The per-stage HTML + the
// side panels. Catch-up / Requests / Goals now render from REAL per-person tracker data
// (promises/requests/goals that carry month to month); Rating / Feedback / Summary / Review
// still carry prototype sample content (Phases 3–4) but use the real person's name.
//
// The panels save for real: request/goal panels PATCH the tracker item, "+ Add" panels POST
// a new one, and Catch-up promise outcome chips are applied to the tracker rows at complete().

import type { GuidedStageId } from "./guided-arcs.ts";
import type { GuidedDraft, StageView, GroupedTrackers, TrackerView, TrackerHistoryEvent } from "./guided.types.ts";

// The runtime context each stage renders against.
export interface RunnerCtx {
  personName: string;
  trackers: GroupedTrackers;
}

// ---- tiny icon set (lucide-style inline SVGs) ----------------------------------------
const I = (d: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONS: Record<string, string> = {
  chat: I(`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`),
  inbox: I(`<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`),
  star: I(`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`),
  bubble: I(`<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>`),
  target: I(`<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`),
  doc: I(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`),
  clip: I(`<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>`),
  clock: I(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`),
  info: I(`<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`),
  check: I(`<path d="M20 6 9 17l-5-5"/>`),
  plus: I(`<path d="M12 5v14M5 12h14"/>`),
  chev: I(`<path d="m9 18 6-6-6-6"/>`),
  x: I(`<path d="M18 6 6 18M6 6l12 12"/>`),
  flow: I(`<circle cx="5" cy="6" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 6h8a3 3 0 0 1 3 3v1"/><path d="M16 18H8a3 3 0 0 1-3-3v-1"/>`),
  people: I(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),
  trend: I(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`),
  smile: I(`<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>`),
  heart: I(`<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`),
  lock: I(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`),
};

export const STAGE_META: Record<GuidedStageId, { label: string; icon: string }> = {
  catchup: { label: "Catch-up", icon: "chat" },
  requests: { label: "Requests", icon: "inbox" },
  rating: { label: "Rating", icon: "star" },
  feedback: { label: "Feedback", icon: "bubble" },
  goals: { label: "Goals", icon: "target" },
  summary: { label: "Summary", icon: "doc" },
  wrapup: { label: "Review", icon: "clip" },
};

// ---- label maps (enum value ↔ human label) -------------------------------------------
const CAT_LABEL: Record<string, string> = {
  growth_development: "Growth & development",
  ideas_suggestions: "Ideas & suggestions",
  concerns_feedback: "Concerns & feedback",
};
const REQ_STATUS: Record<string, string> = { new: "New", in_progress: "In progress", resolved: "Resolved" };
const GOAL_STATUS: Record<string, string> = { not_started: "Not started", in_progress: "In progress", done: "Done" };

const OUTCOMES = [
  { value: "yes", label: "Done" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "Not yet" },
  { value: "changed", label: "Changed" },
];

function statusCls(status: string): string {
  if (status === "done" || status === "resolved") return "done";
  if (status === "in_progress") return "prog";
  return "new";
}
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"));
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// ---- still-mock content for Phases 3–4 (name is real; scenario data is placeholder) ---
const BLOCKS = [
  { id: "tasks", label: "Tasks", icon: "check", last: 7 },
  { id: "processes", label: "Processes", icon: "flow", last: 6 },
  { id: "team", label: "Our team", icon: "people", last: 8 },
  { id: "development", label: "Development", icon: "trend", last: 5 },
  { id: "fun", label: "Fun", icon: "smile", last: 7 },
  { id: "fulfilment", label: "Fulfilment", icon: "heart", last: 6 },
];
function feedbackQuestions(name: string): { key: string; tag: string; stem: string; coach: string }[] {
  return [
    { key: "less", tag: "Less of", stem: `What would ${name} like less of?`, coach: `What drains their energy — tasks, meetings, interruptions? Listen for patterns that might point to something systemic.` },
    { key: "more", tag: "More of", stem: `What would ${name} like more of?`, coach: "More ownership, more feedback, more pairing time? Ask what it would unlock for them." },
    { key: "learn", tag: "Learn", stem: `What does ${name} want to learn?`, coach: "A skill, a tool, a role to shadow — tie it into the goals stage next." },
  ];
}
export type FeedbackKey = "less" | "more" | "learn";
const MOCK_LAST = "your last check-in";

// ---- builders ------------------------------------------------------------------------
const qCard = ({ n, of, stem, coach, src }: { n: number; of: number; stem: string; coach: string; src?: string }): string => `
  <div class="mcr-card mcr-q">
    <div class="mcr-q__head">
      <span class="mcr-q__logo">S</span>
      <span class="mcr-q__n">(${n}/${of})</span>
      <span class="mcr-q__stem">${stem}</span>
      <button type="button" class="mcr-q__clock" aria-label="View history" title="View history">${ICONS.clock}</button>
    </div>
    <p class="mcr-q__coach">${coach}</p>
    ${src ? `<p class="mcr-q__src">${src}</p>` : ""}
  </div>`;

const notesCard = (placeholder: string, save: string): string => `
  <div class="mcr-card mcr-notes">
    <textarea data-save="${save}" placeholder="${esc(placeholder)}"></textarea>
    <div class="mcr-notes__foot"><span class="mcr-q__src" style="margin:0">Saved automatically</span></div>
  </div>`;

const cta = (label: string, action = "next"): string =>
  `<div class="mcr-cta"><button type="button" class="mcr-btn mcr-btn--primary" data-${action}>${label}</button></div>`;

const addRow = (open: string, label: string): string =>
  `<div class="mcr-addrow"><button type="button" class="mcr-btn mcr-btn--outline" data-open="${open}">${ICONS.plus}<span>${label}</span></button></div>`;

const emptyNote = (text: string): string => `<p class="mcr-q__src" style="text-align:center; margin:0 0 18px">${text}</p>`;

// ---- stage content -------------------------------------------------------------------
export function stageHtml(id: GuidedStageId, draft: GuidedDraft, ctx: RunnerCtx): StageView {
  const name = ctx.personName || "them";

  if (id === "catchup") {
    const outcomes = draft.catchup?.outcomes ?? {};
    const promises = ctx.trackers.promises;
    const rows = promises.map((p) => `
      <div class="mcr-prom__row">
        <span class="mcr-owner mcr-owner--${p.owner === "manager" ? "you" : "them"}">${p.owner === "manager" ? "You" : esc(name)}</span>
        <span class="mcr-prom__text">${esc(p.text)}</span>
        <div class="mcr-chips" role="group" aria-label="Did it happen?">
          ${OUTCOMES.map((o) => `<button type="button" class="mcr-chip" data-item="${p.id}" data-value="${o.value}"${outcomes[p.id] === o.value ? " data-selected" : ""}>${o.label}</button>`).join("")}
        </div>
      </div>`).join("");
    const promisesCard = promises.length
      ? `<div class="mcr-card mcr-prom">
          <div class="mcr-q__head" style="margin-bottom:4px">
            <span class="mcr-q__logo">S</span>
            <span class="mcr-q__stem">Last month's promises — did they happen?</span>
          </div>
          ${rows}
        </div>`
      : emptyNote(`No open promises from last time — anything you both commit to today, add below so it comes back next month.`);
    return {
      title: "A quick catch-up to start things off",
      sub: "Start where you left off — how did last month's promises go?",
      body: `
        ${promisesCard}
        ${addRow("add-promise", "Add a promise")}
        ${notesCard(`Notes on ${name}'s answers`, "catchup.notes")}
        ${cta("Continue to requests")}`,
    };
  }

  if (id === "requests") {
    const requests = ctx.trackers.requests;
    const rows = requests.map((r) => `
      <button type="button" class="mcr-row" data-open="request" data-id="${r.id}">
        <span class="mcr-row__text">${esc(r.text)}</span>
        <span class="mcr-row__cat">${CAT_LABEL[r.category ?? ""] ?? ""}</span>
        <span class="mcr-status mcr-status--${statusCls(r.status)}">${REQ_STATUS[r.status] ?? r.status}</span>
        <span class="mcr-row__chev">${ICONS.chev}</span>
      </button>`).join("");
    return {
      title: requests.length ? `${name} has ${requests.length} thing${requests.length === 1 ? "" : "s"} to discuss` : `Anything ${name} wants to raise?`,
      sub: `Click any request to open it — discuss priorities, blockers, and next steps in the side panel.`,
      body: `${rows || emptyNote("No open requests. Add one as it comes up.")}
        ${addRow("add-request", "Add request")}
        ${cta("Continue to Ratings")}`,
    };
  }

  if (id === "rating") {
    const scores = draft.rating?.scores ?? {};
    const rows = BLOCKS.map((b) => {
      const val = scores[b.id] ?? 5;
      const pct = ((b.last - 1) / 9) * 100;
      return `
      <div class="mcr-card mcr-block">
        <div class="mcr-block__head">
          <span class="mcr-block__icon">${ICONS[b.icon]}</span>
          <span class="mcr-block__label">${b.label} ${ICONS.info}</span>
          <span class="mcr-block__score" data-score-for="${b.id}">${Number(val).toFixed(1)}</span>
        </div>
        <div class="mcr-slider">
          <span class="mcr-lastmark" style="left:${pct}%">${b.last.toFixed(1)} · ${MOCK_LAST}</span>
          <input type="range" min="1" max="10" step="0.5" value="${val}" data-block="${b.id}" aria-label="${b.label} score 1 to 10" />
          <div class="mcr-slider__labels"><span>1 Low score</span><span>5 Normal</span><span>10 Thriving</span></div>
        </div>
        <div class="mcr-block__note"><input type="text" data-note-block="${b.id}" placeholder="Add a note about this rating..." /></div>
      </div>`;
    }).join("");
    return {
      title: "Building block ratings",
      sub: `Ask ${name} to rate how they feel about each area — they say the number out loud, you type it in. (Real last-time markers arrive next phase.)`,
      body: `${rows}${cta("Continue to Feedback")}`,
    };
  }

  if (id === "feedback") {
    const questions = feedbackQuestions(name);
    const idx = draft.feedback?.fbStep ?? 0;
    const done = questions.slice(0, idx).map((f) => `
      <div class="mcr-card mcr-q mcr-q--done">
        <div class="mcr-q__head">
          <span class="mcr-q__logo">${ICONS.check}</span>
          <span class="mcr-q__stem">${f.stem}</span>
        </div>
      </div>`).join("");
    const q = questions[Math.min(idx, questions.length - 1)]!;
    const last = idx >= questions.length - 1;
    return {
      title: "Looking to the future",
      sub: `${name}'s chance to share what they'd like more of, less of, and what they want to learn — one at a time.`,
      body: `
        ${done}
        ${qCard({ n: Math.min(idx, questions.length - 1) + 1, of: questions.length, stem: q.stem, coach: q.coach, src: "Suggested by Sero" })}
        ${notesCard(`Notes on ${name}'s answers`, `feedback.${q.key}`)}
        ${last
          ? cta("Continue to goals")
          : `<div class="mcr-cta"><button type="button" class="mcr-btn mcr-btn--primary" data-fbnext>Next question →</button></div>`}`,
    };
  }

  if (id === "goals") {
    const goals = ctx.trackers.goals;
    const rows = goals.map((g) => `
      <button type="button" class="mcr-row" data-open="goal" data-id="${g.id}">
        <span class="mcr-row__text">${esc(g.text)}</span>
        <span class="mcr-row__pct">${g.progress ?? 0}%</span>
        <span class="mcr-status mcr-status--${statusCls(g.status)}">${GOAL_STATUS[g.status] ?? g.status}</span>
        <span class="mcr-row__chev">${ICONS.chev}</span>
      </button>`).join("");
    return {
      title: goals.length ? `Review ${goals.length} goal${goals.length === 1 ? "" : "s"} together` : `Set a goal with ${name}`,
      sub: `Click a goal to open it — discuss progress, blockers, and celebrate wins in the side panel.`,
      body: `${rows || emptyNote("No goals yet. Agree one together and it'll carry across your check-ins.")}
        ${addRow("add-goal", "Add a new goal")}
        ${cta("Continue to 1:1 Summary")}`,
    };
  }

  if (id === "summary") {
    return {
      title: "Your 1:1 summary",
      sub: "Sero drafts this from everything above and your last check-in — read it together, tweak anything, and it's saved.",
      body: `
        <p class="mcr-ainote"><span class="mcr-q__logo">S</span> The live AI draft arrives in a later phase — for now, write the summary yourself.</p>
        ${notesCard(`Summary of your check-in with ${name}…`, "summary.text")}
        ${cta("Continue to Review")}`,
    };
  }

  // wrapup — private review
  const engagement = draft.wrapup?.engagement ?? null;
  const eng = [1, 2, 3, 4, 5].map((n) =>
    `<button type="button" data-eng="${n}"${engagement === n ? " data-selected" : ""}>${n}</button>`).join("");
  return {
    title: "Your private review",
    sub: `After ${name} leaves — a quiet moment for your own read. None of this is ever shared with them.`,
    body: `
      <div class="mcr-private">${ICONS.lock}<span>Private — just for you. ${esc(name)} never sees this stage.</span></div>
      <p style="text-align:center; font-weight:600; margin:0 0 2px">How engaged did they seem?</p>
      <div class="mcr-eng" role="group" aria-label="Engagement 1 to 5">${eng}</div>
      ${notesCard("Your private notes — anything you don't want to forget…", "wrapup.privateNotes")}
      <div class="mcr-cta" style="margin-top:22px"><button type="button" class="mcr-btn mcr-btn--primary" data-finish>${ICONS.check}<span>Complete 1:1</span></button></div>
      <div class="mcr-mock" data-finish-note hidden>Saved. Next month, your open promises, requests and goals all come back.</div>`,
  };
}

// ---- side panel (real save) ----------------------------------------------------------
export interface PanelState {
  type: "request" | "goal" | "add-request" | "add-goal" | "add-promise";
  id?: string;
}

function selectField(cls: string, label: string, options: [string, string][], current: string): string {
  return `<div class="mcr-field"><label>${label}</label><select class="${cls}">${options
    .map(([v, l]) => `<option value="${v}"${v === current ? " selected" : ""}>${l}</option>`)
    .join("")}</select></div>`;
}
function histHtml(history: TrackerHistoryEvent[]): string {
  if (!history.length) return `<div>No history yet.</div>`;
  return history.map((h) => `<div>${fmtDate(h.at)}${fmtDate(h.at) ? " — " : ""}${esc(h.text)}</div>`).join("");
}

export function panelHtml(panel: PanelState, ctx: RunnerCtx): string {
  let eyebrow = "";
  let body = "";
  let saveLabel = "Save";

  if (panel.type === "request") {
    const r = ctx.trackers.requests.find((x) => x.id === panel.id);
    eyebrow = "Request";
    body = r
      ? `
        <div class="mcr-panel__title">${esc(r.text)}</div>
        <div class="mcr-panel__meta"><span class="mcr-row__cat">${CAT_LABEL[r.category ?? ""] ?? ""}</span><span class="mcr-status mcr-status--${statusCls(r.status)}">${REQ_STATUS[r.status] ?? r.status}</span></div>
        ${selectField("js-status", "Status", [["new", "New"], ["in_progress", "In progress"], ["resolved", "Resolved"]], r.status)}
        <div class="mcr-field"><label>Progress history</label><div class="mcr-hist">${histHtml(r.history)}</div></div>
        <div class="mcr-field"><label>Add a note</label><textarea class="js-note" placeholder="What you two talked through…"></textarea></div>`
      : `<div>Request not found.</div>`;
  } else if (panel.type === "goal") {
    const g = ctx.trackers.goals.find((x) => x.id === panel.id);
    eyebrow = "Goal";
    body = g
      ? `
        <div class="mcr-panel__title">${esc(g.text)}</div>
        <div class="mcr-panel__meta"><span class="mcr-row__pct">${g.progress ?? 0}%</span><span class="mcr-status mcr-status--${statusCls(g.status)}">${GOAL_STATUS[g.status] ?? g.status}</span></div>
        <div class="mcr-bar"><span style="width:${g.progress ?? 0}%"></span></div>
        <div class="mcr-field"><label>Progress (%)</label><input class="js-progress" type="number" min="0" max="100" step="5" value="${g.progress ?? 0}" /></div>
        ${selectField("js-status", "Status", [["not_started", "Not started"], ["in_progress", "In progress"], ["done", "Done"]], g.status)}
        <div class="mcr-field"><label>Progress history</label><div class="mcr-hist">${histHtml(g.history)}</div></div>
        <div class="mcr-field"><label>Add an update</label><textarea class="js-note" placeholder="What moved this month…"></textarea></div>`
      : `<div>Goal not found.</div>`;
  } else if (panel.type === "add-goal") {
    eyebrow = "New goal";
    saveLabel = "Add goal";
    body = `
      <div class="mcr-field"><label>Goal</label><input class="js-text" type="text" placeholder="e.g. Own a feature end-to-end by Q4" /></div>
      <div class="mcr-field"><label>Progress (%)</label><input class="js-progress" type="number" min="0" max="100" step="5" value="0" /></div>
      ${selectField("js-status", "Status", [["not_started", "Not started"], ["in_progress", "In progress"], ["done", "Done"]], "not_started")}
      <div class="mcr-field"><label>First note (optional)</label><textarea class="js-note" placeholder="Where it stands today…"></textarea></div>`;
  } else if (panel.type === "add-promise") {
    eyebrow = "New promise";
    saveLabel = "Add promise";
    body = `
      <div class="mcr-field"><label>Promise</label><input class="js-text" type="text" placeholder="e.g. Book ${esc(ctx.personName || "their")}'s onboarding buddy" /></div>
      ${selectField("js-owner", "Whose promise?", [["manager", "You"], ["member", ctx.personName || "Them"]], "manager")}`;
  } else {
    // add-request
    eyebrow = "New request";
    saveLabel = "Add request";
    body = `
      <div class="mcr-field"><label>Request</label><input class="js-text" type="text" placeholder="What ${esc(ctx.personName || "they")} is asking for" /></div>
      ${selectField("js-category", "Category", [["growth_development", "Growth & development"], ["ideas_suggestions", "Ideas & suggestions"], ["concerns_feedback", "Concerns & feedback"]], "growth_development")}
      <div class="mcr-field"><label>Detail</label><textarea class="js-note" placeholder="Context…"></textarea></div>`;
  }

  return `
    <div class="mcr-backdrop" data-close></div>
    <aside class="mcr-panel" role="dialog" aria-label="${eyebrow}">
      <div class="mcr-panel__head">
        <span class="mcr-panel__eyebrow">${eyebrow}</span>
        <button type="button" class="mcr-panel__x" data-close aria-label="Close">${ICONS.x}</button>
      </div>
      <div class="mcr-panel__body">${body}</div>
      <div class="mcr-panel__foot">
        <button type="button" class="mcr-btn mcr-btn--outline" data-close>Cancel</button>
        <button type="button" class="mcr-btn mcr-btn--primary" data-save-panel>${saveLabel}</button>
      </div>
    </aside>`;
}
