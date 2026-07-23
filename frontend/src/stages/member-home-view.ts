// Member Home pure renders (design-consolidation Phase 2, audit A5). DOM-free and
// CSS-free so member-home-view.test.ts can assert on the markup under node --test;
// member-home.js owns the mount, the CSS imports, the data loading and the wiring
// (the team.ts / team-card.ts split).
//
// System pieces only: cards are .card-flat, inputs the compact boxed recipe
// (.apm-field__input), the ONE solid accent is "Add request" (.btn), goal Save is a
// ghost, request statuses are the standard .chip recipe, and goal progress is a small
// bar in the axis visual language (track + fill, tokens) with the number beside it.
// Nothing here ever includes the manager's notes, briefing or ratings: list-only by
// the no-inference ruling.

import { escapeHtml as esc } from "../../../admin/src/ui/html.js";
import { formatDate } from "../../../admin/src/ui/time.ts";
import { icon } from "../../../admin/src/ui/icon.js";
import { CalendarClock, Target } from "lucide";

export type MemberRun = {
  meetingType?: string | null;
  completedAt?: number | null;
  lastSeenAt?: number | null;
  managerName?: string | null;
};
export type MemberRequest = { id?: string; text: string; status: string };
export type MemberGoal = { id: string; text: string; progress?: number | null };

const CAPTION = `<p class="caption">Only the date and 1:1 type are recorded here.</p>`;

// The designed empty-state block: a quiet Lucide icon, a one-line headline, and the
// reassurance copy. Used for the first-visit timeline and goals (audit: grey-sentence
// empty states on the member's true first impression).
function emptyBlock(glyph: unknown, headline: string, copy: string): string {
  return `<div class="member-empty">
      <div class="member-empty__icon">${icon(glyph, { size: 28 })}</div>
      <p class="member-empty__head">${esc(headline)}</p>
      <p class="member-empty__copy">${esc(copy)}</p>
    </div>`;
}

const when = (r: MemberRun): string => {
  const t = r.completedAt || r.lastSeenAt;
  return t ? esc(formatDate(t)) : "";
};

function timelineEntry(r: MemberRun): string {
  const meta = r.managerName ? `<span class="member-runs__meta">with ${esc(r.managerName)}</span>` : "";
  return `<li class="member-runs__entry">
      <div class="member-runs__head">
        <span class="member-runs__type">${esc(r.meetingType || "1:1")}</span>
        <time class="member-runs__when">${when(r)}</time>
      </div>
      ${meta}
    </li>`;
}

// The 1:1s-about-you region: a top card for the most recent 1:1 (type, date, manager),
// the earlier ones as the timeline, and the privacy transparency caption underneath.
// First visit (no runs) gets the designed empty state instead.
export function renderRunsSection(runs: MemberRun[]): string {
  const latest = runs[0];
  if (!latest) {
    return `<section class="card-flat">${emptyBlock(
      CalendarClock,
      "No 1:1s yet",
      "When your manager preps a 1:1 with you, it shows up here, with the date and 1:1 type, so you always know where things stand.",
    )}</section>`;
  }
  const earlier = runs.slice(1);
  const managerBit = latest.managerName ? ` · with ${esc(latest.managerName)}` : "";
  const latestCard = `<section class="card-flat l-stack l-stack--1">
      <div class="eyebrow eyebrow--slot">Your latest 1:1</div>
      <div class="h3">${esc(latest.meetingType || "1:1")}</div>
      <div class="text-sm text-ink-dim">${when(latest)}${managerBit}</div>
    </section>`;
  const timeline = earlier.length
    ? `<section class="member-runs l-stack l-stack--3">
        <h2 class="h3">Earlier 1:1s</h2>
        <ol class="member-runs__timeline">${earlier.map(timelineEntry).join("")}</ol>
      </section>`
    : "";
  return `${latestCard}${timeline}${CAPTION}`;
}

// Request status → the standard chip recipe (base.css): tint triad + leading status dot.
const REQ_CHIP: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "chip--accent" },
  in_progress: { label: "In progress", cls: "chip--gold" },
  resolved: { label: "Resolved", cls: "chip--mint" },
};

export function requestChip(status: string): string {
  const c = REQ_CHIP[status];
  if (!c) return `<span class="chip chip--plain">${esc(status)}</span>`;
  return `<span class="chip ${c.cls} chip--dot">${c.label}</span>`;
}

export function renderRequestsCard(requests: MemberRequest[]): string {
  const rows = requests.length
    ? `<ul class="member-req__list">${requests
        .map((r) => `<li class="member-req__row"><span class="member-req__text">${esc(r.text)}</span>${requestChip(r.status)}</li>`)
        .join("")}</ul>`
    : `<p class="text-sm text-ink-dim">No requests yet.</p>`;
  return `<section class="card-flat l-stack l-stack--4">
      <h2 class="h3">Requests</h2>
      ${rows}
      <form class="js-add-req l-stack l-stack--2">
        <input class="js-req-text apm-field__input" type="text" placeholder="What would help? Add a request…" aria-label="Your request" />
        <div class="l-row l-row--2 l-row--wrap">
          <select class="js-req-cat apm-field__input member-req__cat" aria-label="Category"><option value="growth_development">Growth &amp; development</option><option value="ideas_suggestions">Ideas &amp; suggestions</option><option value="concerns_feedback">Concerns &amp; feedback</option></select>
          <button type="submit" class="btn">Add request</button>
        </div>
      </form>
    </section>`;
}

const clampPct = (n: unknown): number => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));

export function renderGoalsCard(goals: MemberGoal[]): string {
  const body = goals.length
    ? goals
        .map((g) => {
          const pct = clampPct(g.progress);
          return `<div class="member-goal js-goal" data-id="${esc(g.id)}">
              <div class="member-goal__text">${esc(g.text)}</div>
              <div class="member-goal__meter">
                <div class="member-goal__bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progress"><div class="member-goal__fill" style="width: ${pct}%"></div></div>
                <span class="member-goal__pct num-tabular">${pct}%</span>
              </div>
              <div class="member-goal__edit">
                <input class="js-goal-pct apm-field__input member-goal__pct-input" type="number" min="0" max="100" value="${pct}" aria-label="Progress percent" />
                <input class="js-goal-note apm-field__input member-goal__note" type="text" placeholder="Add an update…" aria-label="Progress update" />
                <button type="button" class="btn btn--ghost js-goal-save">Save</button>
              </div>
            </div>`;
        })
        .join("")
    : emptyBlock(Target, "No goals yet", "Your manager sets these with you in your 1:1.");
  return `<section class="card-flat l-stack l-stack--4">
      <h2 class="h3">Goals</h2>
      ${body}
    </section>`;
}
