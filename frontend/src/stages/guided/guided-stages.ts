// The stage library — one self-contained renderer per stage id. The runner (guided.page.ts)
// reads arc.stages and dispatches through STAGE_RENDERERS; it never hardcodes the stage list
// (architecture.md §2b). Each renderer returns { title, sub, body } and reads the typed
// GuidedState draft + the live trackers defensively. From Phase 2 the trackers (promises/
// requests/goals) are REAL — fetched by the runner and passed in; the manager's typed notes,
// rating sliders, promise outcomes, feedback answers and engagement are the session's own state.

import type { GroupedTrackers, GuidedStageId, GuidedState, TrackerItem } from "./guided.types.ts";
import { ICONS } from "./guided-icons.ts";
import { esc } from "./guided-util.ts";
import {
  CATEGORY_LABELS,
  FEEDBACK,
  OUTCOMES,
  RATING_BLOCKS,
  STAGE_UI,
  STATUS_LABELS,
  stageCopy,
  statusClass,
  type CopyCtx,
} from "./coaching-copy.ts";

export type StageRenderer = (
  state: GuidedState,
  copy: CopyCtx,
  trackers: GroupedTrackers,
) => { title: string; sub: string; body: string };

// ---- shared builders ------------------------------------------------------------------------
const qCard = ({
  n,
  of,
  stem,
  coach,
  src,
}: {
  n: number;
  of: number;
  stem: string;
  coach: string;
  src?: string;
}): string => `
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

const notesCard = (path: string, placeholder: string, value: string): string => `
  <div class="mcr-card mcr-notes">
    <textarea data-notes="${esc(path)}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
  </div>`;

const cta = (label: string, action = "next"): string =>
  `<div class="mcr-cta"><button type="button" class="mcr-btn mcr-btn--primary" data-${action}>${esc(label)}</button></div>`;

const statusPill = (status: string): string =>
  `<span class="mcr-status mcr-status--${statusClass(status)}">${esc(STATUS_LABELS[status] ?? status)}</span>`;

// ---- the renderers --------------------------------------------------------------------------
const catchup: StageRenderer = (state, copy, trackers) => {
  const { title, sub } = stageCopy("catchup", copy);
  const outcomes = state.catchup?.outcomes ?? {};
  const open = trackers.promises.filter((p) => p.status === "open");
  const rows = open
    .map(
      (p) => `
      <div class="mcr-prom__row">
        <span class="mcr-owner mcr-owner--${p.owner === "manager" ? "you" : "them"}">${p.owner === "manager" ? "You" : esc(copy.name)}</span>
        <span class="mcr-prom__text">${esc(p.text)}</span>
        <div class="mcr-chips" role="group" aria-label="Did it happen?">
          ${OUTCOMES.map(
            (o) =>
              `<button type="button" class="mcr-chip" data-outcome="${esc(p.id)}" data-value="${o.value}"${outcomes[p.id] === o.value ? " data-selected" : ""}>${esc(o.label)}</button>`,
          ).join("")}
        </div>
      </div>`,
    )
    .join("");
  return {
    title,
    sub,
    body: `
      <div class="mcr-card mcr-prom">
        <div class="mcr-q__head" style="margin-bottom:4px">
          <span class="mcr-q__logo">S</span>
          <span class="mcr-q__stem">Last month's promises — did they happen?</span>
        </div>
        ${rows || `<p class="mcr-q__coach" style="margin:6px 0 0">Nothing open from last time — you're all caught up.</p>`}
      </div>
      <div class="mcr-addrow"><button type="button" class="mcr-btn mcr-btn--outline" data-open="add-promise">${ICONS.plus}<span>Add a promise</span></button></div>
      ${notesCard("catchup.notes", `Notes on ${copy.name}'s answers`, state.catchup?.notes ?? "")}
      ${cta("Continue to requests")}`,
  };
};

const rowCard = (kind: "request" | "goal", item: TrackerItem): string => {
  const mid =
    kind === "request"
      ? item.category
        ? `<span class="mcr-row__cat">${esc(CATEGORY_LABELS[item.category] ?? item.category)}</span>`
        : ""
      : `<span class="mcr-row__pct">${item.progress}%</span>`;
  return `
    <button type="button" class="mcr-row" data-open="${kind}" data-id="${esc(item.id)}">
      <span class="mcr-row__text">${esc(item.text)}</span>
      ${mid}
      ${statusPill(item.status)}
      <span class="mcr-row__chev">${ICONS.chev}</span>
    </button>`;
};

const requests: StageRenderer = (state, copy, trackers) => {
  const { title, sub } = stageCopy("requests", copy);
  const rows = trackers.requests.map((r) => rowCard("request", r)).join("");
  return {
    title,
    sub,
    body: `${rows || `<p class="mcr-sub" style="margin:0 auto 24px">No open requests yet — add the first one below.</p>`}
      <div class="mcr-addrow"><button type="button" class="mcr-btn mcr-btn--outline" data-open="add-request">${ICONS.plus}<span>Add request</span></button></div>
      ${cta("Continue to Ratings")}`,
  };
};

const goals: StageRenderer = (state, copy, trackers) => {
  const { title, sub } = stageCopy("goals", copy);
  const rows = trackers.goals.map((g) => rowCard("goal", g)).join("");
  return {
    title,
    sub,
    body: `${rows || `<p class="mcr-sub" style="margin:0 auto 24px">No goals yet — add one below.</p>`}
      <div class="mcr-addrow"><button type="button" class="mcr-btn mcr-btn--outline" data-open="add-goal">${ICONS.plus}<span>Add a new goal</span></button></div>
      ${cta("Continue to 1:1 Summary")}`,
  };
};

const rating: StageRenderer = (state, copy) => {
  const { title, sub } = stageCopy("rating", copy);
  const scores = state.rating?.scores ?? {};
  const blockNotes = state.rating?.blockNotes ?? {};
  const rows = RATING_BLOCKS.map((b) => {
    const val = scores[b.id] ?? 5;
    const pct = ((b.last - 1) / 9) * 100;
    return `
      <div class="mcr-card mcr-block">
        <div class="mcr-block__head">
          <span class="mcr-block__icon">${ICONS[b.icon]}</span>
          <span class="mcr-block__label">${esc(b.label)} ${ICONS.info}</span>
          <span class="mcr-block__score" data-score-for="${b.id}">${Number(val).toFixed(1)}</span>
        </div>
        <div class="mcr-slider">
          <span class="mcr-lastmark" style="left:${pct}%">${b.last.toFixed(1)} · last month</span>
          <input type="range" min="1" max="10" step="0.5" value="${val}" data-block="${b.id}" aria-label="${esc(b.label)} score 1 to 10" />
          <div class="mcr-slider__labels"><span>1 Low score</span><span>5 Normal</span><span>10 Thriving</span></div>
        </div>
        <div class="mcr-block__note"><input type="text" data-blocknote="${b.id}" value="${esc(blockNotes[b.id] ?? "")}" placeholder="Add a note about this rating..." /></div>
      </div>`;
  }).join("");
  return { title, sub, body: `${rows}${cta("Continue to Feedback")}` };
};

const feedback: StageRenderer = (state, copy) => {
  const { title, sub } = stageCopy("feedback", copy);
  const idx = Math.min(state.feedback?.fbStep ?? 0, FEEDBACK.length - 1);
  const done = FEEDBACK.slice(0, idx)
    .map(
      (f) => `
      <div class="mcr-card mcr-q mcr-q--done">
        <div class="mcr-q__head">
          <span class="mcr-q__logo">${ICONS.check}</span>
          <span class="mcr-q__stem">${esc(f.stem(copy))}</span>
        </div>
      </div>`,
    )
    .join("");
  const q = FEEDBACK[idx]!;
  const answer = (state.feedback?.[q.key] as string | undefined) ?? "";
  const last = idx === FEEDBACK.length - 1;
  return {
    title,
    sub,
    body: `
      ${done}
      ${qCard({ n: idx + 1, of: FEEDBACK.length, stem: q.stem(copy), coach: q.coach, src: "Suggested by Sero" })}
      ${notesCard(`feedback.${q.key}`, `Notes on ${copy.name}'s answer`, answer)}
      ${
        last
          ? cta("Continue to goals")
          : `<div class="mcr-cta"><button type="button" class="mcr-btn mcr-btn--primary" data-fbnext>Next question →</button></div>`
      }`,
  };
};

const summary: StageRenderer = (state, copy) => {
  const { title, sub } = stageCopy("summary", copy);
  return {
    title,
    sub,
    body: `
      <p class="mcr-ainote"><span class="mcr-q__logo">S</span> Sero will draft this from the session + your last check-in — for now, capture the key points below.</p>
      <div class="mcr-card mcr-sum">
        <h3>This month with ${esc(copy.name)}</h3>
        <p>Your summary will appear here once the AI draft step is switched on. Until then, use the notes below to jot what you agreed — it saves as you type.</p>
      </div>
      ${notesCard("summary.edited", "Write the summary…", state.summary?.edited ?? "")}
      ${cta("Continue to Review")}`,
  };
};

const wrapup: StageRenderer = (state, copy) => {
  const { title, sub } = stageCopy("wrapup", copy);
  const engagement = state.wrapup?.engagement ?? null;
  const eng = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<button type="button" data-eng="${n}"${engagement === n ? " data-selected" : ""}>${n}</button>`,
    )
    .join("");
  return {
    title,
    sub,
    body: `
      <div class="mcr-private">${ICONS.lock}<span>Private — just for you. ${esc(copy.name)} never sees this stage.</span></div>
      <p style="text-align:center; font-weight:600; margin:0 0 2px">How engaged did they seem?</p>
      <div class="mcr-eng" role="group" aria-label="Engagement 1 to 5">${eng}</div>
      ${notesCard("wrapup.privateNotes", "Your private notes — anything you don't want to forget…", state.wrapup?.privateNotes ?? "")}
      <div class="mcr-card mcr-sugg">
        <div class="mcr-q__head" style="margin-bottom:6px">
          <span class="mcr-q__logo">S</span>
          <span class="mcr-q__stem">Sero's suggestions (private)</span>
        </div>
        <p class="mcr-q__coach" style="margin-left:0">Private coaching suggestions will appear here once the AI step is switched on (Phase 5).</p>
      </div>
      <div class="mcr-cta" style="margin-top:22px"><button type="button" class="mcr-btn mcr-btn--primary" data-finish>${ICONS.check}<span>Complete 1:1</span></button></div>
      <div class="mcr-mock" data-finish-note hidden>Saved. Next month, everything here comes back — promises, requests, goals, and the trend lines.</div>`,
  };
};

export const STAGE_RENDERERS: Record<GuidedStageId, StageRenderer> = {
  catchup,
  requests,
  rating,
  feedback,
  goals,
  summary,
  wrapup,
};

export { STAGE_UI };
