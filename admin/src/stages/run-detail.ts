// Run detail — a member re-reads ONE of their own past 1:1s, read-only (pre-go-live PG2).
// Wired to /api/v1/runs/mine/:id, fenced server-side by company AND user (a run you don't
// own → 404). Shows the briefing the manager saw at the end of the meeting — no admin QA
// tools, no rating yet (PG3). "What to do next" + "Reminders" are the carry-forward the
// next 1:1 builds on (surfaced as their own blocks; PG5's "Since last time" reuses them).

import { STAGES, store } from "../state.js";
import { getMyRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import type { Mount, Unmount } from "./stage.types.ts";

type NextAction = { when?: string; action?: string };
type Briefing = {
  summary_bullets?: string[];
  understanding_paragraph?: string;
  brutal_truth_employee?: string;
  brutal_truth_manager?: string;
  next_actions?: NextAction[];
  watch_for?: string[];
};
type RunDetail = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  briefing: Briefing | null;
  lastSeenAt: number;
  completedAt: number | null;
};

function card(label: string, inner: string): string {
  return `<section class="card-flat space-y-2"><div class="eyebrow">${escapeHtml(label)}</div>${inner}</section>`;
}
function bullets(items: string[]): string {
  return `<ul class="l-stack l-stack--2">${items.map((x) => `<li class="text-sm">${escapeHtml(x)}</li>`).join("")}</ul>`;
}

// The same field set the manager saw (mirrors review-run.js renderBriefing), briefing-only.
function renderBriefing(b: Briefing | null): string {
  const none = `<section class="card-flat"><p class="text-sm text-ink-dim">No briefing was recorded for this 1:1.</p></section>`;
  if (!b) return none;
  const out: string[] = [];
  if ((b.summary_bullets || []).length) out.push(card("What stood out", bullets(b.summary_bullets!)));
  if (b.understanding_paragraph) out.push(card("What we understood", `<p class="text-sm">${escapeHtml(b.understanding_paragraph)}</p>`));
  if (b.brutal_truth_employee) out.push(card("Honest read — them", `<p class="text-sm">${escapeHtml(b.brutal_truth_employee)}</p>`));
  if (b.brutal_truth_manager) out.push(card("Honest read — you", `<p class="text-sm">${escapeHtml(b.brutal_truth_manager)}</p>`));
  if ((b.next_actions || []).length) {
    const items = b.next_actions!.map((a) => `<li class="text-sm">${a.when ? escapeHtml(a.when) + ": " : ""}${escapeHtml(a.action || "")}</li>`);
    out.push(card("What to do next", `<ul class="l-stack l-stack--2">${items.join("")}</ul>`));
  }
  if ((b.watch_for || []).length) out.push(card("Reminders", bullets(b.watch_for!)));
  return out.join("") || none;
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
  root.querySelector(".js-host")!.innerHTML = renderBriefing(run.briefing);
};

export const unmount: Unmount = () => {};
