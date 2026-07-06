// Person detail — one person's page: all the manager's own 1:1s with them, newest first
// (pre-go-live PG5, step 01). Composes the PG4 grouping (for the header summary) and the
// PG1 rows over the same /runs/mine payload — fenced server-side by company AND user, so
// only your own 1:1s ever appear. The top "Since last time" block (step 02) surfaces the
// most recent 1:1's agreed actions + watch-fors. Each row opens the PG2 read-only detail,
// and "Prep next 1:1" seeds a fresh intake with this person (free — only running the full
// pipeline from there spends, same as starting any 1:1).

import { STAGES, store } from "../state.js";
import { listMyRuns, getMyRun, getTeamAliases, listPeople, setRunOutcome } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { groupRunsByPerson, runKeyOf } from "../ui/group-people.js";
import { relTime } from "../ui/time.ts";
import { buildCarryForward } from "../ui/carry-forward.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type MyRun = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  personId?: string | null;
  rating: { stars: number } | null;
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
type Roster = { people: Array<{ id: string; name: string; role: string | null; seniority: string | null }>; merges: Record<string, string> };
type NextAction = { when?: string; action?: string };
type Briefing = { next_actions?: NextAction[]; watch_for?: string[] } | null;
// Continuity Phase 2 — one-tap "did last time's agreed action happen?" per action.
type OutcomeAnswer = "yes" | "partly" | "no" | "changed";
type OutcomesMap = Record<string, { answer: string; action: string; updatedAt: string | null }> | null;
const OUTCOME_OPTS: Array<{ value: OutcomeAnswer; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "No" },
  { value: "changed", label: "Changed" },
];

// Local one-use time-ago (mirrors runs.ts / team.ts) — four lines, no shared util for one caller.
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
      ? `<span><b>${icon(Star, { size: 16, fill: "currentColor" })} ${p.avgStars.toFixed(1)}</b> avg · ${p.ratedCount} rated</span>`
      : `<span>not yet rated</span>`,
  );
  return items.join(`<span class="person-summary__sep" aria-hidden="true">·</span>`);
}

// "Since last time" — the most recent 1:1's agreed next actions + what-to-watch-for, so
// prepping the next conversation is helped by the last one (PG5 step 02, the make-or-break
// slice). The two lists are colour-coded (agreed vs watch) so they read apart at a glance.
// Returns "" — the block is hidden entirely — when neither field has content, so there's no
// empty scaffolding. Every value escaped.
// The four taps under one agreed action. The current answer (if any) is highlighted.
// data-index keys the action server-side; data-action snapshots the agreed text so the
// stored outcome carries what it was answering, even if the wording is edited elsewhere.
function outcomeTaps(index: number, actionText: string, current: string | null): string {
  const buttons = OUTCOME_OPTS.map((o) => {
    const on = o.value === current;
    return `<button type="button" class="outcome-tap js-outcome${on ? " outcome-tap--active" : ""}" data-answer="${o.value}"${on ? ' aria-pressed="true"' : ""}>${o.label}</button>`;
  }).join("");
  return `<div class="outcome-taps" data-index="${index}" data-action="${escapeHtml(actionText)}"><span class="outcome-taps__q">Did this happen?</span>${buttons}</div>`;
}

function sinceLastTime(b: Briefing, outcomes: OutcomesMap): string {
  if (!b) return "";
  // Index against the ORIGINAL next_actions array (not the filtered view) so the tap's
  // index matches the key the server stores + reads back.
  const actions = (b.next_actions || [])
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a && (a.action || a.when));
  const watch = (b.watch_for || []).filter(Boolean);
  if (!actions.length && !watch.length) return "";
  const parts: string[] = [];
  if (actions.length) {
    const items = actions
      .map(({ a, i }) => {
        const text = a.action || "";
        const line = `${a.when ? `<span class="since__when">${escapeHtml(a.when)}:</span> ` : ""}${escapeHtml(text)}`;
        return `<li>${line}${outcomeTaps(i, text, outcomes?.[String(i)]?.answer ?? null)}</li>`;
      })
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
    ? `<span class="runs-list__stars text-sm" aria-label="rated ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`
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
  let aliases: { merges: Record<string, string>; names: Record<string, string> };
  let roster: Roster = { people: [], merges: {} };
  try {
    const [res, aliasRes, rosterRes] = await Promise.all([
      listMyRuns(),
      getTeamAliases().catch(() => ({})),
      listPeople().catch(() => ({ people: [], merges: {} })), // members/errors → name-key fallback
    ]);
    runs = Array.isArray(res?.runs) ? (res.runs as MyRun[]) : [];
    const a = aliasRes as Partial<typeof aliases>;
    aliases = { merges: a?.merges || {}, names: a?.names || {} };
    const ro = rosterRes as Partial<Roster>;
    roster = { people: Array.isArray(ro?.people) ? ro.people : [], merges: ro?.merges || {} };
  } catch {
    root.querySelector(".js-host")!.innerHTML = notice(
      "Couldn't load",
      "Something went wrong. Try again from your Team page.",
    );
    wireBack();
    return;
  }

  // Group + filter on the SAME canonical key the Team uses (personId when stamped,
  // alias-resolved name-key otherwise), so a merged person's page collects every 1:1
  // that folded into them (and shows their renamed name).
  const person = (groupRunsByPerson(runs, aliases, roster) as Person[]).find((p) => p.key === key);
  const mine = runs
    .filter((r) => runKeyOf(r, aliases, roster) === key)
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
  // The same briefing seeds the carry-forward notes for "Prep your next 1:1" (Phase 1).
  let sinceBlock = "";
  let carryText = "";
  try {
    const latest = (await getMyRun(mine[0]!.id)) as { briefing: Briefing; outcomes?: OutcomesMap };
    const b = latest?.briefing ?? null;
    sinceBlock = sinceLastTime(b, latest?.outcomes ?? null);
    carryText = buildCarryForward(b);
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
  // A roster-backed person also seeds personId + their stored seniority, so the new run
  // lands on the same roster row (people-roster Phase 4).
  // Continuity Phase 1: pre-fill the notes with last time's agreed actions + watch-fors
  // (carryText), so the next 1:1 continues from where the last one left off. It seeds
  // BOTH freeNotes (what the notes textarea shows first) and notes, and clears any stale
  // issue pills — so the manager sees exactly the carry-forward, editable, and can clear
  // it for a cold start. Empty carryText → unchanged blank intake.
  root.querySelector(".js-prep")?.addEventListener("click", () => {
    store.scripted = null;
    const rosterRow = person.personId ? roster.people.find((p) => p.id === person.personId) : null;
    Object.assign(store.ctx, {
      personId: person.personId || null,
      name: person.name,
      role: person.role,
      seniority: rosterRow?.seniority || "",
      meetingType: "",
      meetingTypeIndex: null,
      issuePills: [],
      freeNotes: carryText,
      notes: carryText,
    });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  });

  // Continuity Phase 2 — tapping an outcome records whether last time's agreed action
  // happened, on the most recent run (the one "Since last time" shows). The tap is marked
  // active ONLY after the server confirms the write; a failure shows an honest inline
  // "couldn't save" and leaves the selection unchanged (no faked success).
  const latestRunId = mine[0]!.id;
  root.querySelectorAll<HTMLButtonElement>(".js-outcome").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const group = btn.closest<HTMLElement>(".outcome-taps");
      if (!group) return;
      const index = Number(group.dataset.index);
      const action = group.dataset.action || "";
      const answer = btn.dataset.answer as OutcomeAnswer;
      const taps = Array.from(group.querySelectorAll<HTMLButtonElement>(".js-outcome"));
      group.querySelector(".outcome-taps__err")?.remove();
      taps.forEach((t) => (t.disabled = true));
      try {
        await setRunOutcome(latestRunId, { index, answer, action });
        taps.forEach((t) => {
          const on = t === btn;
          t.classList.toggle("outcome-tap--active", on);
          if (on) t.setAttribute("aria-pressed", "true");
          else t.removeAttribute("aria-pressed");
        });
      } catch {
        const err = document.createElement("span");
        err.className = "outcome-taps__err";
        err.textContent = "Couldn't save — try again.";
        group.appendChild(err);
      } finally {
        taps.forEach((t) => (t.disabled = false));
      }
    });
  });
};

export const unmount: Unmount = () => {};
