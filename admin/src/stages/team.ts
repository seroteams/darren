// Team — the people the manager has met with, built automatically from their own past
// 1:1s (pre-go-live PG4). Grouped by person (normalized name), each card shows how often,
// how recently, and how useful on average. Each card is a button that opens that person's
// page (PG5). Distinct from the admin Library (whole-company, admin-only).

import { STAGES, store } from "../state.js";
import { listMyRuns } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { groupRunsByPerson } from "../ui/group-people.js";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type Person = {
  key: string;
  name: string;
  role: string;
  count: number;
  lastMet: number;
  ratedCount: number;
  avgStars: number | null;
};

// Local one-use time-ago (mirrors runs.ts) — four lines, so no shared util for one caller.
function metaLine(p: Person): string {
  const bits: string[] = [`${p.count} meeting${p.count > 1 ? "s" : ""}`];
  const last = relTime(p.lastMet);
  if (last) bits.push(`last ${last}`);
  bits.push(p.avgStars != null ? `★ ${p.avgStars.toFixed(1)} avg (${p.ratedCount} rated)` : "not yet rated");
  return escapeHtml(bits.join(" · "));
}

// A clickable card — a real <button>, so it's keyboard-operable for free — opening the
// person's page (PG5). The global :focus-visible rule supplies the focus ring.
function personCard(p: Person): string {
  const role = p.role ? `<span class="text-ink-dim"> · ${escapeHtml(p.role)}</span>` : "";
  return `<button type="button" class="card-flat runs-list__row js-person" data-key="${escapeHtml(p.key)}"><span class="l-stack l-stack--2"><span class="text-sm"><strong>${escapeHtml(p.name)}</strong>${role}</span><span class="text-sm text-ink-dim">${metaLine(p)}</span></span></button>`;
}

export const mount: Mount = async (root, { setState }) => {
  const header = `
    <header class="page-header">
      <h1 class="h1">Team</h1>
      <div class="text-ink-dim text-sm">The people you meet with, built from your 1:1s.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}</div>`;

  const startOneOnOne = () => {
    store.scripted = null;
    Object.assign(store.ctx, { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  };

  const emptyCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Your team will fill in here</div>
      <p class="text-sm text-ink-dim">As you run 1:1s, the people you meet with appear here with their history. Start your first one.</p>
      <button type="button" class="btn js-start">Prep a 1:1</button>
    </section>`;
  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load your team</div>
      <p class="text-sm text-ink-dim">Something went wrong. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const wire = () => {
    root.querySelector(".js-start")?.addEventListener("click", startOneOnOne);
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    root.querySelectorAll<HTMLElement>(".js-person").forEach((el) => {
      el.addEventListener("click", () => {
        const key = el.dataset.key;
        if (key) setState({ personKey: key, stage: STAGES.PERSON_DETAIL });
      });
    });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading your team…</p></section>`);
    let runs: unknown[];
    try {
      const res = await listMyRuns();
      runs = Array.isArray(res?.runs) ? res.runs : [];
    } catch {
      root.innerHTML = shell(errorCard);
      wire();
      return;
    }
    const people = groupRunsByPerson(runs) as Person[];
    if (people.length === 0) {
      root.innerHTML = shell(emptyCard);
      wire();
      return;
    }
    root.innerHTML = shell(`<section class="l-stack l-stack--2">${people.map(personCard).join("")}</section>`);
    wire();
  };

  await load();
};

export const unmount: Unmount = () => {};
