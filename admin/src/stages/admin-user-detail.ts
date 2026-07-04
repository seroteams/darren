// User drilldown — a superadmin's read-only view of ONE registered user's 1:1s (pre-go-live
// PG8). Reached from the Registered screen (PG7). Wired to GET /api/v1/admin/users/:id/runs,
// gated by requireSuperadminRoute (a normal owner → 403). Reuses PG4 grouping to show the
// people this user has met, and PG1 rows + PG3 ratings for their runs. Read-only; opening a
// briefing is PG8 Step 03.

import { STAGES, store } from "../state.js";
import { getUserRuns } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import { groupRunsByPerson } from "../ui/group-people.js";
import type { Mount, Unmount } from "./stage.types.ts";

type Run = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  rating: { stars: number } | null;
};

type Person = { key: string; name: string; role: string; count: number; lastMet: number; ratedCount: number; avgStars: number | null };

function personCard(p: Person): string {
  const bits = [
    p.role,
    `${p.count} ${p.count === 1 ? "meeting" : "meetings"}`,
    `last ${relTime(p.lastMet) || "—"}`,
    p.avgStars == null ? "not yet rated" : `★ ${Math.round(p.avgStars * 10) / 10} avg`,
  ].filter(Boolean);
  return `
    <div class="card-flat l-stack l-stack--2">
      <div class="text-sm"><strong>${escapeHtml(p.name)}</strong></div>
      <div class="text-ink-dim text-sm">${escapeHtml(bits.join(" · "))}</div>
    </div>`;
}

function runRow(r: Run): string {
  const c = r.ctx || ({} as Run["ctx"]);
  const bits: string[] = [];
  if (c.name) bits.push(c.name);
  if (c.role) bits.push(c.seniority ? `${c.role}, ${c.seniority}` : c.role);
  if (c.meetingType) bits.push(c.meetingType);
  const when = relTime(r.lastSeenAt);
  if (when) bits.push(when);
  const line = escapeHtml(bits.length ? bits.join(" · ") : r.headline || "Untitled 1:1");
  const badge = r.rating
    ? `<span class="runs-list__stars text-sm" aria-label="rated ${r.rating.stars} out of 5">★ ${r.rating.stars}</span>`
    : "";
  return `<div class="card-flat runs-list__row"><span class="text-sm">${line}</span>${badge}</div>`;
}

export const mount: Mount = async (root, { setState }) => {
  const name = store.adminUserName || "This user";
  const header = `
    <header class="page-header l-stack l-stack--2">
      <button type="button" class="btn btn--ghost btn--sm js-back">‹ Registered</button>
      <h1 class="h1">${escapeHtml(name)}</h1>
      <div class="text-ink-dim text-sm">Their people and 1:1s — read-only.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}</div>`;

  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-sm text-ink-dim">Something went wrong loading this user's 1:1s. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const back = () => setState({ adminUserId: null, adminUserName: null, stage: STAGES.ADMIN_REGISTERED });

  const wire = () => {
    root.querySelector(".js-back")?.addEventListener("click", back);
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading…</p></section>`);

    const id = store.adminUserId;
    if (!id) { back(); return; }

    let runs: Run[];
    try {
      const res = await getUserRuns(id);
      runs = Array.isArray(res?.runs) ? (res.runs as Run[]) : [];
    } catch {
      root.innerHTML = shell(errorCard);
      wire();
      return;
    }

    if (runs.length === 0) {
      root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">This user hasn't run any 1:1s yet.</p></section>`);
      wire();
      return;
    }

    const people = groupRunsByPerson(runs) as Person[];
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
  };

  await load();
};

export const unmount: Unmount = () => {};
