// Briefing ratings — the Pulse "Recap rating" drill-down (pulse-drilldowns;
// design-consolidation P6, D8): every rated finished run on the site, newest first,
// with the manager's stars and note. Internal and guest runs stay in (labelled) so the
// full rating picture is here, not a filtered one. A small star histogram sits above
// the table; the shared list toolbar gives search + a score filter; a row opens the
// run's read-only briefing (the PG8 superadmin recap, same as the Runs page). Same
// GET /api/v1/admin/runs payload as the Runs page, filtered to rated. Superadmin-only.

import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { getAdminRuns } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { prettyType, dateLabel, pulseCrumbs } from "../ui/pulse-labels.ts";
import { createSkeleton } from "../ui/skeleton.js";
import { listToolbar } from "../ui/list-toolbar.ts";
import { whoCell, starsCell, runSearchKey, openRunBriefing, wireListFilter, type AdminRun } from "./admin-runs.ts";
import type { Mount, Unmount } from "./stage.types.ts";

// The score filter's buckets: exact stars for 5/4/3, one "low" bucket for ≤2 (the
// Pulse card's own "low" line), so the chips stay few and readable.
const scoreKey = (stars: number): string => (stars <= 2 ? "low" : String(stars));

function ratingRow(r: AdminRun): string {
  const note = r.rating?.note ? escapeHtml(r.rating.note) : `<span class="text-ink-dim">–</span>`;
  const search = `${runSearchKey(r)} ${(r.rating?.note ?? "").toLowerCase()}`;
  // Every row here is a rated FINISHED run, so every row opens its briefing.
  return `
    <tr class="js-row um-row js-open-run" data-id="${escapeHtml(r.id)}" data-kind="${scoreKey(r.rating?.stars ?? 0)}" data-search="${escapeHtml(search)}">
      <td>${whoCell(r)}</td>
      <td>${r.meetingType ? escapeHtml(prettyType(r.meetingType)) : "–"}</td>
      <td>${escapeHtml(dateLabel(r.startedAt ?? r.lastSeenAt))}</td>
      <td>${starsCell(r)}</td>
      <td class="pd-note">${note}</td>
    </tr>`;
}

// The star histogram (D8): five pure-CSS bars, 5★ down to 1★, widths relative to the
// most common score. Design tokens only; text stays ≥14px.
function histogram(rated: AdminRun[]): string {
  const counts = [5, 4, 3, 2, 1].map((s) => ({ s, n: rated.filter((r) => r.rating?.stars === s).length }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  const star = icon(Star, { size: 16, fill: "currentColor" });
  return `
    <div class="pd-hist" role="img" aria-label="Ratings by star count: ${counts.map((c) => `${c.n} rated ${c.s}`).join(", ")}">
      ${counts.map((c) => `
        <div class="pd-hist__row">
          <span class="pd-hist__label">${c.s} ${star}</span>
          <div class="pd-hist__track"><div class="pd-hist__fill${c.s <= 2 ? " pd-hist__fill--low" : ""}" style="width:${Math.round((c.n / max) * 100)}%"></div></div>
          <span class="pd-hist__n">${c.n}</span>
        </div>`).join("")}
    </div>`;
}

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) => `
    <div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${pulseCrumbs('Recap ratings')}
        <h1 class="h1">Recap ratings</h1>
        <div class="text-ink-dim">Every rated recap, newest first. Internal and guest runs are tagged. A row opens the recap read-only.</div>
      </header>
      ${inner}
    </div>`;
  // Delegated so it survives every innerHTML repaint (list ↔ recap ↔ retry).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest('.js-crumb[data-nav="pulse"]')) setState({ stage: STAGES.ADMIN_PULSE });
  });

  let rated: AdminRun[] = [];

  const crumbTrail = [{ label: "Pulse", nav: "pulse" }, { label: "Recap ratings", nav: "list" }];
  const wireRecapCrumbs = () => {
    root.querySelectorAll<HTMLButtonElement>(".js-crumb").forEach((c) => {
      c.addEventListener("click", () => { if (c.dataset.nav === "list") renderList(); });
    });
  };

  const renderList = () => {
    // Plain average over every rated run, low = ≤2 stars (the same fold the Pulse tile
    // uses, here over the whole history rather than the dashboard's picked window).
    const avg = Math.round((rated.reduce((sum, r) => sum + (r.rating?.stars ?? 0), 0) / rated.length) * 10) / 10;
    const low = rated.filter((r) => (r.rating?.stars ?? 0) <= 2).length;
    const summary = `<p class="pd-count"><b>${avg.toFixed(1)}</b> average over <b>${rated.length}</b> rated ${rated.length === 1 ? "run" : "runs"}${low ? ` · ${low} low (≤2)` : ""}.</p>`;
    const toolbar = listToolbar({
      search: { placeholder: "Search by name, company or note" },
      filters: [
        { key: "all", label: "All", active: true },
        { key: "5", label: "5 stars" },
        { key: "4", label: "4 stars" },
        { key: "3", label: "3 stars" },
        { key: "low", label: "Low (≤2)" },
      ],
      count: { n: rated.length, noun: "run" },
    });
    root.innerHTML = shell(`
      <section class="l-stack l-stack--3">
        ${summary}
        ${histogram(rated)}
        ${toolbar}
        <div class="um-table-wrap">
          <table class="um-table">
            <thead><tr><th>Who</th><th>Type</th><th>Date</th><th>Stars</th><th>Note</th></tr></thead>
            <tbody>${rated.map(ratingRow).join("")}</tbody>
          </table>
        </div>
        <p class="text-ink-dim js-no-match" hidden>No ratings match. Clear the search or pick another filter.</p>
      </section>`);
    wireListFilter(root, { one: "run", many: "runs" });
    root.querySelectorAll<HTMLElement>(".js-open-run").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // the name button sits inside its clickable row
        const id = el.dataset.id;
        if (id) void openRunBriefing(root, id, crumbTrail, wireRecapCrumbs);
      }));
  };

  const load = async () => {
    root.replaceChildren(createSkeleton(4));
    try {
      const res = await getAdminRuns();
      const runs = Array.isArray(res?.runs) ? (res.runs as AdminRun[]) : [];
      // Rated FINISHED runs only — an unfinished run someone rated mid-flow (dev/QA
      // noise) has no recap to open and would skew the picture.
      rated = runs.filter((r) => r.rating != null && r.finished);
    } catch {
      root.innerHTML = shell(`
        <section class="card-flat l-stack l-stack--2">
          <div class="eyebrow">Couldn't load</div>
          <p class="text-ink-dim">Something went wrong loading the ratings. Please try again.</p>
          <button type="button" class="btn btn--ghost js-retry">Try again</button>
        </section>`);
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    if (rated.length === 0) {
      root.innerHTML = shell(`<section class="card-flat"><p class="text-ink-dim">No rated recaps yet. When a manager rates one with the stars, it lands here.</p></section>`);
      return;
    }
    renderList();
  };

  await load();
};

export const unmount: Unmount = () => {};
