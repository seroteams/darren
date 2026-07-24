// Came back unprompted — the Gate-1 drill-down list (pulse-drilldowns;
// design-consolidation P6, D8): every external manager behind the Pulse hero tile's
// number in ONE table (the old tried/waiting split is now a filter chip), with the
// shared list toolbar (search + status filter). Fed by the same GET /api/v1/admin/pulse
// payload the dashboard uses (managers[] carries the whole came-back signal), so the
// list can never disagree with the tile. A row opens the manager's record (the PG8
// user drill-in), where each of their runs opens read-only. Superadmin-only.

import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { getPulse } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { activeLabel, dateLabel, pulseCrumbs } from "../ui/pulse-labels.ts";
import { createSkeleton } from "../ui/skeleton.js";
import { listToolbar } from "../ui/list-toolbar.ts";
import { wireListFilter } from "./admin-runs.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type PulseManager = {
  id: string;
  name: string;
  company: string;
  runCount: number;
  lastActiveAt: string | number | null;
  firstRunAt: string | number | null;
  cameBack: boolean;
  gapDays: number | null;
  status: "back" | "once" | "none" | "internal";
};

const verdictPill = (m: PulseManager): string => {
  const label = m.status === "back" ? (m.gapDays != null ? `came back · ${m.gapDays}d` : "came back")
    : m.status === "once" ? "ran once, not back yet"
    : "no runs yet";
  const kind = m.status === "back" ? "back" : m.status === "once" ? "once" : "none";
  return `<span class="pd-pill pd-pill--${kind}">${label}</span>`;
};

const filterKey = (m: PulseManager): string =>
  m.status === "back" ? "back" : m.runCount > 0 ? "once" : "none";

function managerRow(m: PulseManager): string {
  const search = `${m.name} ${m.company}`.toLowerCase();
  // The whole row (and the name button) opens the manager's record — the existing
  // PG8 drill-in, from which each run's read-only briefing opens.
  return `
    <tr class="js-row um-row js-open-user" data-id="${escapeHtml(m.id)}" data-name="${escapeHtml(m.name)}" data-kind="${filterKey(m)}" data-search="${escapeHtml(search)}">
      <td><button type="button" class="um-user__open js-open-user" data-id="${escapeHtml(m.id)}" data-name="${escapeHtml(m.name)}">${escapeHtml(m.name)}</button><span class="pd-sub">${escapeHtml(m.company)}</span></td>
      <td>${escapeHtml(dateLabel(m.firstRunAt))}</td>
      <td class="pd-num">${m.gapDays == null ? "–" : `${m.gapDays}d`}</td>
      <td>${escapeHtml(activeLabel(m.lastActiveAt))}</td>
      <td>${verdictPill(m)}</td>
    </tr>`;
}

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) => `
    <div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${pulseCrumbs('Came back unprompted')}
        <h1 class="h1">Came back unprompted</h1>
        <div class="text-ink-dim">Gate 1. External managers who ran a second prep within 14 days, with no nudge from us. A row opens their record.</div>
      </header>
      ${inner}
    </div>`;
  const wireBack = () => root.querySelectorAll('.js-crumb[data-nav="pulse"]').forEach((b) =>
    b.addEventListener("click", () => setState({ stage: STAGES.ADMIN_PULSE })));

  const load = async () => {
    root.replaceChildren(createSkeleton(4));
    let managers: PulseManager[] = [];
    try {
      const p = (await getPulse()) as { managers?: unknown };
      managers = Array.isArray(p?.managers) ? (p.managers as PulseManager[]) : [];
    } catch {
      root.innerHTML = shell(`
        <section class="card-flat l-stack l-stack--2">
          <div class="eyebrow">Couldn't load</div>
          <p class="text-ink-dim">Something went wrong loading the Gate-1 list. Please try again.</p>
          <button type="button" class="btn btn--ghost js-retry">Try again</button>
        </section>`);
      wireBack();
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    if (managers.length === 0) {
      root.innerHTML = shell(`<section class="card-flat"><p class="text-ink-dim">No external managers on live yet. The Gate-1 count starts when the first one runs a 1:1.</p></section>`);
      wireBack();
      return;
    }
    // The tile's exact basis: managers who actually ran at least once. Everyone else is
    // in the same table behind the "No runs yet" chip — registered, not yet counted.
    const tried = managers.filter((m) => m.runCount > 0);
    const cameBack = tried.filter((m) => m.cameBack).length;
    const count = `<p class="pd-count"><b>${cameBack} of ${tried.length}</b> came back unprompted. The same number as the Pulse card.</p>`;
    const toolbar = listToolbar({
      search: { placeholder: "Search by name or company" },
      filters: [
        { key: "all", label: "All", active: true },
        { key: "back", label: "Came back" },
        { key: "once", label: "Ran once" },
        { key: "none", label: "No runs yet" },
      ],
      count: { n: managers.length, noun: "manager" },
    });
    root.innerHTML = shell(`
      <section class="l-stack l-stack--3">
        ${count}
        ${toolbar}
        <div class="um-table-wrap">
          <table class="um-table">
            <thead><tr><th>Manager</th><th>First run</th><th>Gap</th><th>Last active</th><th>Came back?</th></tr></thead>
            <tbody>${managers.map(managerRow).join("")}</tbody>
          </table>
        </div>
        <p class="text-ink-dim js-no-match" hidden>No managers match. Clear the search or pick another filter.</p>
      </section>`);
    wireBack();
    wireListFilter(root, { one: "manager", many: "managers" });
    root.querySelectorAll<HTMLElement>(".js-open-user").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // the name button sits inside its clickable row
        const id = el.dataset.id;
        if (id) setState({ adminUserId: id, adminUserName: el.dataset.name ?? null, stage: STAGES.ADMIN_USER });
      }));
  };

  await load();
};

export const unmount: Unmount = () => {};
