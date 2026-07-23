// The start screen WITHOUT the internal persona bench (frontend-admin-split
// Phase 3 / F-005). This is the whole dashboard — start button + recent
// sessions; the admin app's start.js composes the bench on top via the `bench`
// argument. The customer app imports THIS file directly, so no bench markup or
// persona code ever reaches the customer bundle.
//
// Design-consolidation Phase 1 (audit M1 + M2): the recents accordion is gone.
// Recent 1:1s are rich rows in one card — avatar initial, bold name, quiet
// "type · time" line — and a row click opens the run directly (finished →
// review, unfinished → resume, the same primary the accordion offered). A quiet
// "See all past 1:1s" link routes to the RUNS stage. One clean stack at the
// medium container width.
import { STAGES, store, isInternalAdmin } from "../state.js";
import { listRecentRuns, deleteRun } from "../../../shared/api.js";
import { confirmAction, alertAction } from "../ui/confirm.js";
import { escapeHtml as escape } from "../ui/html.js";
import { formatDate } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { createSkeleton } from "../ui/skeleton.js";
import { staleRunRecoveryHtml } from "../ui/stale-run-recovery.ts";
import { firstRunIntroHtml } from "./intake-firstrun.ts";
import { openRowMenu } from "../ui/row-menu.ts";
import { pageHeader } from "../ui/page-header.ts";
import "../styles/ux-audit-fixes.css";
import { Check, MoreHorizontal } from "lucide";

let keyHandler = null;

// bench (optional): { html, wire } — injected by the admin app's start.js only.
// The header keys on bench presence, NOT the user's role: with a bench, its
// "Continue to setup" covers starting fresh (and the bench's own start button is
// the screen's accent); without one, the plain start button is the header's one
// accent action (so an internal admin in the customer app still gets a way in).
export async function mount(root, { setState, rehydrateById }, bench = null) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      ${pageHeader({
        eyebrow: "Work",
        title: "Prep a 1:1",
        lede: "Pick up where you left off, or start a new one.",
        actionsHtml: bench ? "" : `<button type="button" class="btn js-startnew">Start a new 1:1</button>`,
      })}

      ${bench ? bench.html : ""}

      <section class="l-stack l-stack--2">
        <div class="eyebrow js-recent-label">Recent 1:1s</div>
        <ul class="run-list js-runs"></ul>
        <button type="button" class="start-seeall js-see-all" hidden>See all past 1:1s</button>
      </section>
    </div>
  `;

  const list = root.querySelector(".js-runs");
  const recentLabel = root.querySelector(".js-recent-label");
  const seeAll = root.querySelector(".js-see-all");

  let runs = [];

  function reviewChip(run) {
    if (run.reviewStatus === "complete") return `<span class="run-row__review run-row__review--done" title="Reviewed">Reviewed ${icon(Check, { size: 16 })}</span>`;
    if (run.reviewStatus === "partial") return `<span class="run-row__review run-row__review--partial" title="Review in progress">Review half-done</span>`;
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

  // Accent budget (audit M6): while a recovery card's "Start fresh" is on screen it is
  // the one blue action — the header's "Start a new 1:1" steps back to ghost meanwhile.
  function syncAccentBudget(recoveryShown) {
    root.querySelector(".js-startnew")?.classList.toggle("btn--ghost", Boolean(recoveryShown));
  }

  function render() {
    list.setAttribute("aria-busy", "false");
    syncAccentBudget(false);
    // The card chrome only wraps real rows — the zero-run welcome and the
    // skeleton bring their own surfaces (never nest cards).
    list.classList.toggle("run-list--card", runs.length > 0);
    if (seeAll) seeAll.hidden = runs.length === 0;
    if (runs.length === 0) {
      // Zero-run account: greet them with the first-run orientation card (its own
      // "First time?" eyebrow), not a bare empty line. Hide the "Recent 1:1s" label
      // since there are none yet. The card carries its own hint to press Enter / Start.
      if (recentLabel) recentLabel.hidden = true;
      list.innerHTML = `<li class="start-firstrun-cell">${firstRunIntroHtml()}</li>`;
      return;
    }
    if (recentLabel) recentLabel.hidden = false;
    list.innerHTML = runs.map((r) => {
      const name = (r.ctx && r.ctx.name) || r.headline || r.id;
      const sub = [r.ctx?.meetingType, formatRelativeTime(r.lastSeenAt)].filter(Boolean).join(" · ");
      return `
      <li class="run-list__item" data-id="${escape(r.id)}">
        <button type="button" class="run-list__row js-open" data-id="${escape(r.id)}">
          <span class="ds-avatar run-list__avatar" aria-hidden="true">${escape(initialOf(name))}</span>
          <span class="run-list__main">
            <span class="run-list__name">${escape(name)}${reviewChip(r)}</span>
            <span class="run-list__sub">${escape(sub)}</span>
          </span>
        </button>
        <button type="button" class="row-menu-btn js-row-more" data-id="${escape(r.id)}" aria-haspopup="menu" aria-label="More actions for this 1:1">${icon(MoreHorizontal, { size: 18 })}</button>
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

  // A row click opens the run directly with the primary the old accordion
  // offered: a finished run opens its review, anything else resumes.
  function openRun(id) {
    const run = runs.find((x) => x.id === id);
    if (run && run.stage === "BRIEFING") review(id);
    else resume(id);
  }

  async function resume(id) {
    const ok = await rehydrateById(id);
    if (ok) return;
    // The session is gone (expired/deleted server-side). Heal the row in place — no native
    // alert, no dead row left behind — and offer the one useful move: start fresh
    // with the same person. (audit M3/X7)
    const run = runs.find((x) => x.id === id);
    const item = list.querySelector(`.run-list__item[data-id="${cssEscape(id)}"]`);
    if (!item) return;
    item.innerHTML = staleRunRecoveryHtml(run?.ctx?.name || "");
    item.querySelector(".js-start-fresh")?.addEventListener("click", () => startFreshWith(run));
    syncAccentBudget(true);
  }

  function startFreshWith(run) {
    store.scripted = null;
    Object.assign(store.ctx, emptyCtx());
    if (run?.ctx?.name) store.ctx.name = run.ctx.name; // continuity: pre-seed the same person's name
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
      message: "Delete this 1:1 permanently? This cannot be undone.",
      confirmLabel: "Delete 1:1",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteRun(id);
    } catch (e) {
      await alertAction({ message: "Couldn't delete this 1:1. Please try again." });
      return;
    }
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

  root.querySelector(".js-startnew")?.addEventListener("click", startNew);
  seeAll?.addEventListener("click", () => setState({ stage: STAGES.RUNS }));

  list.addEventListener("click", (e) => {
    // Delete lives in the ⋯ menu (audit M6) — it still asks first.
    const moreBtn = e.target.closest(".js-row-more");
    if (moreBtn) {
      e.stopPropagation();
      const id = moreBtn.dataset.id;
      openRowMenu(moreBtn, [{ label: "Delete 1:1", danger: true, onSelect: () => { void del(id); } }]);
      return;
    }
    const openBtn = e.target.closest(".js-open");
    if (openBtn) openRun(openBtn.dataset.id);
  });

  // Invisible shortcuts: Enter starts a new 1:1; 1-9 open a recent row directly
  // (the same primary action as clicking it). The accordion-only keys are gone.
  keyHandler = (e) => {
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === "Enter") { e.preventDefault(); startNew(); return; }
    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (runs[idx]) openRun(runs[idx].id);
    }
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

// First letter of the name (falls back to "?") — the glyph in the avatar circle,
// mirroring ui/recap-header.ts.
function initialOf(name) {
  const s = String(name || "").trim();
  return s ? s[0].toUpperCase() : "?";
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
