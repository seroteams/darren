// Person detail — one person's page: all the manager's own 1:1s with them, newest first
// (pre-go-live PG5, step 01). Composes the PG4 grouping (for the header summary) and the
// PG1 rows over the same /runs/mine payload — fenced server-side by company AND user, so
// only your own 1:1s ever appear. The top "Since last time" block (step 02) surfaces the
// most recent 1:1's agreed actions + watch-fors. Each row opens the PG2 read-only detail,
// and "Prep next 1:1" seeds a fresh intake with this person (free — only running the full
// pipeline from there spends, same as starting any 1:1).

import { STAGES, store } from "../../../admin/src/state.js";
import "../../../admin/src/styles/ux-audit-fixes.css"; // .btn--cta — this page's own chunk must carry it
import { listMyRuns, getMyRun, listPeople } from "../../../shared/api.js";
import { escapeHtml } from "../../../admin/src/ui/html.js";
import { renderPromiseList, type PromiseRow } from "../../../admin/src/ui/briefing-view.ts";
import { icon } from "../../../admin/src/ui/icon.js";
import { Star } from "lucide";
import { buildRosterView } from "../../../admin/src/ui/group-people.js";
import { relTime } from "../../../admin/src/ui/time.ts";
import { renderAxisMemory, type AxisRead } from "./person-axes.ts";
import type { Mount, Unmount } from "../../../admin/src/stages/stage.types.ts";
import { prepStartSubstage } from "../../../admin/src/ui/intake-start.ts";

type MyRun = {
  id: string;
  personId: string | null;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  rating: { stars: number } | null;
  kind?: "guided" | "interview"; // "guided" rows open /guided/:id (Phase 6)
};
type Person = {
  key: string;
  personId: string | null;
  name: string;
  role: string;
  count: number;
  lastMet: number;
  ratedCount: number;
  avgStars: number | null;
};
type NextAction = { when?: string; action?: string };
type Briefing = { next_actions?: NextAction[]; watch_for?: string[]; axes?: AxisRead[] } | null;

// Local one-use time-ago (mirrors runs.ts / team.ts) — four lines, no shared util for one caller.
// The summary line under the name: role, then meetings / last met / average as a scannable
// stat row (numbers emphasised). Returns HTML (set via innerHTML) — every value escaped.
function summaryHtml(p: Person): string {
  const items: string[] = [];
  if (p.role) items.push(`<span class="person-summary__role">${escapeHtml(p.role)}</span>`);
  items.push(`<span><b>${p.count}</b> meeting${p.count > 1 ? "s" : ""}</span>`);
  const last = relTime(p.lastMet);
  if (last) items.push(`<span>last <b>${escapeHtml(last)}</b></span>`);
  // The stars rate the PREP, not the person (audit X1) — say so, and keep them in the meta
  // row rather than anywhere near the name line.
  items.push(
    p.avgStars != null
      ? `<span><b>${icon(Star, { size: 16, fill: "currentColor" })} ${p.avgStars.toFixed(1)}</b> prep rating · ${p.ratedCount} rated</span>`
      : `<span>prep not yet rated</span>`,
  );
  return items.join(`<span class="person-summary__sep" aria-hidden="true">·</span>`);
}

// "Since last time" — the most recent 1:1's agreed next actions + what-to-watch-for, so
// prepping the next conversation is helped by the last one (PG5 step 02, the make-or-break
// slice). The two lists are colour-coded (agreed vs watch) so they read apart at a glance.
// Returns "" — the block is hidden entirely — when neither field has content, so there's no
// empty scaffolding. Every value escaped.
function sinceLastTime(b: Briefing, promises: PromiseRow[] | null, axisBlock: string): string {
  const actions = b ? (b.next_actions || []).filter((a) => a && (a.action || a.when)) : [];
  const watch = b ? (b.watch_for || []).filter(Boolean) : [];
  // Promises loop phase 3: when the last run armed the loop, the agreed actions show as
  // promises WITH their follow-through chip. Legacy runs (no promises) keep the plain list.
  const promiseList = renderPromiseList(promises);
  if (!axisBlock && !promiseList && !actions.length && !watch.length) return "";
  const parts: string[] = [];
  if (axisBlock) parts.push(axisBlock);
  if (promiseList) {
    parts.push(`<div class="since__group"><span class="since__label since__label--agreed">What you agreed · follow-through</span>${promiseList}</div>`);
  } else if (actions.length) {
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
    ? `<span class="runs-list__stars text-sm" aria-label="prep rating ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`
    : "";
  return `<button type="button" class="person-run js-open" data-id="${escapeHtml(r.id)}" data-kind="${escapeHtml(r.kind ?? "")}"><span class="text-sm"><span class="person-run__type">${escapeHtml(type)}</span>${when ? `<span class="person-run__when"> · ${escapeHtml(when)}</span>` : ""}</span>${badge}</button>`;
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
    `<section class="card-flat space-y-3"><div class="eyebrow">${eyebrow}</div><p class="text-ink-dim">${msg}</p><button type="button" class="btn js-back2">Back to Team</button></section>`;

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
  let people: { id: string; name: string; role: string | null }[];
  try {
    const [res, peopleRes] = await Promise.all([
      listMyRuns(),
      listPeople().catch(() => ({ people: [] })),
    ]);
    runs = Array.isArray(res?.runs) ? (res.runs as MyRun[]) : [];
    people = Array.isArray((peopleRes as { people?: unknown })?.people)
      ? ((peopleRes as { people: { id: string; name: string; role: string | null }[] }).people)
      : [];
  } catch {
    root.querySelector(".js-host")!.innerHTML = notice(
      "Couldn't load",
      "Something went wrong. Try again from your Team page.",
    );
    wireBack();
    return;
  }

  // Resolve the person + their runs on the SAME personId the Team card keys on (people-roster
  // Phase 4), so the header summary and the run list always agree — no name round-trip.
  const person = (buildRosterView(people, runs) as Person[]).find((p) => p.key === key);
  const mine = runs
    .filter((r) => r.personId === key)
    .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));

  // Truly not on the roster (bad/stale key) — the only genuine not-found.
  if (!person) {
    root.querySelector(".js-host")!.innerHTML = notice(
      "Person not found",
      "We couldn't find this person on your team. Head back and pick someone from your Team page.",
    );
    wireBack();
    return;
  }

  const nameEl = root.querySelector<HTMLElement>(".js-name");
  if (nameEl) nameEl.textContent = person.name;
  const sub = root.querySelector<HTMLElement>(".js-sub");

  // "Prep 1:1" — seed a fresh intake with this person and open the form. Seeding is free;
  // only running the full pipeline from intake spends (same as starting any 1:1). A
  // roster-backed person seeds personId so the new run lands on the same roster row.
  const wirePrep = () =>
    root.querySelector(".js-prep")?.addEventListener("click", () => {
      store.scripted = null;
      Object.assign(store.ctx, {
        personId: key,
        name: person.name,
        role: person.role,
        seniority: "",
        meetingType: "",
        meetingTypeIndex: null,
        notes: "",
      });
      // Known person from their own page — don't re-ask who they are; open at the meeting type.
      // (audit QA follow-up)
      setState({ sessionId: null, stage: STAGES.INTAKE, substage: prepStartSubstage({ personId: key, name: person.name }) });
    });

  // Not met yet — a real roster person with no 1:1s. Show who they are and invite prepping
  // the first one, rather than an empty "no runs" dead end (people-roster: View works for
  // everyone, not just met people).
  if (mine.length === 0) {
    if (sub) sub.textContent = person.role || "Not met yet";
    root.querySelector(".js-host")!.innerHTML = `
      <section class="card-flat space-y-3">
        <div class="eyebrow">Not met yet</div>
        <p class="text-ink-dim">You haven't logged a 1:1 with ${escapeHtml(person.name)} yet. Start your first one to get going.</p>
        <button type="button" class="btn btn--cta js-prep">Start first 1:1 with ${escapeHtml(person.name)}</button>
      </section>`;
    wireBack();
    wirePrep();
    return;
  }

  if (sub) sub.innerHTML = summaryHtml(person);

  // The list carries no briefings, so fetch the last few runs' details: the newest
  // feeds "Since last time" (agreed + watch), and all of them feed the axis trend
  // (oldest → newest). A failure omits the block — the run list still renders. No
  // OpenAI call. Capped at 4 so a long history can't fan out into many fetches.
  let sinceBlock = "";
  try {
    const recent = mine.slice(0, 4);
    const details = await Promise.all(
      recent.map((r) =>
        getMyRun(r.id)
          .then((d) => (d as { briefing?: Briefing; promises?: PromiseRow[] | null }) ?? null)
          .catch(() => null),
      ),
    );
    // details is newest→oldest (mine is sorted that way); the trend wants oldest→newest.
    const briefings = details.map((d) => d?.briefing ?? null);
    const axisBlock = renderAxisMemory([...briefings].reverse().map((b) => b?.axes));
    // The newest run's promises feed "Since last time" — what to close off next time.
    sinceBlock = sinceLastTime(briefings[0] ?? null, details[0]?.promises ?? null, axisBlock);
  } catch { /* omit the block, keep the page */ }

  const list = `<section class="l-stack l-stack--2">
    <h2 class="person-runs__heading">Past 1:1s</h2>
    <div>${mine.map(runRow).join("")}</div>
  </section>`;
  // The page's one job (Carl, 2026-07-17: "not big enough, not clear it should be start 1:1").
  // Full-width, large, and it says the action out loud. Stays ABOVE the history — that
  // placement was the original complaint and is green-lit (audit M1); only the size and words
  // change here.
  const prep = `<section><button type="button" class="btn btn--cta js-prep">Start 1:1 with ${escapeHtml(person.name)}</button></section>`;
  // Prep action ABOVE the history — the moment of highest intent (walking into the next 1:1)
  // must not sit below a scroll of past ones. (audit M1)
  root.querySelector(".js-host")!.innerHTML = sinceBlock + prep + list;

  wireBack();
  // Each row reopens that 1:1's read-only briefing (PG2). No new detail view.
  root.querySelectorAll<HTMLElement>(".js-open").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      if (!id) return;
      if (el.dataset.kind === "guided") setState({ guidedId: id, stage: STAGES.GUIDED });
      else setState({ myRunId: id, stage: STAGES.RUN_DETAIL });
    });
  });
  wirePrep();
};

export const unmount: Unmount = () => {};
