// Runs — the member's own finished 1:1s (pre-go-live PG1). Wired to /api/v1/runs/mine,
// which is fenced server-side by company AND user, so a member only ever sees their own —
// never a colleague's or the admin's whole-company Library. Rows are read-only for now:
// re-opening a run is PG2, rating stars are PG3, and the "Past 1:1s" relabel is PG4.

import { STAGES, store } from "../state.js";
import { listMyRuns } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import type { Mount, Unmount } from "./stage.types.ts";

// The endpoint's real shape (backend/engine/run-history.ts memberRunView / listFinishedForMember).
type MyRun = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  lastSeenAt: number;
};

// Local one-use time-ago (mirrors compare.js) — four lines, so no shared util for one caller.
function relTime(ms: number): string {
  if (!ms) return "";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

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
  const header = `
    <header class="page-header">
      <h1 class="h1">Runs</h1>
      <div class="text-ink-dim text-sm">Your past prep sessions.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}</div>`;

  // The friendly empty state — unchanged from the placeholder, still offers Start a 1:1.
  const emptyCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">No runs yet</div>
      <p class="text-sm text-ink-dim">Your finished 1:1 preps will appear here. Start your first one and it'll show up in this list.</p>
      <button type="button" class="btn js-start">Start a 1:1</button>
    </section>`;

  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load your 1:1s</div>
      <p class="text-sm text-ink-dim">Something went wrong loading your list. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const startOneOnOne = () => {
    store.scripted = null;
    Object.assign(store.ctx, { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  };

  const wire = () => {
    root.querySelector(".js-start")?.addEventListener("click", startOneOnOne);
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    root.querySelectorAll<HTMLElement>(".js-open").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        if (id) setState({ myRunId: id, stage: STAGES.RUN_DETAIL });
      });
    });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading your 1:1s…</p></section>`);

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
      .map((r) => `<button type="button" class="card-flat runs-list__row js-open" data-id="${escapeHtml(r.id)}"><span class="text-sm">${rowLine(r)}</span></button>`)
      .join("");
    root.innerHTML = shell(`<section class="l-stack l-stack--2">${rows}</section>`);
    wire();
  };

  await load();
};

export const unmount: Unmount = () => {};
