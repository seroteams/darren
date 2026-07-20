// Guest runs — a superadmin's read-only view of the UNCLAIMED guest pile (guest-run
// Phase 4): every ownerless finished run, newest first. Guest runs are alpha feedback
// gold, not invisible files on disk. Wired to GET /api/v1/admin/guest-runs, gated by
// requireSuperadminRoute (a normal manager/admin → 403). Opening a run reuses the PG8
// read-only briefing (GET /api/v1/admin/runs/:id — superadminRunView already serves
// ownerless runs). A run claimed by a new account leaves this list.

import "../styles/pulse-drilldowns.css";
import { STAGES, store } from "../state.js";
import { backToPulse } from "../ui/pulse-labels.ts";
import { getGuestRuns, getAdminRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import { breadcrumb } from "../ui/breadcrumb.ts";
import { recapHeader, roleLine } from "../ui/recap-header.ts";
import { renderReadonlyBriefing, type Briefing } from "../ui/briefing-view.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type Run = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
};

function runSubtitle(c: Run["ctx"]): string {
  const bits: string[] = [];
  if (c.name) bits.push(c.name);
  if (c.role) bits.push(roleLine(c));
  if (c.meetingType) bits.push(c.meetingType);
  return bits.join(" · ");
}

function runRow(r: Run): string {
  const c = r.ctx || ({} as Run["ctx"]);
  const bits: string[] = [];
  const sub = runSubtitle(c);
  if (sub) bits.push(sub);
  const when = relTime(r.lastSeenAt);
  if (when) bits.push(when);
  const line = escapeHtml(bits.length ? bits.join(" · ") : r.headline || "Untitled 1:1");
  // A button so it's keyboard-operable — opens the read-only briefing.
  return `<button type="button" class="card-flat runs-list__row js-run-row" data-run-id="${escapeHtml(r.id)}"><span class="text-sm">${line}</span></button>`;
}

export const mount: Mount = async (root, { setState }) => {
  const header = `
    <header class="page-header l-stack l-stack--2">
      ${backToPulse()}
      <h1 class="h1">Guest runs</h1>
      <div class="text-ink-dim">1:1s run by visitors with no account — unclaimed, read-only. A guest who saves their run moves it out of this list.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}<div class="pd-back-bottom">${backToPulse()}</div></div>`;
  // The recap gets its own bare container — NOT `shell` — so the "Guest runs" header and its
  // circled Back no longer ride along above it (that was the doubled title + stacked back).
  const recapShell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${inner}</div>`;
  // Delegated so it survives every innerHTML repaint (pulse-drilldowns back button).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest(".js-back-pulse")) setState({ stage: STAGES.ADMIN_PULSE });
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
    root.innerHTML = recapShell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading 1:1…</p></section>`);
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
    const runsSection = `
      <section class="l-stack l-stack--3">
        <div class="eyebrow">Unclaimed (${runs.length})</div>
        <div class="l-stack l-stack--2">${runs.map(runRow).join("")}</div>
      </section>`;
    root.innerHTML = shell(runsSection);
    root.querySelectorAll<HTMLButtonElement>(".js-run-row").forEach((btn) => {
      btn.addEventListener("click", () => { void openRun(btn.dataset.runId || ""); });
    });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading…</p></section>`);
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
      root.innerHTML = shell(`<section class="card-flat"><p class="text-ink-dim">No unclaimed guest runs yet — when a visitor tries Sero without an account, their finished 1:1 lands here.</p></section>`);
      return;
    }
    renderList();
  };

  await load();
  // Keep TS honest about the unused-but-required mount signature pieces.
  void setState; void store;
};

export const unmount: Unmount = () => {};
