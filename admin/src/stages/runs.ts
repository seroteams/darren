// Runs — Past 1:1s. A manager sees their own authored prep sessions; a member sees
// the list-only "about me" view. Wired to /api/v1/runs/mine, which is fenced
// server-side by company AND user, so a member only ever sees their own — never a
// colleague's or the admin's whole-company Library.
//
// Design-consolidation Phase 1 (audit M6): manager rows use the canonical anatomy
// (avatar initial, bold person name, quiet "type · date" line, star badge right)
// in one card of divider rows, grouped by recency, with the shared list toolbar
// (client-side name search + "N 1:1s" count) and Start 1:1 as the page header's
// one accent action. The member view (privacy ruling) is unchanged.

import { STAGES, store, isAdmin } from "../state.js";
import { listMyRuns, getRunsAboutMe } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { relTime, formatDate } from "../ui/time.ts";
import { pageHeader } from "../ui/page-header.ts";
import { listToolbar } from "../ui/list-toolbar.ts";
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

// First letter of the name (falls back to "?") — the glyph in the avatar circle,
// mirroring ui/recap-header.ts.
function initialOf(name: string): string {
  const s = (name || "").trim();
  return s ? s[0]!.toUpperCase() : "?";
}

// Relative within the week, then the one date format everywhere (DESIGN.md rule 9).
function whenLabel(ms: number): string {
  if (!ms) return "";
  const days = (Date.now() - ms) / 86400000;
  return days < 7 ? relTime(ms) : formatDate(ms);
}

// Recency buckets for the group heads. Runs arrive newest-first, so the groups
// land in order without a second sort.
function groupLabel(ms: number): string {
  const days = (Date.now() - (ms || 0)) / 86400000;
  if (days < 7) return "This week";
  if (days < 31) return "This month";
  return "Earlier";
}

// One manager row on the canonical anatomy. data-name carries the person's name
// (lowercased) for the toolbar's client-side search. Every value escaped.
function managerRow(r: MyRun): string {
  const c = r.ctx || ({} as MyRun["ctx"]);
  const name = c.name || r.headline || "Untitled 1:1";
  const sub = [c.meetingType, whenLabel(r.lastSeenAt)].filter(Boolean).join(" · ");
  const badge = r.rating
    ? `<span class="runs-list__stars text-sm" aria-label="prep rating ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`
    : "";
  const kind = escapeHtml(String((r as { kind?: string }).kind ?? ""));
  return `<li class="run-list__item js-run-item" data-name="${escapeHtml(name.toLowerCase())}">
      <button type="button" class="run-list__row js-open" data-id="${escapeHtml(r.id)}" data-kind="${kind}">
        <span class="ds-avatar run-list__avatar" aria-hidden="true">${escapeHtml(initialOf(name))}</span>
        <span class="run-list__main">
          <span class="run-list__name">${escapeHtml(name)}</span>
          <span class="run-list__sub">${escapeHtml(sub)}</span>
        </span>
        <span class="run-list__side">${badge}</span>
      </button>
    </li>`;
}

export const mount: Mount = async (root, { setState }) => {
  // A plain member sees the list-only "about me" view (privacy ruling); a manager sees
  // their own authored prep sessions with ratings. The two paths diverge in load().
  const memberView = !isAdmin(store.user);
  // Member list has one name everywhere — "Your 1:1s" (audit B4); the manager keeps "Past
  // 1:1s" with Start 1:1 as the header's one accent action. The member gets a plain,
  // member-voiced lede (audit B5/C4).
  const header = memberView
    ? pageHeader({ title: "Your 1:1s", lede: "Your 1:1 history. Dates and 1:1 types, nothing else." })
    : pageHeader({ title: "Past 1:1s", actionsHtml: `<button type="button" class="btn js-start">Start 1:1</button>` });
  const shell = (inner: string) => `<div class="stage-medium l-stack l-stack--8">${header}${inner}</div>`;

  // The friendly empty state. A manager starts their first 1:1 from the header's Start
  // button (the screen's one accent); a plain member can't start one (member-view:
  // only-runs), so they just get a note that nothing's here yet.
  const emptyCard = isAdmin(store.user)
    ? `
    <section class="card-flat space-y-3">
      <div class="eyebrow">No 1:1s yet</div>
      <p class="text-ink-dim">You haven't done any 1:1s yet. Start your first one and it'll show up here.</p>
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

  // The toolbar's search filters rows by person name, client-side: hide the misses,
  // hide any group head left with no visible rows, keep the count honest.
  const wireSearch = () => {
    const search = root.querySelector<HTMLInputElement>(".js-lt-search");
    if (!search) return;
    const count = root.querySelector<HTMLElement>(".list-toolbar__count");
    const noMatch = root.querySelector<HTMLElement>(".js-no-match");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      let visible = 0;
      root.querySelectorAll<HTMLElement>(".js-run-item").forEach((li) => {
        const hit = !q || (li.dataset.name || "").includes(q);
        li.hidden = !hit;
        if (hit) visible++;
      });
      root.querySelectorAll<HTMLElement>(".js-run-group").forEach((head) => {
        let el = head.nextElementSibling;
        let any = false;
        while (el && !el.classList.contains("js-run-group")) {
          if (el.classList.contains("js-run-item") && !(el as HTMLElement).hidden) { any = true; break; }
          el = el.nextElementSibling;
        }
        head.hidden = !any;
      });
      if (count) count.textContent = `${visible} ${visible === 1 ? "1:1" : "1:1s"}`;
      if (noMatch) noMatch.hidden = visible > 0;
    });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading your 1:1s…</p></section>`);
    wire();

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

    // Newest first, one card of divider rows with recency group heads between.
    const sorted = runs.slice().sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
    const rows: string[] = [];
    let lastGroup = "";
    for (const r of sorted) {
      const g = groupLabel(r.lastSeenAt);
      if (g !== lastGroup) {
        rows.push(`<li class="run-list__grouphead js-run-group">${g}</li>`);
        lastGroup = g;
      }
      rows.push(managerRow(r));
    }
    const toolbar = listToolbar({
      search: { placeholder: "Search by name" },
      count: { n: sorted.length, noun: "1:1" },
    });
    root.innerHTML = shell(`
    <section class="l-stack l-stack--3">
      ${toolbar}
      <ul class="run-list run-list--card">
        ${rows.join("")}
        <li class="run-list__empty js-no-match" hidden>No 1:1s match that name.</li>
      </ul>
    </section>`);
    wire();
    wireSearch();
  };

  await load();
};

export const unmount: Unmount = () => {};
