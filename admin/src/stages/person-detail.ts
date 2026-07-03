// Person detail — one person's page: all the manager's own 1:1s with them, newest first
// (pre-go-live PG5, step 01). Composes the PG4 grouping (for the header summary) and the
// PG1 rows over the same /runs/mine payload — fenced server-side by company AND user, so
// only your own 1:1s ever appear. Rows are display-only here; opening a run and "Since
// last time" + "Prep next 1:1" land in the next steps.

import { STAGES, store } from "../state.js";
import { listMyRuns } from "../../../shared/api.js";
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

// Raw (unescaped) subtitle for textContent: "role · N meetings · last · avg".
function subtitleText(p: Person): string {
  const bits: string[] = [];
  if (p.role) bits.push(p.role);
  bits.push(`${p.count} meeting${p.count > 1 ? "s" : ""}`);
  const last = relTime(p.lastMet);
  if (last) bits.push(`last ${last}`);
  bits.push(p.avgStars != null ? `★ ${p.avgStars.toFixed(1)} avg (${p.ratedCount} rated)` : "not yet rated");
  return bits.join(" · ");
}

// One 1:1 with this person → "meeting · when" (the name is redundant on their own page).
function rowLine(r: MyRun): string {
  const bits: string[] = [];
  if (r.ctx?.meetingType) bits.push(r.ctx.meetingType);
  const when = relTime(r.lastSeenAt);
  if (when) bits.push(when);
  return escapeHtml(bits.length ? bits.join(" · ") : r.headline || "Untitled 1:1");
}

function runRow(r: MyRun): string {
  const badge = r.rating
    ? `<span class="runs-list__stars text-sm" aria-label="rated ${r.rating.stars} out of 5">★ ${r.rating.stars}</span>`
    : "";
  return `<div class="card-flat runs-list__row"><span class="text-sm">${rowLine(r)}</span>${badge}</div>`;
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
        <div class="text-ink-dim text-sm js-sub"></div>
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
  if (sub) sub.textContent = subtitleText(person);
  root.querySelector(".js-host")!.innerHTML =
    `<section class="l-stack l-stack--2">${mine.map(runRow).join("")}</section>`;
  wireBack();
};

export const unmount: Unmount = () => {};
