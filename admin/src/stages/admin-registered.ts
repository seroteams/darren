// User management — the superadmin's view of everyone across the alpha (user-management
// Phase 1; the screen was "Registered", PG7). Wired to GET /api/v1/admin/registered, gated by
// requireSuperadminRoute: only the allowlisted superadmin (Carl) gets a 200; a normal manager is
// refused (403). The nav item is hidden for everyone else, but that hiding is cosmetic — the 403
// is the real wall. Presentation only.
//
// Design-consolidation Phase 6 (audit D9): the company-grouped card stack became ONE flat
// um-table with a Company column, fronted by the shared list toolbar (search on name/email,
// role + status filter chips, honest count). The activity cell is one line. Row actions live
// behind the shared ⋯ row menu; the destructive ones (deactivate, delete) go through the
// shared confirm dialog — no window.confirm anywhere.

import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { pulseCrumbs } from "../ui/pulse-labels.ts";
import { listToolbar } from "../ui/list-toolbar.ts";
import { openRowMenu, closeRowMenu, type RowMenuItem } from "../ui/row-menu.ts";
import { confirmAction as confirmJs, alertAction as alertJs } from "../ui/confirm.js";
import { getRegistered, setUserRole, deactivateUser, reactivateUser, deleteUser } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star, TrendingUp, TrendingDown, MoreHorizontal } from "lucide";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

// The shared confirm/alert dialogs (ui/confirm.js is plain JS — typed here at the boundary).
const confirmAction = confirmJs as unknown as (opts: {
  message: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean;
}) => Promise<boolean>;
const alertAction = alertJs as unknown as (opts: { message: string; confirmLabel?: string }) => Promise<void>;

// The roles a superadmin can set, offered in the row's ⋯ menu (user-management Phase 2).
const ROLE_OPTIONS = ["member", "manager", "admin"] as const;

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
type FlatUser = RegUser & { company: string };

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

// One person = one row of the flat table. data-search / data-role / data-status feed the
// toolbar's client-side filtering (hidden-toggle, so typing never loses focus).
function userRow(u: FlatUser): string {
  const off = !!u.deactivated;
  const deactivatedTag = off ? `<span class="um-badge um-badge--off">Deactivated</span>` : "";
  const internalTag = u.internal ? `<span class="um-badge um-badge--internal">internal</span>` : "";
  const backBadge = u.cameBack ? `<span class="um-badge um-badge--back">came back</span>` : "";
  const runsWord = u.runCount === 1 ? "run" : "runs";
  return `
    <tr class="um-row js-user-row${off ? " um-row--off" : ""}${u.internal ? " um-row--internal" : ""}"
        data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}"
        data-search="${escapeHtml(`${u.name} ${u.email}`.toLowerCase())}"
        data-role="${escapeHtml(u.role)}" data-status="${off ? "deactivated" : "active"}">
      <td>
        <button type="button" class="um-user__open js-user-open" data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}">${escapeHtml(u.name)}</button>
        <div class="um-user__email">${escapeHtml(u.email)}</div>
      </td>
      <td class="text-ink-dim">${escapeHtml(u.company)}</td>
      <td>${roleBadge(u.role)}${internalTag}${deactivatedTag}</td>
      <td>
        <div class="um-activity">${trendMark(u)}${backBadge}<span>last active ${escapeHtml(lastActive(u.lastActiveAt))} · ${u.runCount} ${runsWord}</span></div>
      </td>
      <td class="um-actions">
        <button type="button" class="row-menu-btn js-menu-btn" data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}" data-role="${escapeHtml(u.role)}" data-deactivated="${off ? "1" : ""}" aria-haspopup="menu" aria-label="Manage ${escapeHtml(u.name)}">${icon(MoreHorizontal, { size: 18 })}</button>
      </td>
    </tr>`;
}

function table(users: FlatUser[]): string {
  return `
    <div class="um-table-wrap">
      <table class="um-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Company</th>
            <th>Role</th>
            <th>Activity</th>
            <th class="um-actions-th" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          ${users.map(userRow).join("")}
          <tr class="js-no-match" hidden><td colspan="5" class="text-ink-dim">No one matches that.</td></tr>
        </tbody>
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

// The toolbar's filter chips: one optional pick per group (role, status). Clicking the
// active chip clears that group.
const FILTER_CHIPS = [
  { key: "role:admin", label: "Admin" },
  { key: "role:manager", label: "Manager" },
  { key: "role:member", label: "Member" },
  { key: "status:active", label: "Active" },
  { key: "status:deactivated", label: "Deactivated" },
];

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) =>
    `<div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${pulseCrumbs('User management')}
        <h1 class="h1">User management</h1>
        <div class="text-ink-dim">Everyone registered across the alpha, and whether they're coming back.</div>
      </header>
      ${inner}
    </div>`;
  // Delegated so it survives every innerHTML repaint (pulse-drilldowns back button).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest('.js-crumb[data-nav="pulse"]')) setState({ stage: STAGES.ADMIN_PULSE });
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

  // Toolbar filter state — client-side over what the API already returned.
  let q = "";
  let roleFilter: string | null = null;
  let statusFilter: string | null = null;

  // Hidden-toggle filtering (the runs.ts idiom): the rows stay in the DOM, so typing in the
  // search box never repaints the input out from under the cursor. The count stays honest.
  const applyFilters = () => {
    let visible = 0;
    root.querySelectorAll<HTMLElement>(".js-user-row").forEach((row) => {
      const hit =
        (!q || (row.dataset.search || "").includes(q)) &&
        (!roleFilter || row.dataset.role === roleFilter) &&
        (!statusFilter || row.dataset.status === statusFilter);
      row.hidden = !hit;
      if (hit) visible++;
    });
    const count = root.querySelector<HTMLElement>(".list-toolbar__count");
    if (count) count.textContent = `${visible} ${visible === 1 ? "person" : "people"}`;
    const noMatch = root.querySelector<HTMLElement>(".js-no-match");
    if (noMatch) noMatch.hidden = visible > 0;
  };

  // Open the shared ⋯ row menu: role changes, deactivate/reactivate, delete. The disruptive
  // ones (deactivate kicks them out now; delete is forever) confirm via the shared dialog.
  const openUserMenu = (btn: HTMLButtonElement) => {
    const id = btn.dataset.id ?? "";
    const current = btn.dataset.role ?? "";
    const name = btn.dataset.name ?? "this user";
    const isOff = btn.dataset.deactivated === "1";
    const run = (fn: () => Promise<unknown>, fallback: string) => {
      void (async () => {
        try {
          await fn();
          await load();
        } catch (err) {
          await alertAction({ message: (err as { message?: string })?.message || fallback });
        }
      })();
    };
    const items: RowMenuItem[] = ROLE_OPTIONS.filter((r) => r !== current).map((r) => ({
      label: `Change role to ${r}`,
      onSelect: () => run(() => setUserRole(id, r), `Couldn't change ${name}'s role.`),
    }));
    if (isOff) {
      items.push({ label: "Reactivate", onSelect: () => run(() => reactivateUser(id), `Couldn't reactivate ${name}.`) });
    } else {
      items.push({
        label: "Deactivate…",
        danger: true,
        onSelect: () => {
          void (async () => {
            const ok = await confirmAction({
              message: `Deactivate ${name}? They'll be signed out now and can't log back in until you reactivate them.`,
              confirmLabel: "Deactivate",
              destructive: true,
            });
            if (ok) run(() => deactivateUser(id), `Couldn't deactivate ${name}.`);
          })();
        },
      });
    }
    items.push({
      label: "Delete…",
      danger: true,
      onSelect: () => {
        void (async () => {
          const ok = await confirmAction({
            message: `Permanently delete ${name}? Their account is removed for good. Their past 1:1s stay under the company but no longer show an owner. This can't be undone.`,
            confirmLabel: "Delete",
            destructive: true,
          });
          if (ok) run(() => deleteUser(id), `Couldn't delete ${name}.`);
        })();
      },
    });
    openRowMenu(btn, items);
  };

  const wire = () => {
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    // The whole row opens the drilldown. The name is a real <button> inside the row
    // (keyboard-focusable, screen-reader-labelled); its Enter/click bubbles up to here.
    root.querySelectorAll<HTMLElement>(".js-user-row").forEach((row) => {
      row.addEventListener("click", () => openUser(row.dataset.id ?? null, row.dataset.name ?? null));
    });
    // The ⋯ button opens the row menu; stop the click so it doesn't also open the drilldown.
    root.querySelectorAll<HTMLButtonElement>(".js-menu-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); openUserMenu(btn); });
    });
    // Toolbar: search on name/email; chips pick at most one role and one status.
    root.querySelector<HTMLInputElement>(".js-lt-search")?.addEventListener("input", (e) => {
      q = (e.target as HTMLInputElement).value.trim().toLowerCase();
      applyFilters();
    });
    root.querySelectorAll<HTMLButtonElement>(".js-lt-filter").forEach((chip) => {
      chip.addEventListener("click", () => {
        const [group, val] = (chip.dataset.key || "").split(":");
        if (group === "role") roleFilter = roleFilter === val ? null : (val ?? null);
        if (group === "status") statusFilter = statusFilter === val ? null : (val ?? null);
        root.querySelectorAll<HTMLButtonElement>(".js-lt-filter").forEach((c) => {
          const [g, v] = (c.dataset.key || "").split(":");
          const on = (g === "role" && v === roleFilter) || (g === "status" && v === statusFilter);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        applyFilters();
      });
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

    // Flatten the company grouping into one table; the company rides along as a column.
    // Most-recently-active people first, so whoever's live leads and the dormant sink.
    const users: FlatUser[] = companies
      .flatMap((c) => c.users.map((u) => ({ ...u, company: c.name })))
      .sort((a, b) => activeMs(b.lastActiveAt) - activeMs(a.lastActiveAt));

    if (users.length === 0) {
      root.innerHTML = shell(
        `${summaryBlock(summary)}<section class="card-flat"><p class="text-ink-dim">No one has signed up yet.</p></section>`,
      );
      return;
    }

    const toolbar = listToolbar({
      search: { placeholder: "Search name or email" },
      filters: FILTER_CHIPS,
      count: { n: users.length, noun: "person", nounPlural: "people" },
    });
    root.innerHTML = shell(`${summaryBlock(summary)}<section class="l-stack l-stack--3">${toolbar}${table(users)}</section>`);
    wire();
    applyFilters();
  };

  await load();
};

export const unmount: Unmount = () => { closeRowMenu(); };
