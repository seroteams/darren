// User management — the superadmin's read-only view of everyone across the alpha (user-management
// Phase 1; the screen was "Registered", PG7). Wired to GET /api/v1/admin/registered, gated by
// requireSuperadminRoute: only the allowlisted superadmin (Carl) gets a 200; a normal manager is
// refused (403). The nav item is hidden for everyone else, but that hiding is cosmetic — the 403
// is the real wall. Presentation only. A cross-company operator's unit is the *company*, so the
// table is grouped: each company is a header (name · people · last active) over its people, with
// the freshest-active company first and the dormant/empty ones sinking to the bottom. Within a
// company, whoever's slipping sinks too. A row (or the person's name, a real button) opens their
// drilldown. Row actions (role, deactivate, delete, reset) + the ⋯ menu that will hold them arrive
// in Phases 2–5; there's no menu while there's nothing to put in it.

import { STAGES } from "../state.js";
import { getRegistered } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type RegUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | number;
  runCount: number;
  lastActiveAt: string | number | null;
  runsThisWeek: number;
  runsLastWeek: number;
};
type RegCompany = { id: string; name: string; createdAt: string | number; users: RegUser[] };
type Summary = { avgStars: number | null; ratedCount: number; lowCount: number };
type Group = { name: string; users: RegUser[]; lastActive: number };

// Epoch ms for sorting; missing/unparseable sinks to the bottom (0).
function activeMs(value: string | number | null): number {
  if (value == null) return 0;
  const ms = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

// "x ago" for last-active — reuses the shared helper (needs epoch ms).
function lastActive(value: string | number | null): string {
  if (value == null) return "no runs yet";
  const ms = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(ms) ? relTime(ms) : "no runs yet";
}

// Coloured pill for the account role. Unknown roles fall back to the neutral style.
function roleBadge(role: string): string {
  const known = new Set(["admin", "manager", "member"]);
  const variant = known.has(role) ? role : "member";
  return `<span class="um-badge um-badge--${variant}">${escapeHtml(role)}</span>`;
}

// The whole point of the screen: is this person coming back? Compare this week's runs to last
// week's and show it as a shape, not arithmetic. Quiet = no runs either week.
function trendMark(u: RegUser): string {
  let variant: string, glyph: string, label: string;
  if (u.runsThisWeek > u.runsLastWeek) { variant = "up"; glyph = "▲"; label = "more than last week"; }
  else if (u.runsThisWeek < u.runsLastWeek) { variant = "down"; glyph = "▼"; label = "fewer than last week"; }
  else if (u.runsThisWeek > 0) { variant = "steady"; glyph = "•"; label = "same as last week"; }
  else { variant = "quiet"; glyph = "•"; label = "quiet"; }
  return `<span class="um-trend um-trend--${variant}" role="img" aria-label="${label}" title="${label}">${glyph}</span>`;
}

function userRow(u: RegUser): string {
  return `
    <tr class="um-row js-user-row" data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}">
      <td>
        <button type="button" class="um-user__open js-user-open" data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}">${escapeHtml(u.name)}</button>
        <div class="um-user__email">${escapeHtml(u.email)}</div>
      </td>
      <td>${roleBadge(u.role)}</td>
      <td>
        <div class="um-activity">${trendMark(u)}<span>last active ${escapeHtml(lastActive(u.lastActiveAt))}</span></div>
        <div class="um-activity__sub">${u.runsThisWeek} this week / ${u.runsLastWeek} last · ${u.runCount} ${u.runCount === 1 ? "run" : "runs"} total</div>
      </td>
    </tr>`;
}

// One company = one <tbody> group: a header row (name · people · freshest activity) over its
// people. An empty company still shows, greyed, so nothing silently vanishes.
function companyGroup(g: Group): string {
  const count = g.users.length;
  const meta = count === 0
    ? "No users yet"
    : `${count} ${count === 1 ? "person" : "people"}${g.lastActive > 0 ? ` · last active ${relTime(g.lastActive)}` : ""}`;
  const head = `
    <tr class="um-group__head">
      <td colspan="3">
        <span class="um-group__name">${escapeHtml(g.name)}</span>
        <span class="um-group__meta">${escapeHtml(meta)}</span>
      </td>
    </tr>`;
  return `<tbody class="um-group${count === 0 ? " um-group--empty" : ""}">${head}${g.users.map(userRow).join("")}</tbody>`;
}

function table(groups: Group[]): string {
  return `
    <div class="um-table-wrap">
      <table class="um-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Coming back?</th>
          </tr>
        </thead>
        ${groups.map(companyGroup).join('<tbody class="um-group-gap"><tr><td colspan="3"></td></tr></tbody>')}
      </table>
    </div>`;
}

// The alpha-wide ratings signal — a small labelled stat, not a floating dim line.
function summaryBlock(s: Summary): string {
  const stat =
    s.ratedCount === 0
      ? "No 1:1s have been rated yet."
      : `${s.avgStars == null ? "" : `★ ${s.avgStars} avg · `}over ${s.ratedCount} rated ${s.ratedCount === 1 ? "run" : "runs"} · ${s.lowCount} low ${s.lowCount === 1 ? "score" : "scores"} (≤2)`;
  return `
    <div class="um-summary">
      <span class="eyebrow">Across the alpha</span>
      <span class="text-sm">${escapeHtml(stat)}</span>
    </div>`;
}

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) =>
    `<div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header">
        <h1 class="h1">User management</h1>
        <div class="text-ink-dim text-sm">Everyone registered across the alpha, and whether they're coming back.</div>
      </header>
      ${inner}
    </div>`;

  const errorCard = `
    <section class="card-flat l-stack l-stack--2">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-sm text-ink-dim">Something went wrong loading the user list. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const openUser = (id: string | null, name: string | null) => {
    if (id) setState({ adminUserId: id, adminUserName: name, stage: STAGES.ADMIN_USER });
  };

  const wire = () => {
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    // The whole row opens the drilldown. The name is a real <button> inside the row
    // (keyboard-focusable, screen-reader-labelled); its Enter/click bubbles up to here.
    root.querySelectorAll<HTMLElement>(".js-user-row").forEach((row) => {
      row.addEventListener("click", () => openUser(row.dataset.id ?? null, row.dataset.name ?? null));
    });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading the alpha…</p></section>`);

    let companies: RegCompany[];
    let summary: Summary;
    try {
      const res = await getRegistered();
      companies = Array.isArray(res?.companies) ? (res.companies as RegCompany[]) : [];
      summary = (res?.summary as Summary) ?? { avgStars: null, ratedCount: 0, lowCount: 0 };
    } catch {
      root.innerHTML = shell(errorCard);
      wire();
      return;
    }

    // Group by company. Within a company, most-recently-active people first; companies ordered by
    // their own freshest activity, so the busy accounts lead and the quiet/empty ones sink.
    const groups: Group[] = companies
      .map((c) => {
        const users = [...c.users].sort((a, b) => activeMs(b.lastActiveAt) - activeMs(a.lastActiveAt));
        const lastActive = users.reduce((max, u) => Math.max(max, activeMs(u.lastActiveAt)), 0);
        return { name: c.name, users, lastActive };
      })
      .sort((a, b) => b.lastActive - a.lastActive || b.users.length - a.users.length);

    if (groups.every((g) => g.users.length === 0)) {
      root.innerHTML = shell(
        `${summaryBlock(summary)}<section class="card-flat"><p class="text-sm text-ink-dim">No one has signed up yet.</p></section>`,
      );
      return;
    }

    root.innerHTML = shell(`${summaryBlock(summary)}${table(groups)}`);
    wire();
  };

  await load();
};

export const unmount: Unmount = () => {};
