// Guest runs — a superadmin's read-only view of the UNCLAIMED guest pile (guest-run
// Phase 4; design-consolidation P7): every ownerless finished run, newest first, as the
// house um-table with the shared list toolbar (search + count — the pile has no obvious
// filter axis, so no chips). Guest runs are alpha feedback gold, not invisible files on
// disk. Wired to GET /api/v1/admin/guest-runs, gated by requireSuperadminRoute (a normal
// manager/admin → 403). Opening a run reuses the PG8 read-only briefing
// (GET /api/v1/admin/runs/:id — superadminRunView already serves ownerless runs).
// A run claimed by a new account leaves this list.

import "../styles/pulse-drilldowns.css";
import { STAGES, store } from "../state.ts";
import { pulseCrumbs } from "../ui/pulse-labels.ts";
import { getGuestRuns, getAdminRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import { breadcrumb } from "../ui/breadcrumb.ts";
import { recapHeader, roleLine } from "../ui/recap-header.ts";
import { renderReadonlyBriefing, type Briefing } from "../ui/briefing-view.ts";
import { listToolbar } from "../ui/list-toolbar.ts";
import { wireListFilter } from "./admin-runs.ts";
import type { Mount, Unmount } from "./stage.types.ts";
import { createSkeleton } from "../ui/skeleton.js";

type Run = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
};

/** The searchable text behind a row (toolbar search): name + role + type. */
function runSearchKey(r: Run): string {
  const c = r.ctx || ({} as Run["ctx"]);
  return [c.name || r.headline || "", roleLine(c), c.meetingType || ""].join(" ").toLowerCase();
}

function runRow(r: Run): string {
  const c = r.ctx || ({} as Run["ctx"]);
  const name = c.name || r.headline || "Untitled 1:1";
  const role = roleLine(c);
  // The name is a real button (keyboard target) inside its clickable row — the
  // um-table idiom (admin-runs.ts). Every guest run here is finished, so every
  // row opens its read-only briefing.
  return `
    <tr class="js-row um-row js-open-run" data-id="${escapeHtml(r.id)}" data-search="${escapeHtml(runSearchKey(r))}">
      <td>
        <button type="button" class="um-user__open js-open-run" data-id="${escapeHtml(r.id)}">${escapeHtml(name)}</button>
        ${role ? `<span class="pd-sub">${escapeHtml(role)}</span>` : ""}
      </td>
      <td>${c.meetingType ? escapeHtml(c.meetingType) : "–"}</td>
      <td class="text-ink-dim">${escapeHtml(relTime(r.lastSeenAt) || "–")}</td>
    </tr>`;
}

export const mount: Mount = async (root, { setState }) => {
  const header = `
    <header class="page-header l-stack l-stack--2">
      ${pulseCrumbs('Guest runs')}
      <h1 class="h1">Guest runs</h1>
      <div class="text-ink-dim">1:1s run by visitors with no account. Unclaimed, read-only. A guest who saves their run moves it out of this list.</div>
    </header>`;
  const shell = (inner: string) => `<div class="l-container l-container--wide l-stack l-stack--6">${header}${inner}</div>`;
  // The recap gets its own bare container — NOT `shell` — so the "Guest runs" header
  // no longer rides along above it (that was the doubled title + stacked back).
  const recapShell = (inner: string) => `<div class="l-container l-stack l-stack--8">${inner}</div>`;
  // Delegated so it survives every innerHTML repaint (the breadcrumb's Pulse crumb).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest('.js-crumb[data-nav="pulse"]')) setState({ stage: STAGES.ADMIN_PULSE });
  });

  let runs: Run[] = [];

  // The recap breadcrumb's one navigable crumb ("Guest runs" → back to the pile). Re-run
  // after every innerHTML repaint.
  const wireCrumbs = () => {
    root.querySelectorAll<HTMLButtonElement>(".js-crumb").forEach((c) => {
      c.addEventListener("click", () => { if (c.dataset.nav === "list") renderList(); });
    });
  };

  // Open ONE guest run's briefing read-only — same superadmin route as the PG8 drilldown.
  // Renders its own recap header (breadcrumb Guest runs › {meeting} + a profile that names
  // the 1:1), so the pile's header no longer stacks above it.
  const openRun = async (runId: string) => {
    if (!runId) return;
    root.innerHTML = recapShell(`<section class="js-skel"></section>`);
    root.querySelector(".js-skel")?.replaceChildren(createSkeleton(3));
    let run: { ctx: Run["ctx"]; briefing: Briefing | null };
    try {
      run = (await getAdminRun(runId)) as { ctx: Run["ctx"]; briefing: Briefing | null };
    } catch {
      root.innerHTML = recapShell(`
        <header class="page-header l-stack l-stack--3">${breadcrumb([{ label: "Guest runs", nav: "list" }, { label: "1:1" }])}</header>
        <section class="card-flat space-y-3">
          <div class="eyebrow">Couldn't open</div>
          <p class="text-ink-dim">This 1:1 couldn't be opened. Go back and try another.</p>
        </section>`);
      wireCrumbs();
      return;
    }
    root.innerHTML = recapShell(
      recapHeader(run.ctx || ({} as Run["ctx"]), [{ label: "Guest runs", nav: "list" }]) + renderReadonlyBriefing(run.briefing),
    );
    wireCrumbs();
  };

  const renderList = () => {
    const toolbar = listToolbar({
      search: { placeholder: "Search by name or role" },
      count: { n: runs.length, noun: "run" },
    });
    root.innerHTML = shell(`
      <section class="l-stack l-stack--3">
        ${toolbar}
        <div class="um-table-wrap">
          <table class="um-table">
            <thead><tr><th>Who</th><th>Type</th><th>Last seen</th></tr></thead>
            <tbody>${runs.map(runRow).join("")}</tbody>
          </table>
        </div>
        <p class="text-ink-dim js-no-match" hidden>No runs match. Clear the search.</p>
      </section>`);
    wireListFilter(root, { one: "run", many: "runs" });
    root.querySelectorAll<HTMLElement>(".js-open-run").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // the name button sits inside its clickable row
        const id = el.dataset.id;
        if (id) void openRun(id);
      }));
  };

  const load = async () => {
    root.replaceChildren(createSkeleton({ preset: "table", rows: 5, toolbar: true,
      cols: ["stack", "text:11ch", "text:11ch", "actions"] }));
    try {
      const res = (await getGuestRuns()) as { runs?: unknown };
      runs = Array.isArray(res?.runs) ? (res.runs as Run[]) : [];
    } catch {
      root.innerHTML = shell(`
        <section class="card-flat space-y-3">
          <div class="eyebrow">Couldn't load</div>
          <p class="text-ink-dim">Something went wrong loading the guest runs. Please try again.</p>
          <button type="button" class="btn btn--ghost js-retry">Try again</button>
        </section>`);
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    if (runs.length === 0) {
      root.innerHTML = shell(`<section class="card-flat"><p class="text-ink-dim">No unclaimed guest runs yet. When a visitor tries Sero without an account, their finished 1:1 lands here.</p></section>`);
      return;
    }
    renderList();
  };

  await load();
  // Keep TS honest about the unused-but-required mount signature pieces.
  void setState; void store;
};

export const unmount: Unmount = () => {};
