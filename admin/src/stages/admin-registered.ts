// Registered — the superadmin's cross-company adoption view (pre-go-live PG7). Every alpha
// company and its people, each with the return-visit signal (run count, last active,
// this-week / last-week), and an alpha-wide rating summary up top. Read-only. Reachable
// only by the superadmin: the nav item is hidden for everyone else (cosmetic) and the
// backend refuses the fetch with a 403 (the real wall) — a normal owner hitting the route
// directly lands on the "not allowed" card below. Every value is escaped before render.

import { getRegistered } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import type { Mount, Unmount } from "./stage.types.ts";

type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string | null;
  runCount: number;
  lastActiveAt: string | null;
  runsThisWeek: number;
  runsLastWeek: number;
};
type RegisteredCompany = { id: string; name: string; createdAt: string | null; users: RegisteredUser[] };
type Summary = { avgStars: number | null; ratedCount: number; lowCount: number };
type Registered = { companies: RegisteredCompany[]; summary: Summary };

// "Jun 28" — a short join/active date. Returns "" for a missing/unparseable value so the
// caller can fall back to plain copy.
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// The one-glance alpha read: mean stars, how many rated, how many low.
function summaryHtml(s: Summary): string {
  if (s.ratedCount === 0) {
    return `<div class="eyebrow">Alpha ratings</div><p class="text-sm text-ink-dim">No ratings yet.</p>`;
  }
  const low = s.lowCount > 0 ? ` · <b>${s.lowCount}</b> low score${s.lowCount > 1 ? "s" : ""}` : "";
  return `<div class="eyebrow">Alpha ratings</div>
    <p class="text-sm"><b>★ ${(s.avgStars ?? 0).toFixed(1)}</b> avg over <b>${s.ratedCount}</b> rated 1:1${s.ratedCount > 1 ? "s" : ""}${low}</p>`;
}

// One user's return-visit signal as a scannable stat line (numbers emphasised).
function userMetaHtml(u: RegisteredUser): string {
  const items: string[] = [];
  const joined = shortDate(u.createdAt);
  if (joined) items.push(`joined ${escapeHtml(joined)}`);
  items.push(`<b>${u.runCount}</b> 1:1${u.runCount === 1 ? "" : "s"}`);
  const active = shortDate(u.lastActiveAt);
  items.push(active ? `last active ${escapeHtml(active)}` : `no 1:1s yet`);
  if (u.runCount > 0) items.push(`<b>${u.runsThisWeek}</b> this week / <b>${u.runsLastWeek}</b> last`);
  return items.join(` <span class="text-ink-dim" aria-hidden="true">·</span> `);
}

function userRow(u: RegisteredUser): string {
  return `<div class="card-flat l-stack l-stack--2">
    <div class="text-sm"><strong>${escapeHtml(u.name)}</strong> <span class="text-ink-dim">· ${escapeHtml(u.role)}</span></div>
    <div class="text-sm text-ink-dim">${escapeHtml(u.email)}</div>
    <div class="text-sm">${userMetaHtml(u)}</div>
  </div>`;
}

function companySection(c: RegisteredCompany): string {
  const created = shortDate(c.createdAt);
  const sub = created ? ` <span class="text-ink-dim text-sm">· since ${escapeHtml(created)}</span>` : "";
  const people =
    c.users.length === 0
      ? `<p class="text-sm text-ink-dim">No users yet.</p>`
      : `<div class="l-stack l-stack--2">${c.users.map(userRow).join("")}</div>`;
  return `<section class="l-stack l-stack--3">
    <h2 class="h2">${escapeHtml(c.name)}${sub}</h2>
    ${people}
  </section>`;
}

export const mount: Mount = async (root) => {
  const header = `
    <header class="page-header">
      <h1 class="h1">Registered</h1>
      <div class="text-ink-dim text-sm">Every alpha company and the people using Sero, and whether they come back.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}</div>`;

  const emptyCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">No companies yet</div>
      <p class="text-sm text-ink-dim">Once someone signs up, they'll appear here with their team.</p>
    </section>`;
  const errorCard = (msg: string) => `
    <section class="card-flat space-y-3">
      <div class="eyebrow">${escapeHtml(msg)}</div>
      <p class="text-sm text-ink-dim">Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const wire = () => {
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading…</p></section>`);
    let data: Registered;
    try {
      data = (await getRegistered()) as Registered;
    } catch (e) {
      // A normal owner/admin who reaches the route is refused by the backend (403) — the
      // nav hiding is cosmetic; this is the honest "not for you" card.
      const status = (e as { status?: number })?.status;
      root.innerHTML = shell(errorCard(status === 403 ? "This area is for Sero admins only" : "Couldn't load"));
      wire();
      return;
    }
    const companies = Array.isArray(data?.companies) ? data.companies : [];
    const summary = data?.summary ?? { avgStars: null, ratedCount: 0, lowCount: 0 };
    if (companies.length === 0) {
      root.innerHTML = shell(emptyCard);
      wire();
      return;
    }
    root.innerHTML = shell(`
      <section class="card-flat l-stack l-stack--2">${summaryHtml(summary)}</section>
      <div class="l-stack l-stack--8">${companies.map(companySection).join("")}</div>`);
    wire();
  };

  await load();
};

export const unmount: Unmount = () => {};
