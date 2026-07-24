// Runs — the Pulse "Runs" drill-down (pulse-drilldowns; design-consolidation P6, D8):
// every run on the site, newest first — external managers, internal Sero accounts and
// guests, each labelled (Carl's call 2026-07-15: show everything, tagged, rather than
// hide the test noise). Wired to GET /api/v1/admin/runs. The shared list toolbar gives
// search + a kind filter (All / External / Internal / Guest); a finished row opens the
// run's read-only briefing (the PG8 superadmin recap, same as the guest pile — GET
// /api/v1/admin/runs/:id), an unfinished row says it has no briefing and stays inert.
// Superadmin-only, read-only.

import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { getAdminRuns, getAdminRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { prettyType, prettyStage, dateLabel, pulseCrumbs } from "../ui/pulse-labels.ts";
import { createSkeleton } from "../ui/skeleton.js";
import { listToolbar } from "../ui/list-toolbar.ts";
import { breadcrumb } from "../ui/breadcrumb.ts";
import { recapHeader, type RecapCtx } from "../ui/recap-header.ts";
import { renderReadonlyBriefing, type Briefing } from "../ui/briefing-view.ts";
import type { Mount, Unmount } from "./stage.types.ts";

export type AdminRun = {
  id: string;
  userName: string | null;
  company: string | null;
  internal: boolean;
  guest: boolean;
  meetingType: string | null;
  startedAt: number | null;
  lastSeenAt: number;
  finished: boolean;
  stage: string | null;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
};

export function whoCell(r: AdminRun): string {
  const tag = r.guest ? ` <span class="pd-pill pd-pill--guest">guest</span>`
    : r.internal ? ` <span class="pd-pill pd-pill--internal">internal</span>`
    : "";
  const name = r.userName ? escapeHtml(r.userName) : "Guest";
  const company = r.company ? `<span class="pd-sub">${escapeHtml(r.company)}</span>` : "";
  // A finished run opens read-only — the name is a real button (keyboard target),
  // mirroring the um-table idiom; an unfinished run has no briefing, so plain text.
  const who = r.finished
    ? `<button type="button" class="um-user__open js-open-run" data-id="${escapeHtml(r.id)}">${name}</button>`
    : name;
  return `${who}${tag}${company}`;
}

export function statusCell(r: AdminRun): string {
  if (r.finished) return `<span class="pd-pill pd-pill--back">finished</span>`;
  const at = r.stage ? ` at ${escapeHtml(prettyStage(r.stage))}` : "";
  return `<span class="pd-pill pd-pill--once">broke off${at}</span><span class="pd-sub">no briefing to open</span>`;
}

export function starsCell(r: AdminRun): string {
  if (!r.rating) return `<span class="text-ink-dim">–</span>`;
  return `<span class="pd-stars" aria-label="rated ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`;
}

/** The searchable text behind a row (toolbar search): who + company + type. */
export function runSearchKey(r: AdminRun): string {
  return [r.userName ?? "guest", r.company ?? "", r.meetingType ? prettyType(r.meetingType) : ""]
    .join(" ").toLowerCase();
}

function runRow(r: AdminRun): string {
  // Only a finished run has a briefing to open — its row is clickable (um-row);
  // an unfinished row stays inert and its status cell says why.
  return `
    <tr class="js-row${r.finished ? " um-row js-open-run" : ""}" data-id="${escapeHtml(r.id)}" data-kind="${kindOf(r)}" data-search="${escapeHtml(runSearchKey(r))}">
      <td>${whoCell(r)}</td>
      <td>${r.meetingType ? escapeHtml(prettyType(r.meetingType)) : "–"}</td>
      <td>${escapeHtml(dateLabel(r.startedAt ?? r.lastSeenAt))}</td>
      <td>${statusCell(r)}</td>
      <td>${starsCell(r)}</td>
    </tr>`;
}

/** Open ONE run's briefing read-only, in place — the PG8 superadmin recap the guest
 *  pile already uses (ui/recap-header + ui/briefing-view over GET /api/v1/admin/runs/:id).
 *  Shared by the Runs and Recap ratings drill-downs (design-consolidation P6, D8).
 *  `trail` is the crumbs back up (each host wires its own nav keys via `wire`). */
export async function openRunBriefing(
  root: HTMLElement,
  runId: string,
  trail: { label: string; nav?: string }[],
  wire: () => void,
): Promise<void> {
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${inner}</div>`;
  root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading 1:1…</p></section>`);
  let run: { ctx: RecapCtx; briefing: Briefing | null };
  try {
    run = (await getAdminRun(runId)) as { ctx: RecapCtx; briefing: Briefing | null };
  } catch {
    root.innerHTML = shell(`
      <header class="page-header l-stack l-stack--3">${breadcrumb([...trail, { label: "1:1" }])}</header>
      <section class="card-flat space-y-3">
        <div class="eyebrow">Couldn't open</div>
        <p class="text-ink-dim">This 1:1 couldn't be opened. Go back and try another.</p>
      </section>`);
    wire();
    return;
  }
  root.innerHTML = shell(recapHeader(run.ctx || ({} as RecapCtx), trail) + renderReadonlyBriefing(run.briefing, run.ctx?.name));
  wire();
}

type Kind = "all" | "external" | "internal" | "guest";
const kindOf = (r: AdminRun): Kind => (r.guest ? "guest" : r.internal ? "internal" : "external");

/** Wire the shared toolbar to in-place row filtering (no re-render, so the search box
 *  keeps focus): rows carry data-kind + data-search; misses hide; the count and the
 *  no-match note stay honest. Shared by the Runs / Ratings / Gate-1 drill-downs. */
export function wireListFilter(root: HTMLElement, noun: { one: string; many: string }): void {
  const search = root.querySelector<HTMLInputElement>(".js-lt-search");
  const chips = [...root.querySelectorAll<HTMLButtonElement>(".js-lt-filter")];
  const count = root.querySelector<HTMLElement>(".list-toolbar__count");
  const noMatch = root.querySelector<HTMLElement>(".js-no-match");
  const apply = () => {
    const q = (search?.value ?? "").trim().toLowerCase();
    const kind = chips.find((c) => c.getAttribute("aria-pressed") === "true")?.dataset.key ?? "all";
    let visible = 0;
    root.querySelectorAll<HTMLElement>(".js-row").forEach((row) => {
      const hit = (kind === "all" || row.dataset.kind === kind) &&
        (!q || (row.dataset.search ?? "").includes(q));
      row.hidden = !hit;
      if (hit) visible++;
    });
    if (count) count.textContent = `${visible} ${visible === 1 ? noun.one : noun.many}`;
    if (noMatch) noMatch.hidden = visible > 0;
  };
  search?.addEventListener("input", apply);
  chips.forEach((c) => c.addEventListener("click", () => {
    chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    apply();
  }));
}

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) => `
    <div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${pulseCrumbs('Runs')}
        <h1 class="h1">Runs</h1>
        <div class="text-ink-dim">Every 1:1 prep on the site, newest first. Real managers plus internal and guest runs, each tagged. A finished run opens read-only.</div>
      </header>
      ${inner}
    </div>`;
  // Delegated so it survives every innerHTML repaint (list ↔ recap ↔ retry).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest('.js-crumb[data-nav="pulse"]')) setState({ stage: STAGES.ADMIN_PULSE });
  });

  let runs: AdminRun[] = [];

  const crumbTrail = [{ label: "Pulse", nav: "pulse" }, { label: "Runs", nav: "list" }];
  const wireRecapCrumbs = () => {
    root.querySelectorAll<HTMLButtonElement>(".js-crumb").forEach((c) => {
      c.addEventListener("click", () => { if (c.dataset.nav === "list") renderList(); });
    });
  };
  const openRun = (id: string) => { void openRunBriefing(root, id, crumbTrail, wireRecapCrumbs); };

  const renderList = () => {
    const toolbar = listToolbar({
      search: { placeholder: "Search by name or company" },
      filters: [
        { key: "all", label: "All", active: true },
        { key: "external", label: "External" },
        { key: "internal", label: "Internal" },
        { key: "guest", label: "Guest" },
      ],
      count: { n: runs.length, noun: "run" },
    });
    root.innerHTML = shell(`
      <section class="l-stack l-stack--3">
        ${toolbar}
        <div class="um-table-wrap">
          <table class="um-table">
            <thead><tr><th>Who</th><th>Type</th><th>Started</th><th>Status</th><th>Rating</th></tr></thead>
            <tbody>${runs.map(runRow).join("")}</tbody>
          </table>
        </div>
        <p class="text-ink-dim js-no-match" hidden>No runs match. Clear the search or pick another filter.</p>
      </section>`);
    wireListFilter(root, { one: "run", many: "runs" });
    root.querySelectorAll<HTMLElement>(".js-open-run").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // the name button sits inside its clickable row
        const id = el.dataset.id;
        if (id) openRun(id);
      }));
  };

  const load = async () => {
    root.replaceChildren(createSkeleton(4));
    try {
      const res = await getAdminRuns();
      runs = Array.isArray(res?.runs) ? (res.runs as AdminRun[]) : [];
    } catch {
      root.innerHTML = shell(`
        <section class="card-flat l-stack l-stack--2">
          <div class="eyebrow">Couldn't load</div>
          <p class="text-ink-dim">Something went wrong loading the runs. Please try again.</p>
          <button type="button" class="btn btn--ghost js-retry">Try again</button>
        </section>`);
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    if (runs.length === 0) {
      root.innerHTML = shell(`<section class="card-flat"><p class="text-ink-dim">No runs yet. When anyone preps a 1:1, it lands here.</p></section>`);
      return;
    }
    renderList();
  };

  await load();
};

export const unmount: Unmount = () => {};
