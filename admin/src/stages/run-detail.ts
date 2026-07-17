// Run detail — a member re-reads ONE of their own past 1:1s, read-only.
// Wired to /api/v1/runs/mine/:id, fenced server-side by company AND user (a run you don't
// own → 404). Three tabs so a manager sees what happened, when, and with whom:
//   Overview — who + when + the one-line read + how useful was it (rating)
//   Briefing — the field set the manager saw at the end of the meeting
//   Answers  — the raw questions and how they were answered (the material behind the briefing)

import { STAGES, store } from "../state.js";
import { getMyRun, rateMyRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { createStarRating } from "../ui/star-rating.js";
import { renderReadonlyBriefing, type Briefing } from "../ui/briefing-view.ts";
import { formatDate, relTime } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { Check, Calendar, Clock, MessageSquare } from "lucide";
import type { Mount, Unmount } from "./stage.types.ts";

export type Turn = { alias: string | null; name: string | null; answer: string | null; skipped: boolean };
export type RunDetail = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  briefing: Briefing | null;
  turns?: Turn[];
  lastSeenAt: number;
  completedAt: number | null;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
};

// First letter of the name (falls back to "?") — the glyph in the avatar circle.
function initialOf(name: string): string {
  const s = (name || "").trim();
  return s ? s[0]!.toUpperCase() : "?";
}

// "Role, Seniority" — the dim line under the name (mirrors the old subtitle logic).
function roleLine(ctx: RunDetail["ctx"]): string {
  if (!ctx.role) return ctx.seniority || "";
  return ctx.seniority ? `${ctx.role} · ${ctx.seniority}` : ctx.role;
}

// The profile header + the "when it happened" row — the top of the Overview tab.
function renderProfile(run: RunDetail): string {
  const { ctx } = run;
  const when = run.completedAt || run.lastSeenAt || 0;
  const answered = (run.turns || []).filter((t) => !t.skipped).length;
  const whenBits: string[] = [];
  if (when) {
    whenBits.push(`<span>${icon(Calendar, { size: 15 })} ${escapeHtml(formatDate(when))}</span>`);
    whenBits.push(`<span>${icon(Clock, { size: 15 })} ${escapeHtml(relTime(when))}</span>`);
  }
  whenBits.push(`<span>${icon(MessageSquare, { size: 15 })} ${answered} question${answered === 1 ? "" : "s"} answered</span>`);

  return `
    <div class="rd-profile">
      <div class="ds-avatar rd-avatar" aria-hidden="true">${escapeHtml(initialOf(ctx.name))}</div>
      <div class="rd-profile__id">
        <div class="rd-name">${escapeHtml(ctx.name || "This 1:1")}</div>
        ${roleLine(ctx) ? `<div class="text-ink-dim text-sm">${escapeHtml(roleLine(ctx))}</div>` : ""}
      </div>
      ${ctx.meetingType ? `<span class="rd-type-badge">${escapeHtml(ctx.meetingType)}</span>` : ""}
    </div>
    <div class="rd-when">${whenBits.join("")}</div>`;
}

// The "how useful was this?" star rating. A radiogroup of five star buttons —
// keyboard-operable, labelled — pre-filled from the run's saved rating. A low score
// (<=2) reveals the optional "what missed?" note, saved via an explicit Save button.
function renderRating(run: RunDetail): string {
  const stars = run.rating?.stars ?? 0;
  const note = run.rating?.note ?? "";
  return `<section class="card-flat space-y-3 js-rating">
      <div class="eyebrow">Did this help you run the 1:1?</div>
      <div class="js-stars-mount"></div>
      <div class="star-rating__note l-stack l-stack--2" ${stars && stars <= 2 ? "" : "hidden"}>
        <label class="text-sm text-ink-dim" for="rating-note">What did it miss? (optional)</label>
        <textarea id="rating-note" class="input" rows="2">${escapeHtml(note)}</textarea>
        <div><button type="button" class="btn btn--sm js-note-save">Save note</button></div>
      </div>
      <div class="text-sm text-ink-mute js-rating-status" role="status" aria-live="polite"></div>
    </section>`;
}

// Overview tab — who + when, the briefing's one-line read (if any), then the rating.
function renderOverview(run: RunDetail): string {
  const lead = run.briefing?.headline
    ? `<section class="card-flat space-y-2"><div class="eyebrow">In a line</div><p class="rd-digest">${escapeHtml(run.briefing.headline)}</p></section>`
    : "";
  return `<div class="l-stack l-stack--4">${renderProfile(run)}${lead}${renderRating(run)}</div>`;
}

// Answers tab — the questions asked and how they were answered. Skipped turns are dimmed.
function renderAnswers(run: RunDetail): string {
  const turns = run.turns || [];
  if (!turns.length) {
    return `<section class="card-flat"><p class="text-sm text-ink-dim">No answers were captured in this session.</p></section>`;
  }
  const rows = turns
    .map((t) => {
      const q = escapeHtml(t.name || "Question");
      const body = t.skipped
        ? `<p class="rd-turn__a text-ink-mute"><em>Skipped</em></p>`
        : `<p class="rd-turn__a">${escapeHtml(t.answer || "")}</p>`;
      return `<div class="rd-turn${t.skipped ? " rd-turn--skipped" : ""}"><div class="rd-turn__q">${q}</div>${body}</div>`;
    })
    .join("");
  return `<section class="card-flat space-y-3">
      <p class="text-sm text-ink-dim">The questions you were asked and how you answered them.</p>
      <div>${rows}</div>
    </section>`;
}

// The whole detail body: the three tabs + their panes. Pure (string in, string out)
// so it can be unit-tested without a DOM or the network.
export function renderRunDetail(run: RunDetail): string {
  return `
    <div class="ds-tabs" role="tablist">
      <button type="button" class="ds-tab is-active" role="tab" aria-selected="true" data-tab="overview">Overview</button>
      <button type="button" class="ds-tab" role="tab" aria-selected="false" data-tab="briefing">Recap</button>
      <button type="button" class="ds-tab" role="tab" aria-selected="false" data-tab="answers">Answers</button>
    </div>
    <div class="js-pane" data-pane="overview">${renderOverview(run)}</div>
    <div class="js-pane" data-pane="briefing" hidden><div class="l-stack l-stack--4">${renderReadonlyBriefing(run.briefing, run.ctx?.name)}</div></div>
    <div class="js-pane" data-pane="answers" hidden>${renderAnswers(run)}</div>`;
}

function wireRating(root: HTMLElement, run: RunDetail): void {
  const mount = root.querySelector<HTMLElement>(".js-stars-mount");
  if (!mount) return;
  const noteWrap = root.querySelector<HTMLElement>(".star-rating__note");
  const noteEl = root.querySelector<HTMLTextAreaElement>("#rating-note");
  const status = root.querySelector<HTMLElement>(".js-rating-status");
  let stars = run.rating?.stars ?? 0;

  const save = async () => {
    if (!stars) return;
    try {
      await rateMyRun(run.id, { stars, note: noteEl?.value ?? "" });
      if (status) status.innerHTML = "Saved " + icon(Check, { size: 16 });
    } catch {
      if (status) status.textContent = "Couldn't save — please try again.";
    }
  };
  const rating = createStarRating({
    initialStars: stars,
    onChange: (s: number) => {
      stars = s;
      if (noteWrap) noteWrap.hidden = !(s && s <= 2);
      void save();
    },
  });
  mount.appendChild(rating.el);

  noteEl?.addEventListener("input", () => {
    if (status) status.textContent = "Press Save to keep your note.";
  });
  root.querySelector<HTMLButtonElement>(".js-note-save")?.addEventListener("click", () => void save());
}

// Click a tab → show its pane, mark it active. Same idiom as notes-panel.js switchTab.
function wireTabs(root: HTMLElement): void {
  const tabsEl = root.querySelector<HTMLElement>(".ds-tabs");
  if (!tabsEl) return;
  const panes = Array.from(root.querySelectorAll<HTMLElement>(".js-pane"));
  tabsEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".ds-tab");
    if (!btn) return;
    const tab = btn.dataset.tab;
    panes.forEach((p) => {
      p.hidden = p.dataset.pane !== tab;
    });
    tabsEl.querySelectorAll<HTMLElement>(".ds-tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  });
}

export const mount: Mount = async (root, { setState }) => {
  const toRuns = () => setState({ myRunId: null, stage: STAGES.RUNS });

  const shell = (inner: string) => `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Past 1:1</h1>
          <button type="button" class="btn btn--ghost js-back">Back to Runs</button>
        </div>
        <div class="text-ink-dim js-sub"></div>
      </header>
      <div class="l-stack l-stack--4 js-host">${inner}</div>
    </div>`;

  const notice = (eyebrow: string, msg: string) =>
    `<section class="card-flat space-y-3"><div class="eyebrow">${eyebrow}</div><p class="text-ink-dim">${msg}</p><button type="button" class="btn js-back2">Back to Runs</button></section>`;

  const wireBack = () => {
    root.querySelector(".js-back")?.addEventListener("click", toRuns);
    root.querySelector(".js-back2")?.addEventListener("click", toRuns);
  };

  const id = store.myRunId;
  root.innerHTML = shell(`<p class="text-sm text-ink-dim">Loading your 1:1…</p>`);
  wireBack();

  if (!id) {
    root.querySelector(".js-host")!.innerHTML = notice("No 1:1 selected", "Pick one from your Runs list.");
    wireBack();
    return;
  }

  let run: RunDetail;
  try {
    run = (await getMyRun(id)) as RunDetail;
  } catch {
    root.querySelector(".js-host")!.innerHTML = notice(
      "Couldn't open this 1:1",
      "It may not be one of yours, or something went wrong. Try again from your Runs list.",
    );
    wireBack();
    return;
  }

  const sub = root.querySelector<HTMLElement>(".js-sub");
  if (sub) sub.textContent = [run.ctx.name, run.ctx.meetingType].filter(Boolean).join(" · ");

  root.querySelector(".js-host")!.innerHTML = renderRunDetail(run);

  wireTabs(root);
  wireRating(root, run);
};

export const unmount: Unmount = () => {};
