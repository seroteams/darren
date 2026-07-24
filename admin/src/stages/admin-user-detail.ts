// User drilldown — a superadmin's read-only view of ONE registered user (pre-go-live PG8,
// reworked in design-consolidation Phase 6, audit D10). Reached from the Registered screen.
// Wired to GET /api/v1/admin/users/:id/runs, gated by requireSuperadminRoute (a normal
// owner → 403). The identity header (avatar initial, name, email · company · joined, role
// pill, stat chips) is assembled client-side from the registered list the API already
// returns; their 1:1s render as the house um-table.
//
// Opening a run goes through the normal route/state path: the row click stashes the run id
// and bumps stageTick, so main.js re-mounts this stage via the router loop and the mount
// renders the read-only recap — never an in-place innerHTML swap inside a click handler.
// No CSS imports here on purpose: the co-located unit test imports this module under
// node:test, which can't parse CSS.

import { STAGES, store } from "../state.js";
import { getUserRuns, getRegistered, getAdminRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { relTime, formatDate } from "../ui/time.ts";
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

// The identity fields the registered list already carries for this user (client-side
// lookup — no new API). null when the lookup failed; the header degrades to name-only.
export type UserProfile = {
  email: string;
  role: string;
  company: string;
  createdAt: string | number;
};

export type UserStats = { runCount: number; peopleCount: number; avgStars: number | null };

type RegUser = { id: string; name: string; email: string; role: string; createdAt: string | number };
type RegCompany = { name: string; users: RegUser[] };

// First letter of the name (falls back to "?") — the glyph in the avatar circle.
function initialOf(name: string): string {
  const s = (name || "").trim();
  return s ? s[0]!.toUpperCase() : "?";
}

function joinedLabel(createdAt: string | number): string {
  const ms = typeof createdAt === "number" ? createdAt : Date.parse(createdAt);
  return Number.isFinite(ms) ? formatDate(ms) : "";
}

// The identity header (audit D10): avatar initial + name lead (the Name-Wins Rule), the
// quiet email · company · joined line under it, the role pill beside, and small stat chips
// (1:1 count, people met, average stars) below. Pure string render so it unit-tests.
export function identityHeader(name: string, profile: UserProfile | null, stats: UserStats): string {
  const bits: string[] = [];
  if (profile?.email) bits.push(profile.email);
  if (profile?.company) bits.push(profile.company);
  const joined = profile ? joinedLabel(profile.createdAt) : "";
  if (joined) bits.push(`joined ${joined}`);
  const sub = bits.length ? `<div class="text-ink-dim text-sm">${escapeHtml(bits.join(" · "))}</div>` : "";
  const rolePill = profile?.role
    ? `<span class="um-badge um-badge--${["admin", "manager", "member"].includes(profile.role) ? profile.role : "member"}">${escapeHtml(profile.role)}</span>`
    : "";
  const chips = [
    `<span class="chip chip--plain">${stats.runCount} ${stats.runCount === 1 ? "1:1" : "1:1s"}</span>`,
    `<span class="chip chip--plain">${stats.peopleCount} ${stats.peopleCount === 1 ? "person" : "people"}</span>`,
    stats.avgStars == null
      ? ""
      : `<span class="chip chip--plain">${icon(Star, { size: 14, fill: "currentColor" })} ${escapeHtml(String(Math.round(stats.avgStars * 10) / 10))} avg</span>`,
  ].filter(Boolean).join("");
  return `
    <header class="page-header l-stack l-stack--3">
      ${breadcrumb([{ label: "User management", nav: "users" }, { label: name }])}
      <div class="rd-profile">
        <div class="ds-avatar rd-avatar" aria-hidden="true">${escapeHtml(initialOf(name))}</div>
        <div class="rd-profile__id">
          <h1 class="rd-name">${escapeHtml(name)}</h1>
          ${sub}
        </div>
        ${rolePill}
      </div>
      <div class="person-summary">${chips}</div>
    </header>`;
}

function starsCell(r: Run): string {
  if (!r.rating) return `<span class="text-ink-dim">–</span>`;
  return `<span class="runs-list__stars text-sm" aria-label="rated ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`;
}

function runRow(r: Run): string {
  const c = r.ctx || ({} as Run["ctx"]);
  const role = roleLine(c);
  return `
    <tr class="um-row js-run-row" data-run-id="${escapeHtml(r.id)}">
      <td>
        <strong>${escapeHtml(c.name || r.headline || "Untitled 1:1")}</strong>
        ${role ? `<div class="um-user__email">${escapeHtml(role)}</div>` : ""}
      </td>
      <td>${escapeHtml(c.meetingType || "1:1")}</td>
      <td class="text-ink-dim">${escapeHtml(relTime(r.lastSeenAt) || "–")}</td>
      <td>${starsCell(r)}</td>
    </tr>`;
}

// Their 1:1s as the one house table (um-table), newest first as the API returns them.
export function runsTable(runs: Run[]): string {
  return `
    <div class="um-table-wrap">
      <table class="um-table">
        <thead><tr><th>Who</th><th>Type</th><th>When</th><th>Rating</th></tr></thead>
        <tbody>${runs.map(runRow).join("")}</tbody>
      </table>
    </div>`;
}

// The run the next mount should open read-only. Set by the row click just before its
// stageTick bump; consumed (and cleared) by mount. Module-level on purpose — the store's
// typed shape doesn't carry it, and it must survive the unmount/mount hop in between.
let pendingRunId: string | null = null;

export const mount: Mount = async (root, { setState }) => {
  const name = store.adminUserName || "This user";
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${inner}</div>`;

  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-ink-dim">Something went wrong loading this user's 1:1s. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const back = () => setState({ adminUserId: null, adminUserName: null, stage: STAGES.ADMIN_REGISTERED });

  // The breadcrumb's navigable crumbs, by data-nav key: "users" → back to the registered
  // list, "list" → re-mount this stage on its list view (pendingRunId is empty by then).
  const wireCrumbs = () => {
    root.querySelectorAll<HTMLButtonElement>(".js-crumb").forEach((c) => {
      c.addEventListener("click", () => {
        const nav = c.dataset.nav;
        if (nav === "users") back();
        else if (nav === "list") setState({ stageTick: store.stageTick + 1 });
      });
    });
  };

  // ONE run's briefing, read-only (PG8 Step 3) — cross-user, via the superadmin route.
  const renderRecap = async (runId: string) => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading 1:1…</p></section>`);
    let run: { ctx: Run["ctx"]; briefing: Briefing | null };
    try {
      run = (await getAdminRun(runId)) as { ctx: Run["ctx"]; briefing: Briefing | null };
    } catch {
      const trail = breadcrumb([
        { label: "User management", nav: "users" },
        { label: name, nav: "list" },
        { label: "1:1" },
      ]);
      root.innerHTML = shell(`
        <header class="page-header l-stack l-stack--3">${trail}</header>
        <section class="card-flat space-y-3">
          <div class="eyebrow">Couldn't open</div>
          <p class="text-ink-dim">This 1:1 couldn't be opened. Go back and try another.</p>
        </section>`);
      wireCrumbs();
      return;
    }
    root.innerHTML = shell(
      recapHeader(run.ctx || ({} as Run["ctx"]), [
        { label: "User management", nav: "users" },
        { label: name, nav: "list" },
      ]) + renderReadonlyBriefing(run.briefing),
    );
    wireCrumbs();
  };

  // Find this user's identity in the registered payload (client-side over data the API
  // already returns). Tolerates failure — the header just loses its detail line.
  const fetchProfile = async (id: string): Promise<UserProfile | null> => {
    try {
      const res = await getRegistered();
      const companies = Array.isArray(res?.companies) ? (res.companies as RegCompany[]) : [];
      for (const c of companies) {
        const u = (c.users || []).find((x) => x.id === id);
        if (u) return { email: u.email, role: u.role, company: c.name, createdAt: u.createdAt };
      }
    } catch { /* header degrades to name-only */ }
    return null;
  };

  // The loading and error states keep a way back: the same breadcrumb + name, without
  // the identity detail that hasn't loaded yet (DESIGN §6.5 — states designed with the screen).
  const plainHeader = `
    <header class="page-header l-stack l-stack--2">
      ${breadcrumb([{ label: "User management", nav: "users" }, { label: name }])}
      <h1 class="h1">${escapeHtml(name)}</h1>
    </header>`;

  const load = async () => {
    root.innerHTML = shell(`${plainHeader}<section class="card-flat"><p class="text-sm text-ink-dim">Loading…</p></section>`);
    wireCrumbs();

    const id = store.adminUserId;
    if (!id) { back(); return; }

    let runs: Run[] = [];
    let profile: UserProfile | null = null;
    try {
      const [runsRes, prof] = await Promise.all([getUserRuns(id), fetchProfile(id)]);
      runs = Array.isArray(runsRes?.runs) ? (runsRes.runs as Run[]) : [];
      profile = prof;
    } catch {
      root.innerHTML = shell(plainHeader + errorCard);
      wireCrumbs();
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }

    const people = groupRunsByPerson(runs) as Array<{ key: string }>;
    const rated = runs.filter((r) => r.rating);
    const avgStars = rated.length
      ? rated.reduce((sum, r) => sum + (r.rating?.stars ?? 0), 0) / rated.length
      : null;
    const header = identityHeader(name, profile, {
      runCount: runs.length,
      peopleCount: people.length,
      avgStars,
    });

    const body = runs.length
      ? `<section class="l-stack l-stack--3"><div class="eyebrow">1:1s</div>${runsTable(runs)}</section>`
      : `<section class="card-flat"><p class="text-ink-dim">This user hasn't run any 1:1s yet.</p></section>`;
    root.innerHTML = shell(header + body);
    wireCrumbs();
    // A row click routes to the recap via the normal state path: stash the run id, bump
    // stageTick, and let main.js unmount + re-mount this stage through the router loop.
    root.querySelectorAll<HTMLElement>(".js-run-row").forEach((row) => {
      row.addEventListener("click", () => {
        const runId = row.dataset.runId || "";
        if (!runId) return;
        pendingRunId = runId;
        setState({ stageTick: store.stageTick + 1 });
      });
    });
  };

  // A pending run id means this mount IS the recap navigation — consume it and render
  // the read-only briefing; otherwise show the list.
  const openRunId = pendingRunId;
  pendingRunId = null;
  if (openRunId) { await renderRecap(openRunId); return; }
  await load();
};

export const unmount: Unmount = () => {};
