// Person detail — one person's page: all the manager's own 1:1s with them, newest first
// (pre-go-live PG5, reshaped by design-consolidation Phase 1, M5). Composes the PG4
// grouping (for the header summary) and the PG1 rows over the same /runs/mine payload —
// fenced server-side by company AND user, so only your own 1:1s ever appear. The header is
// the recap-header identity block (same classes as run-detail, so person and 1:1 pages
// share one look) with "Start 1:1" as the screen's one blue action in the actions row.
// The body shelves into the ds-tabs pattern from run-detail: Overview ("Since last time":
// axis trend, promises, reminders) and Past 1:1s (the history log). Each row opens the
// PG2 read-only detail, and "Start 1:1" seeds a fresh intake with this person (free —
// only running the full pipeline from there spends, same as starting any 1:1).

import { STAGES, store } from "../../../admin/src/state.js";
import { listMyRuns, getMyRun, listPeople } from "../../../shared/api.js";
import { escapeHtml } from "../../../admin/src/ui/html.js";
import { breadcrumb } from "../../../admin/src/ui/breadcrumb.ts";
import { renderPromiseList, type PromiseRow } from "../../../admin/src/ui/briefing-view.ts";
import { icon } from "../../../admin/src/ui/icon.js";
import { Star, ChevronRight } from "lucide";
import { buildRosterView } from "../../../admin/src/ui/group-people.js";
import { formatDate, relTime } from "../../../admin/src/ui/time.ts";
import { renderAxisMemory, type AxisRead } from "./person-axes.ts";
import type { Mount, Unmount } from "../../../admin/src/stages/stage.types.ts";
import { prepStartSubstage } from "../../../admin/src/ui/intake-start.ts";

export type MyRun = {
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

// The summary line under the name: role, then meetings / last met / average as a scannable
// stat row (numbers emphasised). Returns HTML (set via innerHTML) — every value escaped.
function summaryHtml(p: Person): string {
  const items: string[] = [];
  if (p.role) items.push(`<span class="person-summary__role">${escapeHtml(p.role)}</span>`);
  items.push(`<span><b>${p.count}</b> 1:1${p.count > 1 ? "s" : ""}</span>`);
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

// The identity block — the recap-header look (rd-profile / ds-avatar / rd-name), so a
// person's page and a 1:1's page share one identity treatment (M5). Direct reuse of
// recapHeader() doesn't fit: it appends the MEETING as the current breadcrumb and shows a
// meeting-type badge, while here the current crumb is the person and the quiet line is the
// stat meta row — so this replicates its exact classes instead. The actions slot holds the
// screen's one blue action ("Start 1:1"). Exported for tests; hooks (js-*) filled by mount.
export function identityHtml(name: string): string {
  const initial = (name || "").trim() ? name.trim()[0]!.toUpperCase() : "?";
  return `
    <div class="page-header__row">
      <div class="rd-profile">
        <div class="ds-avatar rd-avatar js-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
        <div class="rd-profile__id">
          <h1 class="rd-name js-name">${escapeHtml(name || "Person")}</h1>
          <div class="person-summary js-sub"></div>
        </div>
      </div>
      <div class="page-header__actions js-actions"></div>
    </div>`;
}

// The ds-tabs shelf (same idiom as run-detail.ts renderRunDetail): Overview first and
// default-active, the history log behind "Past 1:1s". Pure string, exported for tests.
export function renderTabs(overviewHtml: string, historyHtml: string): string {
  return `
    <div class="ds-tabs" role="tablist">
      <button type="button" class="ds-tab is-active" role="tab" aria-selected="true" data-tab="overview">Overview</button>
      <button type="button" class="ds-tab" role="tab" aria-selected="false" data-tab="history">Past 1:1s</button>
    </div>
    <div class="js-pane" data-pane="overview">${overviewHtml}</div>
    <div class="js-pane" data-pane="history" hidden>${historyHtml}</div>`;
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
    parts.push(`<div class="since__group"><span class="since__label since__label--watch">Reminders</span><ul class="since__list">${items}</ul></div>`);
  }
  return `<section class="since"><h2 class="since__title">Since last time</h2>${parts.join("")}</section>`;
}

// One 1:1 in the history log: meeting type, the absolute house date (Mon 18 Nov 2024)
// beside how long ago, its star badge if rated, and a trailing chevron so the row reads
// clickable (M5). The person's name is redundant on their own page, so it's left off.
export function runRow(r: MyRun): string {
  const when = r.lastSeenAt || 0;
  const whenBits = [formatDate(when), relTime(when)].filter(Boolean).join(" · ");
  const type = r.ctx?.meetingType || r.headline || "1:1";
  const badge = r.rating
    ? `<span class="runs-list__stars text-sm" aria-label="prep rating ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`
    : "";
  const chevron = `<span class="person-run__when">${icon(ChevronRight, { size: 16 })}</span>`;
  return `<button type="button" class="person-run js-open" data-id="${escapeHtml(r.id)}" data-kind="${escapeHtml(r.kind ?? "")}"><span class="text-sm"><span class="person-run__type">${escapeHtml(type)}</span>${whenBits ? `<span class="person-run__when"> · ${escapeHtml(whenBits)}</span>` : ""}</span><span class="l-row l-row--2">${badge}${chevron}</span></button>`;
}

// Click a tab → show its pane, mark it active. Same idiom as run-detail.ts wireTabs.
function wireTabs(root: HTMLElement): void {
  const tabsEl = root.querySelector<HTMLElement>(".ds-tabs");
  if (!tabsEl) return;
  const panes = Array.from(root.querySelectorAll<HTMLElement>(".js-pane"));
  tabsEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".ds-tab");
    if (!btn) return;
    const tab = btn.dataset.tab;
    panes.forEach((p) => {
      p.hidden = p.dataset.pane !== tab;
    });
    tabsEl.querySelectorAll<HTMLElement>(".ds-tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  });
}

export const mount: Mount = async (root, { setState }) => {
  const toTeam = () => setState({ personKey: null, stage: STAGES.TEAM });

  const shell = (inner: string) => `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header l-stack l-stack--3">
        <div class="js-crumbs">${breadcrumb([{ label: "Team", nav: "team" }, { label: "Person" }])}</div>
        ${identityHtml("")}
      </header>
      <div class="l-stack l-stack--4 js-host">${inner}</div>
    </div>`;

  const notice = (eyebrow: string, msg: string) =>
    `<section class="card-flat space-y-3"><div class="eyebrow">${eyebrow}</div><p class="text-ink-dim">${msg}</p></section>`;

  // The breadcrumb's "Team" crumb → back to the roster; replaces the old bespoke "Back to
  // Team" buttons. The header persists across repaints; setName() re-renders the trail with
  // the person's name (and the heading + avatar initial) once it's known, then re-wires.
  const wireCrumbs = () => {
    root.querySelector<HTMLButtonElement>('.js-crumb[data-nav="team"]')?.addEventListener("click", toTeam);
  };
  // Set the trail's current crumb (and the heading + avatar) to the person's name once resolved.
  const setName = (name: string) => {
    root.querySelectorAll<HTMLElement>(".js-name").forEach((el) => { el.textContent = name; });
    const avatar = root.querySelector<HTMLElement>(".js-avatar");
    if (avatar) avatar.textContent = (name || "").trim() ? name.trim()[0]!.toUpperCase() : "?";
    const crumbs = root.querySelector<HTMLElement>(".js-crumbs");
    if (crumbs) crumbs.innerHTML = breadcrumb([{ label: "Team", nav: "team" }, { label: name }]);
    wireCrumbs();
  };
  // The screen's one blue action, a normal-size solid accent button in the header actions
  // row (M5 — was a full-width mid-page .btn--cta slab). Empty label = no action (error paths).
  const setActions = (label: string | null) => {
    const host = root.querySelector<HTMLElement>(".js-actions");
    if (host) host.innerHTML = label ? `<button type="button" class="btn js-prep">${escapeHtml(label)}</button>` : "";
  };

  const key = store.personKey;
  root.innerHTML = shell(`<p class="text-sm text-ink-dim">Loading…</p>`);
  wireCrumbs();

  if (!key) {
    root.querySelector(".js-host")!.innerHTML = notice("No one selected", "Pick a person from your Team page.");
    wireCrumbs();
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
    wireCrumbs();
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
    wireCrumbs();
    return;
  }

  setName(person.name);
  const sub = root.querySelector<HTMLElement>(".js-sub");

  // "Start 1:1" — seed a fresh intake with this person and open the form. Seeding is free;
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
  // everyone, not just met people). The one blue action sits in the header row like every
  // other state of this screen.
  if (mine.length === 0) {
    if (sub) sub.textContent = person.role || "Not met yet";
    setActions(`Start first 1:1 with ${person.name}`);
    root.querySelector(".js-host")!.innerHTML = `
      <section class="card-flat space-y-3">
        <div class="eyebrow">Not met yet</div>
        <p class="text-ink-dim">You haven't logged a 1:1 with ${escapeHtml(person.name)} yet. Start your first one to get going.</p>
      </section>`;
    wireCrumbs();
    wirePrep();
    return;
  }

  if (sub) sub.innerHTML = summaryHtml(person);
  setActions(`Start 1:1 with ${person.name}`);

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

  // Overview never renders bare — when the last 1:1 left nothing to carry, say so (empty
  // state designed with the screen, DESIGN.md rule 5).
  const overview = sinceBlock || `<section class="card-flat"><p class="text-sm text-ink-dim">Nothing to carry over yet. Your next finished 1:1 with ${escapeHtml(person.name)} fills this in.</p></section>`;
  const history = `<div>${mine.map(runRow).join("")}</div>`;
  root.querySelector(".js-host")!.innerHTML = renderTabs(overview, history);

  wireCrumbs();
  wireTabs(root);
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
