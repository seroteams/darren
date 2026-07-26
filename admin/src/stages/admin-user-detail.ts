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

import { STAGES, store } from "../state.ts";
import { getUserRuns, getRegistered, getAdminRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star, ChevronRight } from "lucide";
import { relTime, formatDate } from "../ui/time.ts";
import { groupRunsByPerson } from "../ui/group-people.js";
import { breadcrumb } from "../ui/breadcrumb.ts";
import { recapHeader, roleLine } from "../ui/recap-header.ts";
import { renderReadonlyBriefing, type Briefing } from "../ui/briefing-view.ts";
import type { Mount, Unmount } from "./stage.types.ts";
import { createSkeleton } from "../ui/skeleton.js";

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

// The identity header (audit D10): avatar initial + name lead (the Name-Wins Rule), the role
// pill on the SAME line as the name, and the quiet email · company · joined line under both.
// The pill used to sit as a third flex child of .rd-profile, which parked it against the far
// right edge and gave the screen a fourth alignment axis (DESIGN §3a L3 caps it at three).
// Pure string render so it unit-tests.
export function identityHeader(name: string, profile: UserProfile | null): string {
  const bits: string[] = [];
  if (profile?.email) bits.push(profile.email);
  if (profile?.company) bits.push(profile.company);
  const joined = profile ? joinedLabel(profile.createdAt) : "";
  if (joined) bits.push(`joined ${joined}`);
  const sub = bits.length ? `<div class="text-ink-dim text-sm">${escapeHtml(bits.join(" · "))}</div>` : "";
  const rolePill = profile?.role
    ? `<span class="um-badge um-badge--${["admin", "manager", "member"].includes(profile.role) ? profile.role : "member"}">${escapeHtml(profile.role)}</span>`
    : "";
  return `
    <header class="page-header l-stack l-stack--3">
      ${breadcrumb([{ label: "User management", nav: "users" }, { label: name }])}
      <div class="rd-profile">
        <div class="ds-avatar rd-avatar" aria-hidden="true">${escapeHtml(initialOf(name))}</div>
        <div class="rd-profile__id">
          <div class="ud-nameline"><h1 class="rd-name">${escapeHtml(name)}</h1>${rolePill}</div>
          ${sub}
        </div>
      </div>
    </header>`;
}

// The at-a-glance totals as ONE quiet line beside the section title. They were three
// `chip`s, which at a real user's numbers read as "1 1:1" / "1 person" / "5 avg": three
// loud badges carrying almost nothing, and a fourth type level on the screen (T1).
// Empty string when there's nothing to count — the empty state says it instead.
export function runsSummary(stats: UserStats): string {
  if (!stats.runCount) return "";
  const bits = [
    `${stats.runCount} ${stats.runCount === 1 ? "1:1" : "1:1s"}`,
    `${stats.peopleCount} ${stats.peopleCount === 1 ? "person" : "people"}`,
  ];
  if (stats.avgStars != null) bits.push(`${Math.round(stats.avgStars * 10) / 10} avg rating`);
  return escapeHtml(bits.join(" · "));
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
      <td class="ud-rate num-tabular">${starsCell(r)}</td>
      <td class="ud-chev" aria-hidden="true">${icon(ChevronRight, { size: 16 })}</td>
    </tr>`;
}

// Their 1:1s as the one house table (um-table), newest first as the API returns them, sitting
// on its own white card like every other list in the admin. The <colgroup> stops one word in
// the Who column stretching across a third of the screen; the rating right-aligns with lining
// digits (T7) and the chevron says the row opens.
export function runsTable(runs: Run[]): string {
  return `
    <div class="ud-panel um-table-wrap">
      <table class="um-table um-table--flush">
        <colgroup>
          <col class="ud-c-who"><col class="ud-c-type"><col class="ud-c-when"><col class="ud-c-rate"><col class="ud-c-chev">
        </colgroup>
        <thead>
          <tr>
            <th>Who</th><th>Type</th><th>When</th><th class="ud-rate num-tabular">Rating</th><th></th>
          </tr>
        </thead>
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
  // Wide, like the Registered list this drills down from. The 38rem reading measure is for
  // prose; a table's width comes from its columns (DESIGN §3 T5), and at 38rem this one was
  // squeezed into a narrow strip floating in dead space.
  const shell = (inner: string) => `<div class="l-container l-container--wide l-stack l-stack--8">${inner}</div>`;

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
    root.innerHTML = shell(`<section class="js-skel"></section>`);
    root.querySelector(".js-skel")?.replaceChildren(createSkeleton(3));
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
    root.innerHTML = shell(`${plainHeader}<section class="js-skel"></section>`);
    root.querySelector(".js-skel")?.replaceChildren(createSkeleton(3));
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
    const header = identityHeader(name, profile);
    // The section title is a plain .h3, not an .eyebrow: the eyebrow style uppercases its
    // text, so "1:1s" was rendering on screen as "1:1S".
    const summary = runsSummary({ runCount: runs.length, peopleCount: people.length, avgStars });

    const body = runs.length
      ? `<section class="l-stack l-stack--3">
           <div class="ud-section-head">
             <h2 class="h3">1:1s</h2>
             ${summary ? `<div class="text-ink-dim text-sm">${summary}</div>` : ""}
           </div>
           ${runsTable(runs)}
         </section>`
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
