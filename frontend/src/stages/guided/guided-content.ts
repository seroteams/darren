// Monthly Check-in stage content (monthly-one-on-one Phase 1). The per-stage HTML +
// coaching copy + the side-panel, ported from the approved /test prototype.
//
// PHASE-1 SCOPE: the promises / requests / goals / block scores shown here are still the
// prototype's SAMPLE data ("Aisha") — real per-person tracker data + the last-time markers
// arrive in Phases 2–3. What IS real in Phase 1: the manager's typed inputs (catch-up
// notes, promise outcomes, ratings + notes, feedback answers, summary edit, engagement,
// private notes) persist to guided_sessions.state and survive a reload. Reads are
// defensive (missing draft key ⇒ empty).

import type { GuidedStageId } from "./guided-arcs.ts";
import type { GuidedDraft, StageView } from "./guided.types.ts";

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

/** Per-stage label + nav icon. The ORDER comes from the arc (guided-arcs.ts) — this map
 *  only supplies each stage's display bits, so a new arc reuses these unchanged. */
export const STAGE_META: Record<GuidedStageId, { label: string; icon: string }> = {
  catchup: { label: "Catch-up", icon: "chat" },
  requests: { label: "Requests", icon: "inbox" },
  rating: { label: "Rating", icon: "star" },
  feedback: { label: "Feedback", icon: "bubble" },
  goals: { label: "Goals", icon: "target" },
  summary: { label: "Summary", icon: "doc" },
  wrapup: { label: "Review", icon: "clip" },
};

// ---- Phase-1 sample data (prototype's "Aisha"; real per-person data = Phase 2/3) ------
const PERSON = { name: "Aisha", full: "Aisha Rahman", last: "9 Jun 2026" };

const PROMISES = [
  { owner: "you", action: "Book Aisha's onboarding buddy" },
  { owner: "Aisha", action: "Track where her hours actually go for a week" },
];
const OUTCOMES = [
  { value: "yes", label: "Done" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "Not yet" },
  { value: "changed", label: "Changed" },
];
const REQUESTS = [
  { text: "Wants to shadow a senior on the checkout redesign", cat: "Growth & development", status: "New", raised: "raised this month", note: "Keen to see how a senior scopes a big flow before she leads one herself." },
  { text: "Clearer priorities at the start of each sprint", cat: "Concerns & feedback", status: "In progress", raised: "raised 2 months ago", note: "Comes up repeatedly — she loses the first day of each sprint working out what matters." },
];
const BLOCKS = [
  { id: "tasks", label: "Tasks", icon: "check", last: 7 },
  { id: "processes", label: "Processes", icon: "flow", last: 6 },
  { id: "team", label: "Our team", icon: "people", last: 8 },
  { id: "development", label: "Development", icon: "trend", last: 5 },
  { id: "fun", label: "Fun", icon: "smile", last: 7 },
  { id: "fulfilment", label: "Fulfilment", icon: "heart", last: 6 },
];
const GOALS = [
  { text: "Own a feature end-to-end by Q3", pct: 77, status: "In progress", history: ["Jun — leading the empty-states work", "May — shadowing on the settings flow"] },
  { text: "Get confident giving design crit", pct: 24, status: "In progress", history: ["Jun — spoke up in two reviews"] },
  { text: "Run 3 peer feedback cycles", pct: 100, status: "Done", history: ["Jun — third cycle wrapped"] },
];
const FEEDBACK = [
  { key: "less", tag: "Less of", stem: `What would ${PERSON.name} like less of?`, coach: `What drains her energy — tasks, meetings, interruptions? Listen for patterns that might point to something systemic.` },
  { key: "more", tag: "More of", stem: `What would ${PERSON.name} like more of?`, coach: "More ownership, more feedback, more pairing time? Ask what it would unlock for her." },
  { key: "learn", tag: "Learn", stem: `What does ${PERSON.name} want to learn?`, coach: "A skill, a tool, a role to shadow — tie it into the goals stage next." },
] as const;

export type FeedbackKey = (typeof FEEDBACK)[number]["key"];

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

// A borderless notes card. `save` is the draft path the page auto-saves this textarea to.
const notesCard = (placeholder: string, save: string): string => `
  <div class="mcr-card mcr-notes">
    <textarea data-save="${save}" placeholder="${placeholder}"></textarea>
    <div class="mcr-notes__foot"><span class="mcr-q__src" style="margin:0">Saved automatically</span></div>
  </div>`;

const cta = (label: string, action = "next"): string =>
  `<div class="mcr-cta"><button type="button" class="mcr-btn mcr-btn--primary" data-${action}>${label}</button></div>`;

const statusCls = (s: string): string => (s === "Done" ? "done" : s === "In progress" ? "prog" : "new");

// ---- stage content -------------------------------------------------------------------
export function stageHtml(id: GuidedStageId, draft: GuidedDraft): StageView {
  if (id === "catchup") {
    const outcomes = draft.catchup?.outcomes ?? {};
    const rows = PROMISES.map((p, i) => `
      <div class="mcr-prom__row">
        <span class="mcr-owner mcr-owner--${p.owner === "you" ? "you" : "them"}">${p.owner === "you" ? "You" : PERSON.name}</span>
        <span class="mcr-prom__text">${p.action}</span>
        <div class="mcr-chips" role="group" aria-label="Did it happen?">
          ${OUTCOMES.map((o) => `<button type="button" class="mcr-chip" data-item="${i}" data-value="${o.value}"${outcomes[i] === o.value ? " data-selected" : ""}>${o.label}</button>`).join("")}
        </div>
      </div>`).join("");
    return {
      title: "A quick catch-up to start things off",
      sub: "Start where you left off — how did last month's promises go?",
      body: `
        <div class="mcr-card mcr-prom">
          <div class="mcr-q__head" style="margin-bottom:4px">
            <span class="mcr-q__logo">S</span>
            <span class="mcr-q__stem">Last month's promises — did they happen?</span>
          </div>
          ${rows}
        </div>
        ${notesCard(`Notes on ${PERSON.name}'s answers`, "catchup.notes")}
        ${cta("Continue to requests")}`,
    };
  }

  if (id === "requests") {
    const rows = REQUESTS.map((r, i) => `
      <button type="button" class="mcr-row" data-open="request" data-i="${i}">
        <span class="mcr-row__text">${r.text}</span>
        <span class="mcr-row__cat">${r.cat}</span>
        <span class="mcr-status mcr-status--${statusCls(r.status)}">${r.status}</span>
        <span class="mcr-row__chev">${ICONS.chev}</span>
      </button>`).join("");
    return {
      title: `${PERSON.name} has ${REQUESTS.length} things to discuss`,
      sub: `Click any request to open it — discuss priorities, blockers, and next steps in the side panel.`,
      body: `${rows}
        <div class="mcr-addrow"><button type="button" class="mcr-btn mcr-btn--outline" data-open="add-request">${ICONS.plus}<span>Add request</span></button></div>
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
          <span class="mcr-lastmark" style="left:${pct}%">${b.last.toFixed(1)} · ${PERSON.last}</span>
          <input type="range" min="1" max="10" step="0.5" value="${val}" data-block="${b.id}" aria-label="${b.label} score 1 to 10" />
          <div class="mcr-slider__labels"><span>1 Low score</span><span>5 Normal</span><span>10 Thriving</span></div>
        </div>
        <div class="mcr-block__note"><input type="text" data-note-block="${b.id}" placeholder="Add a note about this rating..." /></div>
      </div>`;
    }).join("");
    return {
      title: "Building block ratings",
      sub: `Ask ${PERSON.full} to rate how they feel about each area — she says the number out loud, you type it in. The marker shows last month.`,
      body: `${rows}${cta("Continue to Feedback")}`,
    };
  }

  if (id === "feedback") {
    const idx = draft.feedback?.fbStep ?? 0;
    const done = FEEDBACK.slice(0, idx).map((f) => `
      <div class="mcr-card mcr-q mcr-q--done">
        <div class="mcr-q__head">
          <span class="mcr-q__logo">${ICONS.check}</span>
          <span class="mcr-q__stem">${f.stem}</span>
        </div>
      </div>`).join("");
    const q = FEEDBACK[Math.min(idx, FEEDBACK.length - 1)]!;
    const last = idx >= FEEDBACK.length - 1;
    return {
      title: "Looking to the future",
      sub: `${PERSON.full}'s chance to share what they'd like more of, less of, and what they want to learn — one at a time.`,
      body: `
        ${done}
        ${qCard({ n: Math.min(idx, FEEDBACK.length - 1) + 1, of: FEEDBACK.length, stem: q.stem, coach: q.coach, src: "Suggested by Sero" })}
        ${notesCard(`Notes on ${PERSON.name}'s answers`, `feedback.${q.key}`)}
        ${last
          ? cta("Continue to goals")
          : `<div class="mcr-cta"><button type="button" class="mcr-btn mcr-btn--primary" data-fbnext>Next question →</button></div>`}`,
    };
  }

  if (id === "goals") {
    const rows = GOALS.map((g, i) => `
      <button type="button" class="mcr-row" data-open="goal" data-i="${i}">
        <span class="mcr-row__text">${g.text}</span>
        <span class="mcr-row__pct">${g.pct}%</span>
        <span class="mcr-status mcr-status--${statusCls(g.status)}">${g.status}</span>
        <span class="mcr-row__chev">${ICONS.chev}</span>
      </button>`).join("");
    return {
      title: `Review ${GOALS.length} goals together`,
      sub: `Click a goal to open it — discuss progress, blockers, and celebrate wins in the side panel.`,
      body: `${rows}
        <div class="mcr-addrow"><button type="button" class="mcr-btn mcr-btn--outline" data-open="add-goal">${ICONS.plus}<span>Add a new goal</span></button></div>
        ${cta("Continue to 1:1 Summary")}`,
    };
  }

  if (id === "summary") {
    return {
      title: "Your 1:1 summary",
      sub: "Sero drafts this from everything above and your last check-in — read it together, tweak anything, and it's saved.",
      body: `
        <p class="mcr-ainote"><span class="mcr-q__logo">S</span> Drafted by Sero from this session + your ${PERSON.last} check-in — edit freely. (The live AI draft arrives in a later phase.)</p>
        <div class="mcr-card mcr-sum">
          <h3>July catch-up with ${PERSON.name}</h3>
          <p>Good month overall — Development is up (5 → 7) after she started leading the empty-states work. The onboarding buddy is finally booked. Sprint priorities are still fuzzy at the start of each sprint.</p>
          <ul>
            <li>Agreed: she shadows a senior on the checkout redesign this month.</li>
            <li>You set sprint priorities on the Monday of each sprint.</li>
            <li>Her "give design crit" goal moves to 40% — spoke up twice this month.</li>
          </ul>
        </div>
        ${notesCard("Edit the summary…", "summary.text")}
        ${cta("Continue to Review")}`,
    };
  }

  // wrapup — private review
  const engagement = draft.wrapup?.engagement ?? null;
  const eng = [1, 2, 3, 4, 5].map((n) =>
    `<button type="button" data-eng="${n}"${engagement === n ? " data-selected" : ""}>${n}</button>`).join("");
  return {
    title: "Your private review",
    sub: `After ${PERSON.name} leaves — a quiet moment for your own read. None of this is ever shared with her.`,
    body: `
      <div class="mcr-private">${ICONS.lock}<span>Private — just for you. ${PERSON.name} never sees this stage.</span></div>
      <p style="text-align:center; font-weight:600; margin:0 0 2px">How engaged did she seem?</p>
      <div class="mcr-eng" role="group" aria-label="Engagement 1 to 5">${eng}</div>
      ${notesCard("Your private notes — anything you don't want to forget…", "wrapup.privateNotes")}
      <div class="mcr-card mcr-sugg">
        <div class="mcr-q__head" style="margin-bottom:6px">
          <span class="mcr-q__logo">S</span>
          <span class="mcr-q__stem">Sero's suggestions (private)</span>
        </div>
        <div class="mcr-sugg__row"><span class="mcr-sugg__tag">For her</span><span>Give her a low-risk piece to present at the next design review.</span></div>
        <div class="mcr-sugg__row"><span class="mcr-sugg__tag">Team</span><span>The sprint-priorities gap may be hitting others too.</span></div>
        <div class="mcr-sugg__row"><span class="mcr-sugg__tag">Company</span><span>Juniors want senior-shadow time — worth making routine.</span></div>
      </div>
      <div class="mcr-cta" style="margin-top:22px"><button type="button" class="mcr-btn mcr-btn--primary" data-finish>${ICONS.check}<span>Complete 1:1</span></button></div>
      <div class="mcr-mock" data-finish-note hidden>Saved. Next month, everything here comes back — promises, requests, goals, and the trend lines.</div>`,
  };
}

// ---- side panel (requests + goals; add forms) — display-only this phase --------------
export interface PanelState {
  type: "request" | "goal" | "add-request" | "add-goal";
  i?: number;
}

export function panelHtml(panel: PanelState): string {
  const selectField = (label: string, opts: string[], current: string): string =>
    `<div class="mcr-field"><label>${label}</label><select>${opts.map((o) => `<option${o === current ? " selected" : ""}>${o}</option>`).join("")}</select></div>`;

  let eyebrow = "";
  let body = "";
  let foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Close</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Save</button>`;

  if (panel.type === "request") {
    const r = REQUESTS[panel.i ?? 0]!;
    eyebrow = "Request";
    body = `
      <div class="mcr-panel__title">${r.text}</div>
      <div class="mcr-panel__meta"><span class="mcr-row__cat">${r.cat}</span><span class="mcr-status mcr-status--${statusCls(r.status)}">${r.status}</span><span class="mcr-q__src" style="margin:0">${r.raised}</span></div>
      <div class="mcr-hist"><div>${r.note}</div></div>
      ${selectField("Status", ["New", "In progress", "Resolved"], r.status)}
      <div class="mcr-field"><label>Discussion notes</label><textarea placeholder="What you two talked through…"></textarea></div>
      <div class="mcr-field"><label>Next step</label><input type="text" placeholder="e.g. Pair with Sam on the checkout flow next sprint" /></div>`;
  } else if (panel.type === "goal") {
    const g = GOALS[panel.i ?? 0]!;
    eyebrow = "Goal";
    body = `
      <div class="mcr-panel__title">${g.text}</div>
      <div class="mcr-panel__meta"><span class="mcr-row__pct">${g.pct}%</span><span class="mcr-status mcr-status--${statusCls(g.status)}">${g.status}</span></div>
      <div class="mcr-bar"><span style="width:${g.pct}%"></span></div>
      ${selectField("Status", ["Not started", "In progress", "Done"], g.status)}
      <div class="mcr-field"><label>Progress history</label><div class="mcr-hist">${g.history.map((h) => `<div>${h}</div>`).join("")}</div></div>
      <div class="mcr-field"><label>Add an update</label><textarea placeholder="What moved this month…"></textarea></div>`;
  } else if (panel.type === "add-goal") {
    eyebrow = "New goal";
    body = `
      <div class="mcr-field"><label>Goal</label><input type="text" placeholder="e.g. Own a feature end-to-end by Q4" /></div>
      ${selectField("Status", ["Not started", "In progress", "Done"], "Not started")}
      <div class="mcr-field"><label>First note (optional)</label><textarea placeholder="Where it stands today…"></textarea></div>`;
    foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Cancel</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Add goal</button>`;
  } else {
    eyebrow = "New request";
    body = `
      <div class="mcr-field"><label>Request</label><input type="text" placeholder="What ${PERSON.name} is asking for" /></div>
      ${selectField("Category", ["Growth & development", "Ideas & suggestions", "Concerns & feedback"], "Growth & development")}
      <div class="mcr-field"><label>Detail</label><textarea placeholder="Context…"></textarea></div>`;
    foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Cancel</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Add request</button>`;
  }

  return `
    <div class="mcr-backdrop" data-close></div>
    <aside class="mcr-panel" role="dialog" aria-label="${eyebrow}">
      <div class="mcr-panel__head">
        <span class="mcr-panel__eyebrow">${eyebrow}</span>
        <button type="button" class="mcr-panel__x" data-close aria-label="Close">${ICONS.x}</button>
      </div>
      <div class="mcr-panel__body">${body}</div>
      <div class="mcr-panel__foot">${foot}</div>
    </aside>`;
}
