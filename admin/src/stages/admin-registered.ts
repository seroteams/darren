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

import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { backToPulse } from "../ui/pulse-labels.ts";
import { getRegistered, setUserRole, deactivateUser, reactivateUser, deleteUser } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star, TrendingUp, TrendingDown } from "lucide";
import { relTime, formatDate } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

// The roles a superadmin can set, offered in the row's ⋯ menu (user-management Phase 2).
const ROLE_OPTIONS = ["member", "manager", "admin"] as const;

// A single role-change menu, attached to <body> so the table's horizontal scroll can never
// clip it. Rebuilt on each open; torn down on close / navigate-away.
let roleMenuEl: HTMLElement | null = null;
let roleMenuOutside: ((e: Event) => void) | null = null;
function closeRoleMenu(): void {
  if (roleMenuOutside) { document.removeEventListener("click", roleMenuOutside, true); roleMenuOutside = null; }
  if (roleMenuEl) { roleMenuEl.remove(); roleMenuEl = null; }
}

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
  firstRunAt?: string | number | null;
  gapDays?: number | null;
  cameBack?: boolean;
  internal?: boolean;
  deactivated?: boolean;
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
  if (u.runsThisWeek > u.runsLastWeek) { variant = "up"; glyph = icon(TrendingUp, { size: 16 }); label = "more than last week"; }
  else if (u.runsThisWeek < u.runsLastWeek) { variant = "down"; glyph = icon(TrendingDown, { size: 16 }); label = "fewer than last week"; }
  else if (u.runsThisWeek > 0) { variant = "steady"; glyph = "•"; label = "same as last week"; }
  else { variant = "quiet"; glyph = "•"; label = "quiet"; }
  return `<span class="um-trend um-trend--${variant}" role="img" aria-label="${label}" title="${label}">${glyph}</span>`;
}

// The validation answer in one line: first run, then either "came back after N days"
// (the badge carries the win) or the honest gap — a late return or none yet.
function returnLine(u: RegUser): string {
  const firstMs = activeMs(u.firstRunAt ?? null);
  if (!firstMs) return "";
  const first = `first run ${formatDate(firstMs)}`;
  const gap =
    u.gapDays == null
      ? "no second prep yet"
      : u.cameBack
        ? `came back after ${u.gapDays === 0 ? "less than a day" : `${u.gapDays} ${u.gapDays === 1 ? "day" : "days"}`}`
        : `returned after ${u.gapDays} days. Outside the 2-week window`;
  return `<div class="um-activity__sub">${escapeHtml(first)} · ${escapeHtml(gap)}</div>`;
}

function userRow(u: RegUser): string {
  const off = !!u.deactivated;
  const deactivatedTag = off ? `<span class="um-badge um-badge--off">Deactivated</span>` : "";
  const internalTag = u.internal ? `<span class="um-badge um-badge--internal">internal</span>` : "";
  const backBadge = u.cameBack ? `<span class="um-badge um-badge--back">came back</span>` : "";
  return `
    <tr class="um-row js-user-row${off ? " um-row--off" : ""}${u.internal ? " um-row--internal" : ""}" data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}">
      <td>
        <button type="button" class="um-user__open js-user-open" data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}">${escapeHtml(u.name)}</button>
        <div class="um-user__email">${escapeHtml(u.email)}</div>
      </td>
      <td>${roleBadge(u.role)}${internalTag}${deactivatedTag}</td>
      <td>
        <div class="um-activity">${trendMark(u)}${backBadge}<span>last active ${escapeHtml(lastActive(u.lastActiveAt))}</span></div>
        <div class="um-activity__sub">${u.runsThisWeek} this week / ${u.runsLastWeek} last · ${u.runCount} ${u.runCount === 1 ? "run" : "runs"} total</div>
        ${returnLine(u)}
      </td>
      <td class="um-actions">
        <button type="button" class="um-menu-btn js-menu-btn" data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}" data-role="${escapeHtml(u.role)}" data-deactivated="${off ? "1" : ""}" aria-haspopup="menu" aria-label="Manage ${escapeHtml(u.name)}">⋯</button>
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
      <td colspan="4">
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
            <th class="um-actions-th" aria-label="Actions"></th>
          </tr>
        </thead>
        ${groups.map(companyGroup).join('<tbody class="um-group-gap"><tr><td colspan="4"></td></tr></tbody>')}
      </table>
    </div>`;
}

// The alpha-wide ratings signal — a small labelled stat, not a floating dim line.
function summaryBlock(s: Summary): string {
  const starIcon = icon(Star, { size: 16, fill: "currentColor" });
  const stat =
    s.ratedCount === 0
      ? "No 1:1s have been rated yet."
      : `over ${s.ratedCount} rated ${s.ratedCount === 1 ? "run" : "runs"} · ${s.lowCount} low ${s.lowCount === 1 ? "score" : "scores"} (≤2)`;
  const avg = s.ratedCount === 0 || s.avgStars == null ? "" : `${starIcon} ${escapeHtml(String(s.avgStars))} avg · `;
  return `
    <div class="um-summary">
      <span class="eyebrow">Across the alpha</span>
      <span class="text-sm">${avg}${escapeHtml(stat)}</span>
    </div>`;
}

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) =>
    `<div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${backToPulse()}
        <h1 class="h1">User management</h1>
        <div class="text-ink-dim">Everyone registered across the alpha, and whether they're coming back.</div>
      </header>
      ${inner}
      <div class="pd-back-bottom">${backToPulse()}</div>
    </div>`;
  // Delegated so it survives every innerHTML repaint (pulse-drilldowns back button).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest(".js-back-pulse")) setState({ stage: STAGES.ADMIN_PULSE });
  });

  const errorCard = `
    <section class="card-flat l-stack l-stack--2">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-ink-dim">Something went wrong loading the user list. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const openUser = (id: string | null, name: string | null) => {
    if (id) setState({ adminUserId: id, adminUserName: name, stage: STAGES.ADMIN_USER });
  };

  // Open the role-change menu next to a row's ⋯ button. Body-attached + fixed so the table's
  // scroll never clips it; picking a role calls the API and reloads (so the badge updates).
  const openRoleMenu = (btn: HTMLButtonElement) => {
    const id = btn.dataset.id ?? "";
    const current = btn.dataset.role ?? "";
    const name = btn.dataset.name ?? "this user";
    const isOff = btn.dataset.deactivated === "1";
    closeRoleMenu();
    const menu = document.createElement("div");
    menu.className = "um-menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML =
      `<div class="um-menu__label">Change role</div>` +
      ROLE_OPTIONS.map(
        (r) =>
          `<button type="button" role="menuitemradio" class="um-menu__item${r === current ? " is-current" : ""}" data-role="${r}"${r === current ? ' aria-checked="true" disabled' : ""}>${r}</button>`,
      ).join("") +
      `<div class="um-menu__sep" role="separator"></div>` +
      (isOff
        ? `<button type="button" role="menuitem" class="um-menu__item js-reactivate">Reactivate</button>`
        : `<button type="button" role="menuitem" class="um-menu__item um-menu__item--danger js-deactivate">Deactivate</button>`) +
      `<button type="button" role="menuitem" class="um-menu__item um-menu__item--danger js-delete">Delete…</button>`;
    document.body.appendChild(menu);
    const rect = btn.getBoundingClientRect();
    menu.style.top = `${Math.round(rect.bottom + 4)}px`;
    menu.style.left = `${Math.round(Math.max(8, rect.right - menu.offsetWidth))}px`;
    roleMenuEl = menu;

    menu.querySelectorAll<HTMLButtonElement>(".um-menu__item[data-role]:not([disabled])").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const role = item.dataset.role ?? "";
        closeRoleMenu();
        void (async () => {
          try {
            await setUserRole(id, role);
            await load();
          } catch (err) {
            window.alert((err as { message?: string })?.message || `Couldn't change ${name}'s role.`);
          }
        })();
      });
    });

    // Deactivate — disruptive (kicks them out now), so confirm first. Reactivate is safe, no confirm.
    menu.querySelector(".js-deactivate")?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeRoleMenu();
      if (!window.confirm(`Deactivate ${name}? They'll be signed out now and can't log back in until you reactivate them.`)) return;
      void (async () => {
        try {
          await deactivateUser(id);
          await load();
        } catch (err) {
          window.alert((err as { message?: string })?.message || `Couldn't deactivate ${name}.`);
        }
      })();
    });
    menu.querySelector(".js-reactivate")?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeRoleMenu();
      void (async () => {
        try {
          await reactivateUser(id);
          await load();
        } catch (err) {
          window.alert((err as { message?: string })?.message || `Couldn't reactivate ${name}.`);
        }
      })();
    });

    // Delete — permanent, so confirm and spell out what survives. The server keeps their
    // past 1:1s under the company (just unowned) and refuses (409) if a guardrail blocks it.
    menu.querySelector(".js-delete")?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeRoleMenu();
      if (!window.confirm(`Permanently delete ${name}? Their account is removed for good. Their past 1:1s stay under the company but no longer show an owner. This can't be undone.`)) return;
      void (async () => {
        try {
          await deleteUser(id);
          await load();
        } catch (err) {
          window.alert((err as { message?: string })?.message || `Couldn't delete ${name}.`);
        }
      })();
    });

    // Any click outside the menu closes it. Deferred so the click that opened it doesn't.
    roleMenuOutside = (e) => {
      if (!(e.target instanceof Node) || !menu.contains(e.target)) closeRoleMenu();
    };
    setTimeout(() => { if (roleMenuOutside) document.addEventListener("click", roleMenuOutside, true); }, 0);
  };

  const wire = () => {
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    // The whole row opens the drilldown. The name is a real <button> inside the row
    // (keyboard-focusable, screen-reader-labelled); its Enter/click bubbles up to here.
    root.querySelectorAll<HTMLElement>(".js-user-row").forEach((row) => {
      row.addEventListener("click", () => openUser(row.dataset.id ?? null, row.dataset.name ?? null));
    });
    // The ⋯ button opens the role menu; stop the click so it doesn't also open the drilldown.
    root.querySelectorAll<HTMLButtonElement>(".js-menu-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); openRoleMenu(btn); });
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
        `${summaryBlock(summary)}<section class="card-flat"><p class="text-ink-dim">No one has signed up yet.</p></section>`,
      );
      return;
    }

    root.innerHTML = shell(`${summaryBlock(summary)}${table(groups)}`);
    wire();
  };

  await load();
};

export const unmount: Unmount = () => { closeRoleMenu(); };
