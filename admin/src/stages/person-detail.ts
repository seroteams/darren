// Person detail — one person's page: all the manager's own 1:1s with them, newest first
// (pre-go-live PG5, step 01). Composes the PG4 grouping (for the header summary) and the
// PG1 rows over the same /runs/mine payload — fenced server-side by company AND user, so
// only your own 1:1s ever appear. The top "Since last time" block (step 02) surfaces the
// most recent 1:1's agreed actions + watch-fors. Each row opens the PG2 read-only detail,
// and "Prep next 1:1" seeds a fresh intake with this person (free — only running the full
// pipeline from there spends, same as starting any 1:1).

import { STAGES, store } from "../state.js";
import { listMyRuns, getMyRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { groupRunsByPerson, personKeyOf } from "../ui/group-people.js";
import type { Mount, Unmount } from "./stage.types.ts";

type MyRun = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  rating: { stars: number } | null;
};
type Person = {
  key: string;
  name: string;
  role: string;
  count: number;
  lastMet: number;
  ratedCount: number;
  avgStars: number | null;
};
type NextAction = { when?: string; action?: string };
type Briefing = { next_actions?: NextAction[]; watch_for?: string[] } | null;

// Local one-use time-ago (mirrors runs.ts / team.ts) — four lines, no shared util for one caller.
function relTime(ms: number): string {
  if (!ms) return "";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

// The summary line under the name: role, then meetings / last met / average as a scannable
// stat row (numbers emphasised). Returns HTML (set via innerHTML) — every value escaped.
function summaryHtml(p: Person): string {
  const items: string[] = [];
  if (p.role) items.push(`<span class="person-summary__role">${escapeHtml(p.role)}</span>`);
  items.push(`<span><b>${p.count}</b> meeting${p.count > 1 ? "s" : ""}</span>`);
  const last = relTime(p.lastMet);
  if (last) items.push(`<span>last <b>${escapeHtml(last)}</b></span>`);
  items.push(
    p.avgStars != null
      ? `<span><b>★ ${p.avgStars.toFixed(1)}</b> avg · ${p.ratedCount} rated</span>`
      : `<span>not yet rated</span>`,
  );
  return items.join(`<span class="person-summary__sep" aria-hidden="true">·</span>`);
}

// "Since last time" — the most recent 1:1's agreed next actions + what-to-watch-for, so
// prepping the next conversation is helped by the last one (PG5 step 02, the make-or-break
// slice). The two lists are colour-coded (agreed vs watch) so they read apart at a glance.
// Returns "" — the block is hidden entirely — when neither field has content, so there's no
// empty scaffolding. Every value escaped.
function sinceLastTime(b: Briefing): string {
  if (!b) return "";
  const actions = (b.next_actions || []).filter((a) => a && (a.action || a.when));
  const watch = (b.watch_for || []).filter(Boolean);
  if (!actions.length && !watch.length) return "";
  const parts: string[] = [];
  if (actions.length) {
    const items = actions
      .map((a) => `<li>${a.when ? `<span class="since__when">${escapeHtml(a.when)}:</span> ` : ""}${escapeHtml(a.action || "")}</li>`)
      .join("");
    parts.push(`<div class="since__group"><span class="since__label since__label--agreed">What you agreed</span><ul class="since__list">${items}</ul></div>`);
  }
  if (watch.length) {
    const items = watch.map((w) => `<li>${escapeHtml(w)}</li>`).join("");
    parts.push(`<div class="since__group"><span class="since__label since__label--watch">What to watch for</span><ul class="since__list">${items}</ul></div>`);
  }
  return `<section class="since"><h2 class="since__title">Since last time</h2>${parts.join("")}</section>`;
}

// One 1:1 in the quiet log below the recap: meeting type + when, with its star badge if
// rated. The person's name is redundant on their own page, so it's left off.
function runRow(r: MyRun): string {
  const when = relTime(r.lastSeenAt);
  const type = r.ctx?.meetingType || r.headline || "1:1";
  const badge = r.rating
    ? `<span class="runs-list__stars text-sm" aria-label="rated ${r.rating.stars} out of 5">★ ${r.rating.stars}</span>`
    : "";
  return `<button type="button" class="person-run js-open" data-id="${escapeHtml(r.id)}"><span class="text-sm"><span class="person-run__type">${escapeHtml(type)}</span>${when ? `<span class="person-run__when"> · ${escapeHtml(when)}</span>` : ""}</span>${badge}</button>`;
}

export const mount: Mount = async (root, { setState }) => {
  const toTeam = () => setState({ personKey: null, stage: STAGES.TEAM });

  const shell = (inner: string) => `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1 js-name">Person</h1>
          <button type="button" class="btn btn--ghost js-back">Back to Team</button>
        </div>
        <div class="person-summary js-sub"></div>
      </header>
      <div class="l-stack l-stack--4 js-host">${inner}</div>
    </div>`;

  const notice = (eyebrow: string, msg: string) =>
    `<section class="card-flat space-y-3"><div class="eyebrow">${eyebrow}</div><p class="text-sm text-ink-dim">${msg}</p><button type="button" class="btn js-back2">Back to Team</button></section>`;

  const wireBack = () => {
    root.querySelector(".js-back")?.addEventListener("click", toTeam);
    root.querySelector(".js-back2")?.addEventListener("click", toTeam);
  };

  const key = store.personKey;
  root.innerHTML = shell(`<p class="text-sm text-ink-dim">Loading…</p>`);
  wireBack();

  if (!key) {
    root.querySelector(".js-host")!.innerHTML = notice("No one selected", "Pick a person from your Team page.");
    wireBack();
    return;
  }

  let runs: MyRun[];
  try {
    const res = await listMyRuns();
    runs = Array.isArray(res?.runs) ? (res.runs as MyRun[]) : [];
  } catch {
    root.querySelector(".js-host")!.innerHTML = notice(
      "Couldn't load",
      "Something went wrong. Try again from your Team page.",
    );
    wireBack();
    return;
  }

  const person = (groupRunsByPerson(runs) as Person[]).find((p) => p.key === key);
  const mine = runs
    .filter((r) => personKeyOf(r?.ctx?.name ?? "") === key)
    .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));

  if (!person || mine.length === 0) {
    root.querySelector(".js-host")!.innerHTML = notice(
      "No 1:1s with this person yet",
      "There are no 1:1s here for you — they may have been logged under a different name.",
    );
    wireBack();
    return;
  }

  const nameEl = root.querySelector<HTMLElement>(".js-name");
  if (nameEl) nameEl.textContent = person.name;
  const sub = root.querySelector<HTMLElement>(".js-sub");
  if (sub) sub.innerHTML = summaryHtml(person);

  // The list carries no briefing, so fetch just the most recent run's detail for "Since
  // last time". A failure omits the block — the run list still renders. No OpenAI call.
  let sinceBlock = "";
  try {
    const latest = (await getMyRun(mine[0]!.id)) as { briefing: Briefing };
    sinceBlock = sinceLastTime(latest?.briefing ?? null);
  } catch { /* omit the block, keep the page */ }

  const list = `<section class="l-stack l-stack--2">
    <h2 class="person-runs__heading">Past 1:1s</h2>
    <div>${mine.map(runRow).join("")}</div>
  </section>`;
  const prep = `<section><button type="button" class="btn js-prep">Prep your next 1:1 with ${escapeHtml(person.name)}</button></section>`;
  root.querySelector(".js-host")!.innerHTML = sinceBlock + list + prep;

  wireBack();
  // Each row reopens that 1:1's read-only briefing (PG2). No new detail view.
  root.querySelectorAll<HTMLElement>(".js-open").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      if (id) setState({ myRunId: id, stage: STAGES.RUN_DETAIL });
    });
  });
  // "Prep next 1:1" — seed a fresh intake with this person and open the form. Seeding is
  // free; only running the full pipeline from intake spends (same as starting any 1:1).
  root.querySelector(".js-prep")?.addEventListener("click", () => {
    store.scripted = null;
    Object.assign(store.ctx, { name: person.name, role: person.role, seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  });
};

export const unmount: Unmount = () => {};
