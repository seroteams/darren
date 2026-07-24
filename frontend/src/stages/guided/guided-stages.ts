// The stage library — one self-contained renderer per stage id. The runner (guided.page.ts)
// reads arc.stages and dispatches through STAGE_RENDERERS; it never hardcodes the stage list
// (architecture.md §2b). Each renderer returns { title, sub, body } and reads the typed
// GuidedState draft + the live trackers defensively. From Phase 2 the trackers (promises/
// requests/goals) are REAL — fetched by the runner and passed in; the manager's typed notes,
// rating sliders, promise outcomes, feedback answers and engagement are the session's own state.
// Cards ride the shared .card-flat primitive; buttons the shared .btn primitives (P5 F10).

import type { GroupedTrackers, GuidedStageId, GuidedState, TrackerItem } from "./guided.types.ts";
import { ICONS } from "./guided-icons.ts";
import { esc, shortDate } from "./guided-util.ts";
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

export interface RenderCtx {
  trackers: GroupedTrackers;
  /** Most-recent prior score per block id → { score, date } — the last-time marker. */
  lastScores: Record<string, { score: number; date: string }>;
  /** Previous completed session's engagement (1–5), or null on a first session. */
  lastEngagement: number | null;
}

export type StageRenderer = (
  state: GuidedState,
  copy: CopyCtx,
  ctx: RenderCtx,
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
  <div class="card-flat gd-q">
    <div class="gd-q__head">
      <span class="gd-q__logo">S</span>
      <span class="gd-q__n">(${n}/${of})</span>
      <span class="gd-q__stem">${stem}</span>
      <button type="button" class="gd-q__clock" aria-label="View history" title="View history">${ICONS.clock}</button>
    </div>
    <p class="gd-q__coach">${coach}</p>
    ${src ? `<p class="gd-q__src">${src}</p>` : ""}
  </div>`;

const notesCard = (path: string, placeholder: string, value: string): string => `
  <div class="card-flat gd-notes">
    <textarea data-notes="${esc(path)}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
  </div>`;

const cta = (label: string, action = "next"): string =>
  `<div class="gd-cta"><button type="button" class="btn" data-${action}>${esc(label)}</button></div>`;

const statusPill = (status: string): string =>
  `<span class="gd-status gd-status--${statusClass(status)}">${esc(STATUS_LABELS[status] ?? status)}</span>`;

// ---- the renderers --------------------------------------------------------------------------
const catchup: StageRenderer = (state, copy, ctx) => {
  const { title, sub } = stageCopy("catchup", copy);
  const outcomes = state.catchup?.outcomes ?? {};
  const open = ctx.trackers.promises.filter((p) => p.status === "open");
  const rows = open
    .map(
      (p) => `
      <div class="gd-prom__row">
        <span class="gd-owner gd-owner--${p.owner === "manager" ? "you" : "them"}">${p.owner === "manager" ? "You" : esc(copy.name)}</span>
        <span class="gd-prom__text">${esc(p.text)}</span>
        <div class="gd-chips" role="group" aria-label="Did it happen?">
          ${OUTCOMES.map(
            (o) =>
              `<button type="button" class="gd-chip" data-outcome="${esc(p.id)}" data-value="${o.value}"${outcomes[p.id] === o.value ? " data-selected" : ""}>${esc(o.label)}</button>`,
          ).join("")}
        </div>
      </div>`,
    )
    .join("");
  return {
    title,
    sub,
    body: `
      <div class="card-flat gd-prom">
        <div class="gd-q__head" style="margin-bottom:4px">
          <span class="gd-q__logo">S</span>
          <span class="gd-q__stem">Last month's promises: did they happen?</span>
        </div>
        ${rows || `<p class="gd-q__coach" style="margin:6px 0 0">Nothing open from last time. You're all caught up.</p>`}
      </div>
      <div class="gd-addrow"><button type="button" class="btn btn--ghost" data-open="add-promise">${ICONS.plus}<span>Add a promise</span></button></div>
      ${notesCard("catchup.notes", `Notes on ${copy.name}'s answers`, state.catchup?.notes ?? "")}
      ${cta("Continue to Requests")}`,
  };
};

const rowCard = (kind: "request" | "goal", item: TrackerItem): string => {
  const mid =
    kind === "request"
      ? item.category
        ? `<span class="gd-row__cat">${esc(CATEGORY_LABELS[item.category] ?? item.category)}</span>`
        : ""
      : `<span class="gd-row__pct">${item.progress}%</span>`;
  return `
    <button type="button" class="gd-row" data-open="${kind}" data-id="${esc(item.id)}">
      <span class="gd-row__text">${esc(item.text)}</span>
      ${mid}
      ${statusPill(item.status)}
      <span class="gd-row__chev">${ICONS.chev}</span>
    </button>`;
};

const requests: StageRenderer = (state, copy, ctx) => {
  const { title, sub } = stageCopy("requests", copy);
  const rows = ctx.trackers.requests.map((r) => rowCard("request", r)).join("");
  return {
    title,
    sub,
    body: `${rows || `<p class="gd-empty">No open requests yet. Add the first one below.</p>`}
      <div class="gd-addrow"><button type="button" class="btn btn--ghost" data-open="add-request">${ICONS.plus}<span>Add request</span></button></div>
      ${cta("Continue to Ratings")}`,
  };
};

const goals: StageRenderer = (state, copy, ctx) => {
  const { title, sub } = stageCopy("goals", copy);
  const rows = ctx.trackers.goals.map((g) => rowCard("goal", g)).join("");
  return {
    title,
    sub,
    body: `${rows || `<p class="gd-empty">No goals yet. Add one below.</p>`}
      <div class="gd-addrow"><button type="button" class="btn btn--ghost" data-open="add-goal">${ICONS.plus}<span>Add a new goal</span></button></div>
      ${cta("Continue to 1:1 Summary")}`,
  };
};

const rating: StageRenderer = (state, copy, ctx) => {
  const { title, sub } = stageCopy("rating", copy);
  const scores = state.rating?.scores ?? {};
  const blockNotes = state.rating?.blockNotes ?? {};
  const rows = RATING_BLOCKS.map((b) => {
    const val = scores[b.id] ?? 5;
    const last = ctx.lastScores[b.id]; // real prior score, or undefined on a first session
    const marker = last
      ? `<span class="gd-lastmark" style="left:${((last.score - 1) / 9) * 100}%">${last.score.toFixed(1)} · ${esc(shortDate(last.date))}</span>`
      : "";
    return `
      <div class="card-flat gd-block">
        <div class="gd-block__head">
          <span class="gd-block__icon">${ICONS[b.icon]}</span>
          <span class="gd-block__label">${esc(b.label)} ${ICONS.info}</span>
          <span class="gd-block__score" data-score-for="${b.id}">${Number(val).toFixed(1)}</span>
        </div>
        <div class="gd-slider">
          ${marker}
          <input type="range" min="1" max="10" step="0.5" value="${val}" data-block="${b.id}" aria-label="${esc(b.label)} score 1 to 10" />
          <div class="gd-slider__labels"><span>1 Struggling</span><span>5 Okay</span><span>10 Thriving</span></div>
        </div>
        <div class="gd-block__note"><input type="text" data-blocknote="${b.id}" value="${esc(blockNotes[b.id] ?? "")}" placeholder="Add a note about this rating…" /></div>
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
      <div class="card-flat gd-q gd-q--done">
        <div class="gd-q__head">
          <span class="gd-q__logo">${ICONS.check}</span>
          <span class="gd-q__stem">${esc(f.stem(copy))}</span>
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
          ? cta("Continue to Goals")
          : `<div class="gd-cta"><button type="button" class="btn" data-fbnext>Next question</button></div>`
      }`,
  };
};

const summary: StageRenderer = (state, copy) => {
  const { title, sub } = stageCopy("summary", copy);
  const draft = state.summary?.draft;
  const error = state.summary?.error;
  let card: string;
  let note = "";
  if (error) {
    card = `<div class="card-flat gd-sum"><p>Sero couldn't draft this one. Write it yourself below, or tap Regenerate.</p></div>`;
  } else if (draft && (draft.headline || draft.bullets.length)) {
    note = `<p class="gd-ainote"><span class="gd-q__logo">S</span> Drafted by Sero from this session + your last check-in. Edit freely.</p>`;
    card = `<div class="card-flat gd-sum">${draft.headline ? `<h3>${esc(draft.headline)}</h3>` : ""}${draft.bullets.length ? `<ul>${draft.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>`;
  } else {
    card = `<div class="card-flat gd-sum"><p>Drafting your summary…</p></div>`;
  }
  return {
    title,
    sub,
    body: `
      ${note}
      ${card}
      ${notesCard("summary.edited", "Edit the summary. Your text is what's saved…", state.summary?.edited ?? "")}
      <div class="gd-cta">
        <button type="button" class="btn btn--ghost" data-regen>Regenerate</button>
        <button type="button" class="btn" data-next>Continue to Review</button>
      </div>`,
  };
};

const wrapup: StageRenderer = (state, copy, ctx) => {
  const { title, sub } = stageCopy("wrapup", copy);
  const engagement = state.wrapup?.engagement ?? null;
  const eng = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<button type="button" data-eng="${n}"${engagement === n ? " data-selected" : ""}>${n}</button>`,
    )
    .join("");
  const lastEng =
    ctx.lastEngagement != null
      ? `<p class="gd-q__src" style="margin:0 0 6px">Last time: ${ctx.lastEngagement}/5</p>`
      : "";
  const sug = state.wrapup?.suggestions;
  const sugRows = sug
    ? (
        [
          ["For them", sug.individual],
          ["Team", sug.team],
          ["Company", sug.company],
        ] as [string, string[]][]
      )
        .flatMap(([tag, items]) =>
          (items ?? []).map(
            (it) => `<div class="gd-sugg__row"><span class="gd-sugg__tag">${esc(tag)}</span><span>${esc(it)}</span></div>`,
          ),
        )
        .join("")
    : "";
  return {
    title,
    sub,
    body: `
      <div class="gd-private">${ICONS.lock}<span>Private, just for you. ${esc(copy.name)} never sees this stage.</span></div>
      <p class="gd-eng__ask">How engaged did they seem?</p>
      ${lastEng}
      <div class="gd-eng" role="group" aria-label="Engagement 1 to 5">${eng}</div>
      ${notesCard("wrapup.privateNotes", "Your private notes. Anything you don't want to forget…", state.wrapup?.privateNotes ?? "")}
      <div class="card-flat gd-sugg">
        <div class="gd-q__head" style="margin-bottom:6px">
          <span class="gd-q__logo">S</span>
          <span class="gd-q__stem">Sero's suggestions (private)</span>
        </div>
        ${sugRows || `<p class="gd-q__coach" style="margin-left:0">Private suggestions appear here once you reach the Summary stage (Sero drafts them together).</p>`}
      </div>
      <div class="gd-cta"><button type="button" class="btn" data-finish>${ICONS.check}<span>Complete 1:1</span></button></div>
      <div class="gd-finish-note" data-finish-note hidden>Saved. Next month, everything here comes back. Promises, requests, goals, and the trend lines.</div>`,
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
