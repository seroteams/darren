// The start screen WITHOUT the internal persona bench (frontend-admin-split
// Phase 3 / F-005). This is the whole dashboard — start buttons + recent
// sessions; the admin app's start.js composes the bench on top via the `bench`
// argument. The customer app imports THIS file directly, so no bench markup or
// persona code ever reaches the customer bundle.
import { STAGES, store, isInternalAdmin } from "../state.js";
import { listRecentRuns, getRunOverview, deleteRun } from "../../../shared/api.js";
import { confirmAction, alertAction } from "../ui/confirm.js";
import { stageLabel } from "../ui/stage-labels.js";
import { escapeHtml as escape } from "../ui/html.js";
import { formatDate } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { createSkeleton } from "../ui/skeleton.js";
import { staleRunRecoveryHtml } from "../ui/stale-run-recovery.ts";
import "../styles/ux-audit-fixes.css";
import { Check } from "lucide";

let keyHandler = null;

// bench (optional): { html, wire } — injected by the admin app's start.js only.
// The header keys on bench presence, NOT the user's role: with a bench, its
// "Continue to setup" covers starting fresh; without one, the plain start
// button shows (so an internal admin in the customer app still gets a way in).
export async function mount(root, { setState, rehydrateById }, bench = null) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Start a 1:1 prep session</h1>
        <div class="text-ink-dim">Resume a session or start a new one.</div>
        <div class="field__actions">
          ${bench
            ? `<button type="button" class="btn js-onepage">One-page run</button>`
            : `<button type="button" class="btn js-startnew">Start a new session</button>
               <button type="button" class="btn btn--ghost js-onepage">One-page run</button>`}
        </div>
      </header>

      ${bench ? bench.html : ""}

      <section class="space-y-2">
        <div class="eyebrow">Recent sessions</div>
        <ul class="js-runs space-y-2"></ul>
      </section>
    </div>
  `;

  const list = root.querySelector(".js-runs");

  let runs = [];
  let expandedId = null;

  function reviewChip(run) {
    if (run.reviewStatus === "complete") return ` <span class="run-row__review run-row__review--done" title="Reviewed">Reviewed ${icon(Check, { size: 16 })}</span>`;
    if (run.reviewStatus === "partial") return ` <span class="run-row__review run-row__review--partial" title="Review in progress">Review · partial</span>`;
    return "";
  }

  // Project-standard skeleton (ui/skeleton.js) — the same ghost cards the
  // "What we'll cover" focus screen shows while it loads. 3 cards ≈ the 3
  // recent sessions we fetch. Wrapped in an <li> so the <ul> stays valid.
  function renderSkeleton() {
    list.setAttribute("aria-busy", "true");
    const li = document.createElement("li");
    li.className = "run-skeleton";
    li.appendChild(createSkeleton(3));
    list.replaceChildren(li);
  }

  function render() {
    list.setAttribute("aria-busy", "false");
    if (runs.length === 0) {
      list.innerHTML = `<li class="text-ink-mute">No preps yet. Your first one takes about two minutes — tell Sero who the 1:1 is with and what's on your mind, and it writes you a focused brief. Press <kbd class="kbd">Enter</kbd> or click <strong>Start a new session</strong> to begin.</li>`;
      return;
    }
    list.innerHTML = runs.map((r) => {
      const isOpen = expandedId === r.id;
      return `
      <li class="run-row" data-id="${escape(r.id)}">
        <button class="run-row__head js-row" data-id="${escape(r.id)}" aria-expanded="${isOpen}">
          <span class="run-row__chevron" aria-hidden="true">${isOpen ? "▼" : "▶"}</span>
          <span class="run-row__headline">${escape(r.headline || r.id)}${reviewChip(r)}</span>
          <span class="run-row__meta text-ink-mute text-sm">${escape(formatRelativeTime(r.lastSeenAt))} · ${escape(stageLabel(r.stage))}</span>
        </button>
        <div class="run-row__body js-body" data-id="${escape(r.id)}" hidden></div>
      </li>
    `;
    }).join("");
  }

  async function load() {
    try {
      const res = await listRecentRuns(3);
      runs = res.runs || [];
    } catch (e) {
      runs = [];
      console.warn("[start] listRecentRuns failed:", e);
    }
    render();
  }

  async function toggle(id) {
    if (expandedId === id) {
      collapse(id);
      expandedId = null;
      render();
      return;
    }
    if (expandedId) collapse(expandedId);
    expandedId = id;
    render();
    const body = list.querySelector(`.js-body[data-id="${cssEscape(id)}"]`);
    if (!body) return;
    body.hidden = false;
    body.innerHTML = `<div class="text-ink-mute text-sm">Loading…</div>`;
    try {
      const o = await getRunOverview(id);
      const run = runs.find((x) => x.id === id);
      if (run) run.person = o.person || null; // remembered so a failed Resume can heal by name
      const finished = run?.stage === "BRIEFING";
      // A plain meeting overview for the manager — who it's with, the type, where
      // it's up to, and their own note. No engine/version wording (that's admin-only
      // plumbing a manager has no use for). Falls back to the headline for the rare
      // nameless run so the line never reads "1:1 with".
      const hasPerson = Boolean(o.person);
      const titleLine = hasPerson
        ? `1:1 with <strong>${escape(o.person)}</strong>${o.roleLine ? ` · ${escape(o.roleLine)}` : ""}`
        : `<strong>${escape(run?.headline || o.headline || id)}</strong>`;
      const typeLine = hasPerson && o.meetingType
        ? `<div class="run-row__type text-ink-dim text-sm">${escape(o.meetingType)}</div>`
        : "";
      const noteBlock = o.intakeNote
        ? `<div class="run-row__note text-sm"><span class="text-ink-mute">Your note:</span> “${escape(o.intakeNote)}”</div>`
        : "";
      body.innerHTML = `
        <div class="run-row__overview">
          <div class="run-row__who text-ink">${titleLine}</div>
          ${typeLine}
          <div class="run-row__where text-ink-dim text-sm">${escape(whereUpTo(o, finished))}</div>
          ${noteBlock}
        </div>
        <div class="run-row__actions">
          ${finished
            ? `<button class="btn js-review" data-id="${escape(id)}">Review</button>`
            : `<button class="btn js-resume" data-id="${escape(id)}">Resume</button>`}
          <button class="btn btn--ghost js-delete" data-id="${escape(id)}">Delete</button>
        </div>
      `;
    } catch {
      body.innerHTML = `<div class="text-ink-mute text-sm">Failed to load overview.</div>`;
    }
  }

  function collapse(id) {
    const body = list.querySelector(`.js-body[data-id="${cssEscape(id)}"]`);
    if (body) {
      body.hidden = true;
      body.innerHTML = "";
    }
  }

  async function resume(id) {
    const ok = await rehydrateById(id);
    if (ok) return;
    // The session is gone (expired/deleted server-side). Heal the row in place — no native
    // alert, no dead Resume button left behind — and offer the one useful move: start fresh
    // with the same person. (audit M3/X7)
    const run = runs.find((x) => x.id === id);
    const body = list.querySelector(`.js-body[data-id="${cssEscape(id)}"]`);
    if (!body) return;
    body.hidden = false;
    body.innerHTML = staleRunRecoveryHtml(run?.person || "");
    body.querySelector(".js-start-fresh")?.addEventListener("click", () => startFreshWith(run));
  }

  function startFreshWith(run) {
    store.scripted = null;
    Object.assign(store.ctx, emptyCtx());
    if (run?.person) store.ctx.name = run.person; // continuity: pre-seed the same person's name
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  }

  function review(id) {
    // A manager's "Review" opens the clean run detail (Overview / Briefing / Answers) — not
    // the raw QA verdict tool (engine hashes, Pass/Fail) which is internal-only now (audit
    // M4). Internal QA still gets the verdict page from their own Home.
    if (isInternalAdmin(store.user)) setState({ reviewRunId: id, stage: STAGES.REVIEW_RUN });
    else setState({ myRunId: id, stage: STAGES.RUN_DETAIL });
  }

  async function del(id) {
    const ok = await confirmAction({
      message: "Delete this session permanently? This cannot be undone.",
      confirmLabel: "Delete session",
      cancelLabel: "Keep session",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteRun(id);
    } catch (e) {
      await alertAction({ message: "Delete failed: " + (e.message || e) });
      return;
    }
    if (expandedId === id) expandedId = null;
    await load();
  }

  const emptyCtx = () => ({
    name: "",
    role: "",
    seniority: "",
    meetingType: "",
    meetingTypeIndex: null,
    notes: "",
  });

  function beginCleanSetup() {
    store.scripted = null;
    Object.assign(store.ctx, emptyCtx());
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  }

  function startNew() {
    beginCleanSetup();
  }

  function beginOnePage() {
    store.scripted = null;
    Object.assign(store.ctx, emptyCtx());
    setState({ sessionId: null, stage: STAGES.ONEPAGE });
  }

  root.querySelector(".js-onepage").addEventListener("click", beginOnePage);
  root.querySelector(".js-startnew")?.addEventListener("click", startNew);

  list.addEventListener("click", (e) => {
    const headBtn = e.target.closest(".js-row");
    if (headBtn) { toggle(headBtn.dataset.id); return; }
    const resumeBtn = e.target.closest(".js-resume");
    if (resumeBtn) { resume(resumeBtn.dataset.id); return; }
    const reviewBtn = e.target.closest(".js-review");
    if (reviewBtn) { review(reviewBtn.dataset.id); return; }
    const delBtn = e.target.closest(".js-delete");
    if (delBtn) { del(delBtn.dataset.id); return; }
  });

  keyHandler = (e) => {
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === "Enter") { e.preventDefault(); startNew(); return; }
    if (e.key === "Escape") {
      if (expandedId) { collapse(expandedId); expandedId = null; render(); }
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (runs[idx]) toggle(runs[idx].id);
      return;
    }
    if (!expandedId) return;
    if (e.key.toLowerCase() === "r") {
      const run = runs.find((x) => x.id === expandedId);
      if (run?.stage === "BRIEFING") review(expandedId);
      else resume(expandedId);
    }
    else if (e.key.toLowerCase() === "d") { del(expandedId); }
  };
  window.addEventListener("keydown", keyHandler);

  // Show skeleton rows immediately so the list isn't blank during the fetch;
  // load() → render() replaces them once the recent sessions arrive.
  renderSkeleton();

  // The bench (admin only) wires itself against the mounted DOM; it gets the
  // clean-setup helper so its "Continue to setup" matches the plain start button.
  await Promise.all([load(), bench ? bench.wire(root, { setState, beginCleanSetup }) : Promise.resolve()]);
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - Number(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  // Older than a week: the one date format everywhere (DESIGN.md rule 9).
  return formatDate(Number(ts));
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

// Plain "where this session is up to" line for the expanded card. Manager words —
// the existing human stage label plus question progress when it's reached Q&A.
function whereUpTo(o, finished) {
  if (finished) return "Briefing ready to review";
  let line = `Paused at ${stageLabel(o.stage)}`;
  if (o.progress && o.progress.total) {
    line += ` — ${o.progress.answered} of ${o.progress.total} questions answered`;
  }
  return line;
}
