// Came back unprompted — the Gate-1 drill-down list (pulse-drilldowns): every external
// manager behind the Pulse hero tile's number, one row each. Fed by the same
// GET /api/v1/admin/pulse payload the dashboard uses (managers[] carries the whole
// came-back signal), so the list can never disagree with the tile. Superadmin-only,
// read-only; the Pulse breadcrumb returns to the dashboard.

import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { getPulse } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { activeLabel, dateLabel, pulseCrumbs } from "../ui/pulse-labels.ts";
import { createSkeleton } from "../ui/skeleton.js";
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

function managerRow(m: PulseManager): string {
  return `
    <tr>
      <td>${escapeHtml(m.name)}<span class="pd-sub">${escapeHtml(m.company)}</span></td>
      <td>${escapeHtml(dateLabel(m.firstRunAt))}</td>
      <td class="pd-num">${m.gapDays == null ? "–" : `${m.gapDays}d`}</td>
      <td>${escapeHtml(activeLabel(m.lastActiveAt))}</td>
      <td>${verdictPill(m)}</td>
    </tr>`;
}

function table(rows: PulseManager[]): string {
  return `
    <div class="um-table-wrap">
      <table class="um-table">
        <thead><tr><th>Manager</th><th>First run</th><th>Gap</th><th>Last active</th><th>Came back?</th></tr></thead>
        <tbody>${rows.map(managerRow).join("")}</tbody>
      </table>
    </div>`;
}

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) => `
    <div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${pulseCrumbs('Came back unprompted')}
        <h1 class="h1">Came back unprompted</h1>
        <div class="text-ink-dim">Gate 1. External managers who ran a second prep within 14 days, with no nudge from us.</div>
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
    // The tile's exact basis: managers who actually ran at least once. The rest are
    // shown below, muted — registered but not yet part of the Gate-1 denominator.
    const tried = managers.filter((m) => m.runCount > 0);
    const waiting = managers.filter((m) => m.runCount === 0);
    const cameBack = tried.filter((m) => m.cameBack).length;
    const count = `<p class="pd-count"><b>${cameBack} of ${tried.length}</b> came back unprompted. The same number as the Pulse card.</p>`;
    const triedSection = tried.length
      ? `<section class="l-stack l-stack--3">${count}${table(tried)}</section>`
      : `<section class="card-flat"><p class="text-ink-dim">No external manager has run a 1:1 yet. The Gate-1 count starts when the first one does.</p></section>`;
    const waitingSection = waiting.length
      ? `<section class="l-stack l-stack--3">
           <div class="eyebrow">Registered, no runs yet (${waiting.length})</div>
           ${table(waiting)}
         </section>`
      : "";
    root.innerHTML = shell(triedSection + waitingSection);
    wireBack();
  };

  await load();
};

export const unmount: Unmount = () => {};
