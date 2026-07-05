// Run detail — a member re-reads ONE of their own past 1:1s, read-only (pre-go-live PG2).
// Wired to /api/v1/runs/mine/:id, fenced server-side by company AND user (a run you don't
// own → 404). Shows the briefing the manager saw at the end of the meeting — no admin QA
// tools, no rating yet (PG3). "What to do next" + "Reminders" are the carry-forward the
// next 1:1 builds on (surfaced as their own blocks; PG5's "Since last time" reuses them).

import { STAGES, store } from "../state.js";
import { getMyRun, rateMyRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { createStarRating } from "../ui/star-rating.js";
import { renderReadonlyBriefing, type Briefing } from "../ui/briefing-view.ts";
import { icon } from "../ui/icon.js";
import { Check } from "lucide";
import type { Mount, Unmount } from "./stage.types.ts";

type RunDetail = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  briefing: Briefing | null;
  lastSeenAt: number;
  completedAt: number | null;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
};

// The "how useful was this?" star rating (PG3). A radiogroup of five star buttons —
// keyboard-operable, labelled — pre-filled from the run's saved rating. A low score
// (<=2) reveals the optional "what missed?" note, saved via an explicit Save button.
function renderRating(run: RunDetail): string {
  const stars = run.rating?.stars ?? 0;
  const note = run.rating?.note ?? "";
  return `<section class="card-flat space-y-3 js-rating">
      <div class="eyebrow">Did this help you run the 1:1?</div>
      <div class="js-stars-mount"></div>
      <div class="star-rating__note l-stack l-stack--2" ${stars && stars <= 2 ? "" : "hidden"}>
        <label class="text-sm text-ink-dim" for="rating-note">What missed? (optional)</label>
        <textarea id="rating-note" class="input" rows="2">${escapeHtml(note)}</textarea>
        <div><button type="button" class="btn btn--sm js-note-save">Save note</button></div>
      </div>
      <div class="text-sm text-ink-mute js-rating-status" role="status" aria-live="polite"></div>
    </section>`;
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

// Plain "who · role, seniority · meeting" for the subtitle (raw — set via textContent).
function subtitle(ctx: RunDetail["ctx"]): string {
  const bits: string[] = [];
  if (ctx.name) bits.push(ctx.name);
  if (ctx.role) bits.push(ctx.seniority ? `${ctx.role}, ${ctx.seniority}` : ctx.role);
  if (ctx.meetingType) bits.push(ctx.meetingType);
  return bits.join(" · ");
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
        <div class="text-ink-dim text-sm js-sub"></div>
      </header>
      <div class="l-stack l-stack--4 js-host">${inner}</div>
    </div>`;

  const notice = (eyebrow: string, msg: string) =>
    `<section class="card-flat space-y-3"><div class="eyebrow">${eyebrow}</div><p class="text-sm text-ink-dim">${msg}</p><button type="button" class="btn js-back2">Back to Runs</button></section>`;

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
  if (sub) sub.textContent = subtitle(run.ctx);
  root.querySelector(".js-host")!.innerHTML = renderRating(run) + renderReadonlyBriefing(run.briefing);
  wireRating(root, run);
};

export const unmount: Unmount = () => {};
