// Registered — the superadmin's read-only view of the whole alpha (pre-go-live PG7).
// Wired to GET /api/v1/admin/registered, which is gated by requireSuperadminRoute: only
// the allowlisted superadmin (Carl) gets a 200; a normal owner is refused (403). The nav
// item is hidden for everyone else, but that hiding is cosmetic — the 403 is the real wall.

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

// A calendar date like "Jul 4, 2026" — for join dates (a timestamp, not "x ago").
function joinedOn(value: string | number): string {
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// "x ago" for last-active — reuses the shared helper (needs epoch ms).
function lastActive(value: string | number | null): string {
  if (value == null) return "no runs yet";
  const ms = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(ms) ? relTime(ms) : "no runs yet";
}

function userRow(u: RegUser): string {
  const bits = [
    `${u.runCount} ${u.runCount === 1 ? "run" : "runs"}`,
    `last active ${lastActive(u.lastActiveAt)}`,
    `${u.runsThisWeek} this week / ${u.runsLastWeek} last`,
  ];
  return `
    <div class="card-flat l-stack l-stack--2">
      <div class="text-sm"><strong>${escapeHtml(u.name)}</strong> · ${escapeHtml(u.role)}</div>
      <div class="text-ink-dim text-sm">${escapeHtml(u.email)} · joined ${escapeHtml(joinedOn(u.createdAt))}</div>
      <div class="text-ink-dim text-sm">${escapeHtml(bits.join(" · "))}</div>
    </div>`;
}

function companyCard(c: RegCompany): string {
  const people = c.users.length
    ? c.users.map(userRow).join("")
    : `<div class="text-ink-dim text-sm">No users yet.</div>`;
  return `
    <section class="card-flat l-stack l-stack--3">
      <div>
        <div class="eyebrow">Company</div>
        <h2 class="h2">${escapeHtml(c.name)}</h2>
        <div class="text-ink-dim text-sm">Created ${escapeHtml(joinedOn(c.createdAt))} · ${c.users.length} ${c.users.length === 1 ? "person" : "people"}</div>
      </div>
      <div class="l-stack l-stack--2">${people}</div>
    </section>`;
}

function summaryCard(s: Summary): string {
  const avg = s.avgStars == null ? "No ratings yet" : `★ ${s.avgStars} avg`;
  const detail =
    s.ratedCount === 0
      ? "No 1:1s have been rated yet."
      : `over ${s.ratedCount} rated ${s.ratedCount === 1 ? "run" : "runs"} · ${s.lowCount} low ${s.lowCount === 1 ? "score" : "scores"} (≤2)`;
  return `
    <section class="card-flat l-stack l-stack--2">
      <div class="eyebrow">Alpha ratings</div>
      <div class="text-sm"><strong>${escapeHtml(avg)}</strong></div>
      <div class="text-ink-dim text-sm">${escapeHtml(detail)}</div>
    </section>`;
}

export const mount: Mount = async (root) => {
  const header = `
    <header class="page-header">
      <h1 class="h1">Registered</h1>
      <div class="text-ink-dim text-sm">Every company using the alpha, and whether they're coming back.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}</div>`;

  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-sm text-ink-dim">Something went wrong loading the registered list. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const wire = () => {
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
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

    if (companies.length === 0) {
      root.innerHTML = shell(
        `${summaryCard(summary)}<section class="card-flat"><p class="text-sm text-ink-dim">No companies have signed up yet.</p></section>`,
      );
      return;
    }

    root.innerHTML = shell(`${summaryCard(summary)}${companies.map(companyCard).join("")}`);
  };

  await load();
};

export const unmount: Unmount = () => {};
