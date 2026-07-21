// Runs — the member's own finished 1:1s (pre-go-live PG1). Wired to /api/v1/runs/mine,
// which is fenced server-side by company AND user, so a member only ever sees their own —
// never a colleague's or the admin's whole-company Library. Rows are read-only for now:
// re-opening a run is PG2, rating stars are PG3, and the "Past 1:1s" relabel is PG4.

import { STAGES, store, isAdmin } from "../state.js";
import { listMyRuns, getRunsAboutMe } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { relTime, formatDate } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";
import "../styles/design/member-runs.css";
import "../styles/ux-audit-fixes.css";

// The endpoint's real shape (backend/engine/run-history.ts memberRunView / listFinishedForMember).
type MyRun = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
  rating: { stars: number } | null;
};

// The member read shape (/api/v1/runs/about-me → runs.service aboutMe): the 1:1s the caller's
// manager prepped ABOUT them. LIST-ONLY by ruling — meeting type + who ran it + when, and
// NOTHING else (no name/role, no notes, no briefing, no rating). A member must never see a
// colleague's run or a manager's private data, so this stage renders these rows read-only
// and unclickable — there's no run detail to open.
type AboutRun = {
  id: string;
  meetingType: string;
  lastSeenAt: number;
  completedAt: number | null;
  managerName: string | null;
};

// One about-me row rendered as a timeline entry: the meeting type, who ran it, and the
// date (absolute — this is a personal record, not a live feed). Every value escaped.
function aboutEntry(r: AboutRun): string {
  const type = escapeHtml(r.meetingType || "1:1");
  const when = escapeHtml(formatDate(r.completedAt || r.lastSeenAt));
  const meta = r.managerName ? `<span class="member-runs__meta">with ${escapeHtml(r.managerName)}</span>` : "";
  return `<li class="member-runs__entry">
      <div class="member-runs__head">
        <span class="member-runs__type">${type}</span>
        <time class="member-runs__when">${when}</time>
      </div>
      ${meta}
    </li>`;
}

// Local one-use time-ago (mirrors compare.js) — four lines, so no shared util for one caller.
// One run → "who · role, seniority · meeting · when", falling back to the endpoint's
// headline when the ctx fields are blank. Every value is escaped.
function rowLine(r: MyRun): string {
  const c = r.ctx || ({} as MyRun["ctx"]);
  const bits: string[] = [];
  if (c.name) bits.push(c.name);
  if (c.role) bits.push(c.seniority ? `${c.role}, ${c.seniority}` : c.role);
  if (c.meetingType) bits.push(c.meetingType);
  const when = relTime(r.lastSeenAt);
  if (when) bits.push(when);
  return escapeHtml(bits.length ? bits.join(" · ") : r.headline || "Untitled 1:1");
}

export const mount: Mount = async (root, { setState }) => {
  // A plain member sees the list-only "about me" view (privacy ruling); a manager sees
  // their own authored prep sessions with ratings. The two paths diverge in load().
  const memberView = !isAdmin(store.user);
  // Member list has one name everywhere — "Your 1:1s" (audit B4); the manager keeps "Past
  // 1:1s". The manager's echo subtitle ("Your past 1:1s.") is dropped as redundant under its
  // own heading (audit C5); the member gets a plain, member-voiced line (audit B5/C4).
  const header = `
    <header class="page-header">
      <h1 class="h1">${memberView ? "Your 1:1s" : "Past 1:1s"}</h1>
      ${memberView ? `<div class="text-ink-dim">Your 1:1 history. Dates and meeting types, nothing else.</div>` : ""}
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}</div>`;

  // The friendly empty state. A manager can start a 1:1 from here; a plain member can't
  // (member-view: only-runs), so they just get a note that nothing's here yet.
  const emptyCard = isAdmin(store.user)
    ? `
    <section class="card-flat space-y-3">
      <div class="eyebrow">No 1:1s yet</div>
      <p class="text-ink-dim">You haven't done any 1:1s yet. Start your first one and it'll show up here.</p>
      <button type="button" class="btn js-start">Start 1:1</button>
    </section>`
    : `
    <section class="card-flat space-y-3">
      <div class="eyebrow">No 1:1s yet</div>
      <p class="text-ink-dim">Your past 1:1s will show up here once you've had one.</p>
    </section>`;

  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load your 1:1s</div>
      <p class="text-ink-dim">Something went wrong on our end, not yours. Try again in a moment. If it keeps happening, email <a href="mailto:carl@seroteams.com">carl@seroteams.com</a> and we'll help sort it out.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const startOneOnOne = () => {
    store.scripted = null;
    Object.assign(store.ctx, { personId: null, name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  };

  const wire = () => {
    root.querySelector(".js-start")?.addEventListener("click", startOneOnOne);
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    root.querySelectorAll<HTMLElement>(".js-open").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        if (!id) return;
        // A Monthly Check-in row opens its record at /guided/:id; interview runs open /runs/:id.
        if (el.dataset.kind === "guided") setState({ guidedId: id, stage: STAGES.GUIDED });
        else setState({ myRunId: id, stage: STAGES.RUN_DETAIL });
      });
    });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading your 1:1s…</p></section>`);

    // Member path: the list-only "about me" runs — never listMyRuns (which is authored-by-me
    // and carries ratings). Rows are plain, unclickable: a member has no run detail to open.
    if (memberView) {
      let runs: AboutRun[];
      try {
        const res = await getRunsAboutMe();
        runs = Array.isArray(res?.runs) ? (res.runs as AboutRun[]) : [];
      } catch {
        root.innerHTML = shell(errorCard);
        wire();
        return;
      }
      if (runs.length === 0) {
        root.innerHTML = shell(emptyCard);
        wire();
        return;
      }
      const entries = runs
        .slice()
        .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
        .map(aboutEntry)
        .join("");
      root.innerHTML = shell(`<section class="member-runs"><ol class="member-runs__timeline">${entries}</ol></section>`);
      wire();
      return;
    }

    let runs: MyRun[];
    try {
      const res = await listMyRuns();
      runs = Array.isArray(res?.runs) ? (res.runs as MyRun[]) : [];
    } catch {
      root.innerHTML = shell(errorCard);
      wire();
      return;
    }

    if (runs.length === 0) {
      root.innerHTML = shell(emptyCard);
      wire();
      return;
    }

    // Newest first, then one clickable row per run — a real button, so it's
    // keyboard-operable for free (PG2 opens its read-only detail).
    const rows = runs
      .slice()
      .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
      .map((r) => {
        const badge = r.rating
          ? `<span class="runs-list__stars text-sm" aria-label="prep rating ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`
          : "";
        const kind = escapeHtml(String((r as { kind?: string }).kind ?? ""));
        return `<button type="button" class="card-flat runs-list__row js-open" data-id="${escapeHtml(r.id)}" data-kind="${kind}"><span class="text-sm">${rowLine(r)}</span>${badge}</button>`;
      })
      .join("");
    // A persistent way to start the next 1:1, above the list — not buried inside the empty
    // state that vanishes the moment there's history. (audit M2) This path is manager-only
    // (members return early above), so the action always belongs here.
    const startBar = `<div class="runs-list__actions"><button type="button" class="btn js-start">Start 1:1</button></div>`;
    root.innerHTML = shell(`<section class="l-stack l-stack--2">${startBar}${rows}</section>`);
    wire();
  };

  await load();
};

export const unmount: Unmount = () => {};
