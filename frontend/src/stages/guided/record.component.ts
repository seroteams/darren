// The finished-1:1 record (monthly-checkin Phase 6). /guided/:id renders the runner while in
// progress and THIS record once completed_at is set. One page, stacked (plan decision 17):
// Summary → six-block scores + trend vs previous → trackers as they ended → feedback → the
// PRIVATE review last, badged. Read-only display; no autosave, no nav. Rides the standard
// shell: stage-inner column, page-header + h1, card-flat cards (P5 F10).

import type { BlockScore, GroupedTrackers, GuidedSessionDto, TrackerItem } from "./guided.types.ts";
import type { CopyCtx } from "./coaching-copy.ts";
import { RATING_BLOCKS, STATUS_LABELS, statusClass } from "./coaching-copy.ts";
import { esc, shortDate } from "./guided-util.ts";
import { ICONS } from "./guided-icons.ts";

export interface RecordCtx {
  dto: GuidedSessionDto;
  trackers: GroupedTrackers;
  blockScores: BlockScore[];
  copy: CopyCtx;
}

const statusPill = (s: string): string =>
  `<span class="gd-status gd-status--${statusClass(s)}">${esc(STATUS_LABELS[s] ?? s)}</span>`;

function scoresSection(ctx: RecordCtx): string {
  const mine = new Map(ctx.blockScores.filter((b) => b.guidedSessionId === ctx.dto.id).map((b) => [b.block, b.score]));
  const prior = new Map<string, number>();
  for (const b of ctx.blockScores) if (b.guidedSessionId !== ctx.dto.id) prior.set(b.block, b.score); // oldest-first → most recent prior wins
  const rows = RATING_BLOCKS.filter((blk) => mine.has(blk.id))
    .map((blk) => {
      const now = mine.get(blk.id)!;
      const was = prior.get(blk.id);
      const delta =
        was == null
          ? ""
          : now === was
            ? ` <span class="gd-rec__delta">· no change</span>`
            : ` <span class="gd-rec__delta gd-rec__delta--${now > was ? "up" : "down"}">· ${now > was ? "▲" : "▼"} was ${was.toFixed(1)}</span>`;
      return `<div class="gd-rec__scorerow"><span>${ICONS[blk.icon]} ${esc(blk.label)}</span><span><strong>${now.toFixed(1)}</strong>${delta}</span></div>`;
    })
    .join("");
  return rows ? `<section class="card-flat gd-rec__block"><h3>Building blocks</h3>${rows}</section>` : "";
}

function trackerList(title: string, items: TrackerItem[], render: (t: TrackerItem) => string): string {
  if (!items.length) return "";
  return `<section class="card-flat gd-rec__block"><h3>${esc(title)}</h3>${items.map((t) => `<div class="gd-rec__item">${render(t)}</div>`).join("")}</section>`;
}

// `topNav` — the breadcrumb trail (Team › {name} › Monthly Check-in), passed in by the host
// so the finished record isn't a nav dead-end. The host wires its clicks (this stays pure).
export function renderRecord(ctx: RecordCtx, topNav = ""): string {
  const { dto, trackers, copy } = ctx;
  const state = dto.state;
  const when = dto.completedAt ? shortDate(dto.completedAt) : "";

  // Summary — the manager's edited text wins; else the AI draft; else nothing.
  const edited = typeof state.summary?.edited === "string" ? state.summary.edited.trim() : "";
  const draft = state.summary?.draft;
  let summaryBody = "";
  if (edited) summaryBody = `<p>${esc(edited).replace(/\n/g, "<br>")}</p>`;
  else if (draft && (draft.headline || draft.bullets.length))
    summaryBody = `${draft.headline ? `<p><strong>${esc(draft.headline)}</strong></p>` : ""}${draft.bullets.length ? `<ul>${draft.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}`;
  else summaryBody = `<p class="text-ink-dim">No summary was written.</p>`;

  // Feedback
  const fb = state.feedback ?? {};
  const fbItems = (
    [
      ["Less of", fb.lessOf],
      ["More of", fb.moreOf],
      ["Learn", fb.learn],
    ] as [string, string | undefined][]
  )
    .filter(([, v]) => v && v.trim())
    .map(([tag, v]) => `<div class="gd-rec__item"><span class="gd-sugg__tag">${esc(tag)}</span> ${esc(v!)}</div>`)
    .join("");

  // Private review (last, badged)
  const eng = state.wrapup?.engagement ?? null;
  const priv = typeof state.wrapup?.privateNotes === "string" ? state.wrapup.privateNotes.trim() : "";
  const sug = state.wrapup?.suggestions;
  const sugRows = sug
    ? (
        [
          ["For them", sug.individual],
          ["Team", sug.team],
          ["Company", sug.company],
        ] as [string, string[]][]
      )
        .flatMap(([tag, items]) => (items ?? []).map((it) => `<div class="gd-rec__item"><span class="gd-sugg__tag">${esc(tag)}</span> ${esc(it)}</div>`))
        .join("")
    : "";

  return `
    <div class="stage-inner l-stack l-stack--6 gd gd-rec">
      ${topNav}
      <div class="gd-done-banner">${ICONS.check}<span>Completed${when ? ` · ${esc(when)}` : ""}</span></div>
      <header class="page-header">
        <h1 class="h1">Monthly Check-in with ${esc(copy.full || copy.name)}</h1>
      </header>

      <section class="card-flat gd-rec__block"><h3>Summary</h3>${summaryBody}</section>
      ${scoresSection(ctx)}
      ${trackerList("Promises", trackers.promises, (p) => `<span>${esc(p.text)}</span> ${statusPill(p.status)}`)}
      ${trackerList("Requests", trackers.requests, (r) => `<span>${esc(r.text)}</span> ${statusPill(r.status)}`)}
      ${trackerList("Goals", trackers.goals, (g) => `<span>${esc(g.text)}</span> <span class="gd-row__pct">${g.progress}%</span> ${statusPill(g.status)}`)}
      ${fbItems ? `<section class="card-flat gd-rec__block"><h3>Feedback</h3>${fbItems}</section>` : ""}

      <section class="card-flat gd-rec__block gd-rec__private">
        <div class="gd-private" style="margin:0 0 12px">${ICONS.lock}<span>Private. Never shared with ${esc(copy.name)}.</span></div>
        <h3>Your private review</h3>
        ${eng != null ? `<div class="gd-rec__item">Engagement: <strong>${eng}/5</strong></div>` : ""}
        ${priv ? `<div class="gd-rec__item">${esc(priv).replace(/\n/g, "<br>")}</div>` : ""}
        ${sugRows || (eng == null && !priv ? `<div class="gd-rec__item text-ink-dim">Nothing recorded.</div>` : "")}
      </section>
    </div>`;
}
