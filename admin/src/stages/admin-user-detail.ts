// User drilldown — a superadmin's read-only view of ONE registered user's 1:1s (pre-go-live
// PG8). Reached from the Registered screen (PG7). Wired to GET /api/v1/admin/users/:id/runs,
// gated by requireSuperadminRoute (a normal owner → 403). Reuses PG4 grouping to show the
// people this user has met, and PG1 rows + PG3 ratings for their runs. Read-only; opening a
// briefing is PG8 Step 03.
//
// IA (2026-07-21): every level shares ONE breadcrumb trail (ui/breadcrumb.ts) instead of
// three different back buttons, and the recap renders its OWN header — so the big title names
// the 1:1 you're reading, not the manager, and no second back button stacks under it.

import { STAGES, store } from "../state.js";
import { getUserRuns, getAdminRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { relTime } from "../ui/time.ts";
import { groupRunsByPerson } from "../ui/group-people.js";
import { breadcrumb } from "../ui/breadcrumb.ts";
import { recapHeader, roleLine } from "../ui/recap-header.ts";
import { renderReadonlyBriefing, type Briefing } from "../ui/briefing-view.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type Run = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  rating: { stars: number } | null;
};

type Person = { key: string; name: string; role: string; count: number; lastMet: number; ratedCount: number; avgStars: number | null };

export function personCard(p: Person): string {
  const bits = [
    p.role,
    `${p.count} ${p.count === 1 ? "1:1" : "1:1s"}`,
    `last ${relTime(p.lastMet) || "—"}`,
  ].filter(Boolean);
  const rated =
    p.avgStars == null
      ? "not yet rated"
      : `${icon(Star, { size: 16, fill: "currentColor" })} ${escapeHtml(String(Math.round(p.avgStars * 10) / 10))} avg`;
  return `
    <div class="card-flat l-stack l-stack--2">
      <div class="text-sm"><strong>${escapeHtml(p.name)}</strong></div>
      <div class="text-ink-dim text-sm">${escapeHtml(bits.join(" · "))} · ${rated}</div>
    </div>`;
}

export function runSubtitle(c: Run["ctx"]): string {
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
  const badge = r.rating
    ? `<span class="runs-list__stars text-sm" aria-label="rated ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`
    : "";
  // A button so it's keyboard-operable — opens the read-only briefing (Step 3).
  return `<button type="button" class="card-flat runs-list__row js-run-row" data-run-id="${escapeHtml(r.id)}"><span class="text-sm">${line}</span>${badge}</button>`;
}

export const mount: Mount = async (root, { setState }) => {
  const name = store.adminUserName || "This user";
  const header = `
    <header class="page-header l-stack l-stack--2">
      ${breadcrumb([{ label: "User management", nav: "users" }, { label: name }])}
      <h1 class="h1">${escapeHtml(name)}</h1>
      <div class="text-ink-dim">Their people and 1:1s — read-only.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}</div>`;
  // The recap gets its own bare container — NOT `shell` — so the user's page-header no longer
  // rides along above it (that was the doubled title + stacked back button).
  const recapShell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${inner}</div>`;

  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-ink-dim">Something went wrong loading this user's 1:1s. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const back = () => setState({ adminUserId: null, adminUserName: null, stage: STAGES.ADMIN_REGISTERED });

  // The breadcrumb's navigable crumbs, by data-nav key: "users" → back to the registered list,
  // "list" → back to this user's own People/1:1s. Re-run after every innerHTML repaint.
  const wireCrumbs = () => {
    root.querySelectorAll<HTMLButtonElement>(".js-crumb").forEach((c) => {
      c.addEventListener("click", () => {
        const nav = c.dataset.nav;
        if (nav === "users") back();
        else if (nav === "list") renderList();
      });
    });
  };

  const wire = () => {
    wireCrumbs();
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
  };

  let runs: Run[] = [];
  let people: Person[] = [];

  // Open ONE run's briefing read-only (PG8 Step 3) — cross-user, via the superadmin
  // route (getAdminRun). The breadcrumb steps back to this user's list without a re-fetch.
  const openRun = async (runId: string) => {
    if (!runId) return;
    root.innerHTML = recapShell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading 1:1…</p></section>`);
    let run: { ctx: Run["ctx"]; briefing: Briefing | null };
    try {
      run = (await getAdminRun(runId)) as { ctx: Run["ctx"]; briefing: Briefing | null };
    } catch {
      const trail = breadcrumb([
        { label: "User management", nav: "users" },
        { label: store.adminUserName || "User", nav: "list" },
        { label: "1:1" },
      ]);
      root.innerHTML = recapShell(`
        <header class="page-header l-stack l-stack--3">${trail}</header>
        <section class="card-flat space-y-3">
          <div class="eyebrow">Couldn't open</div>
          <p class="text-ink-dim">This 1:1 couldn't be opened. Go back and try another.</p>
        </section>`);
      wireCrumbs();
      return;
    }
    root.innerHTML = recapShell(
      recapHeader(run.ctx || ({} as Run["ctx"]), [
        { label: "User management", nav: "users" },
        { label: store.adminUserName || "User", nav: "list" },
      ]) + renderReadonlyBriefing(run.briefing),
    );
    wireCrumbs();
  };

  const renderList = () => {
    const peopleSection = `
      <section class="l-stack l-stack--3">
        <div class="eyebrow">People (${people.length})</div>
        <div class="l-stack l-stack--2">${people.map(personCard).join("")}</div>
      </section>`;
    const runsSection = `
      <section class="l-stack l-stack--3">
        <div class="eyebrow">1:1s (${runs.length})</div>
        <div class="l-stack l-stack--2">${runs.map(runRow).join("")}</div>
      </section>`;
    root.innerHTML = shell(`${peopleSection}${runsSection}`);
    wire();
    root.querySelectorAll<HTMLButtonElement>(".js-run-row").forEach((btn) => {
      btn.addEventListener("click", () => { void openRun(btn.dataset.runId || ""); });
    });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading…</p></section>`);

    const id = store.adminUserId;
    if (!id) { back(); return; }

    try {
      const res = await getUserRuns(id);
      runs = Array.isArray(res?.runs) ? (res.runs as Run[]) : [];
    } catch {
      root.innerHTML = shell(errorCard);
      wire();
      return;
    }

    if (runs.length === 0) {
      root.innerHTML = shell(`<section class="card-flat"><p class="text-ink-dim">This user hasn't run any 1:1s yet.</p></section>`);
      wire();
      return;
    }

    people = groupRunsByPerson(runs) as Person[];
    renderList();
  };

  await load();
};

export const unmount: Unmount = () => {};
