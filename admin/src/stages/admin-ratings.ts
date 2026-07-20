// Briefing ratings — the Pulse "Briefing rating" drill-down (pulse-drilldowns): every
// rated run on the site, newest first, with the manager's stars and note. Internal and
// guest runs stay in (labelled) because the Pulse card's average counts them too —
// filtering them out here would make the page disagree with the card. Same
// GET /api/v1/admin/runs payload as the Runs page, filtered to rated. Superadmin-only.

import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { getAdminRuns } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { prettyType, dateLabel, backToPulse } from "../ui/pulse-labels.ts";
import { createSkeleton } from "../ui/skeleton.js";
import { whoCell, starsCell, type AdminRun } from "./admin-runs.ts";
import type { Mount, Unmount } from "./stage.types.ts";

function ratingRow(r: AdminRun): string {
  const note = r.rating?.note ? escapeHtml(r.rating.note) : `<span class="text-ink-dim">—</span>`;
  return `
    <tr>
      <td>${whoCell(r)}</td>
      <td>${r.meetingType ? escapeHtml(prettyType(r.meetingType)) : "—"}</td>
      <td>${escapeHtml(dateLabel(r.startedAt ?? r.lastSeenAt))}</td>
      <td>${starsCell(r)}</td>
      <td class="pd-note">${note}</td>
    </tr>`;
}

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) => `
    <div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${backToPulse()}
        <h1 class="h1">Recap ratings</h1>
        <div class="text-ink-dim">Every rated recap, newest first — the stars and notes behind the Pulse average. Internal and guest runs are tagged.</div>
      </header>
      ${inner}
      <div class="pd-back-bottom">${backToPulse()}</div>
    </div>`;
  const wireBack = () => root.querySelectorAll(".js-back-pulse").forEach((b) =>
    b.addEventListener("click", () => setState({ stage: STAGES.ADMIN_PULSE })));

  const load = async () => {
    root.replaceChildren(createSkeleton(4));
    let rated: AdminRun[] = [];
    try {
      const res = await getAdminRuns();
      const runs = Array.isArray(res?.runs) ? (res.runs as AdminRun[]) : [];
      // Rated FINISHED runs only — the Pulse card's average is folded over finished
      // briefings, so an unfinished run someone rated mid-flow (dev/QA noise) would
      // make this page disagree with the card.
      rated = runs.filter((r) => r.rating != null && r.finished);
    } catch {
      root.innerHTML = shell(`
        <section class="card-flat l-stack l-stack--2">
          <div class="eyebrow">Couldn't load</div>
          <p class="text-ink-dim">Something went wrong loading the ratings. Please try again.</p>
          <button type="button" class="btn btn--ghost js-retry">Try again</button>
        </section>`);
      wireBack();
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    if (rated.length === 0) {
      root.innerHTML = shell(`<section class="card-flat"><p class="text-ink-dim">No rated recaps yet — when a manager rates one with the stars, it lands here.</p></section>`);
      wireBack();
      return;
    }
    // Same fold as the Pulse card: plain average over every rated run, low = ≤2 stars.
    const avg = Math.round((rated.reduce((sum, r) => sum + (r.rating?.stars ?? 0), 0) / rated.length) * 10) / 10;
    const low = rated.filter((r) => (r.rating?.stars ?? 0) <= 2).length;
    const count = `<p class="pd-count"><b>${avg.toFixed(1)}</b> average over <b>${rated.length}</b> rated ${rated.length === 1 ? "run" : "runs"}${low ? ` · ${low} low (≤2)` : ""} — the same numbers as the Pulse card.</p>`;
    root.innerHTML = shell(`
      <section class="l-stack l-stack--3">
        ${count}
        <div class="um-table-wrap">
          <table class="um-table">
            <thead><tr><th>Who</th><th>Type</th><th>Date</th><th>Stars</th><th>Note</th></tr></thead>
            <tbody>${rated.map(ratingRow).join("")}</tbody>
          </table>
        </div>
      </section>`);
    wireBack();
  };

  await load();
};

export const unmount: Unmount = () => {};
