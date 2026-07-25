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
import { STAGES, store, isInternalAdmin } from "../state.ts";
import { listRecentRuns, deleteRun } from "../../../shared/api.js";
import { confirmAction, alertAction } from "../ui/confirm.js";
import { escapeHtml as escape } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { createSkeleton } from "../ui/skeleton.js";
import { errorCardHtml, wireRetry } from "../ui/screen-scaffold.ts";
import { staleRunRecoveryHtml } from "../ui/stale-run-recovery.ts";
import { firstRunIntroHtml } from "./intake-firstrun.ts";
import { rowModel, orderForHome } from "./start-rows.ts";
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

      <section class="js-firstrun" hidden></section>

      <section class="l-stack l-stack--2">
        <div class="eyebrow js-recent-label">Recent 1:1s</div>
        <div class="js-load-error" hidden></div>
        <ul class="run-list js-runs"></ul>
        <button type="button" class="start-seeall js-see-all" hidden>See all past 1:1s</button>
      </section>
    </div>
  `;

  const list = root.querySelector(".js-runs");
  const recentLabel = root.querySelector(".js-recent-label");
  const seeAll = root.querySelector(".js-see-all");
  const errorHost = root.querySelector(".js-load-error");
  const firstRunHost = root.querySelector(".js-firstrun");
  const lede = root.querySelector(".page-header__lede");
  const headerActions = root.querySelector(".page-header__actions");
  const startBtn = root.querySelector(".js-startnew");

  let runs = [];

  // "Pick up where you left off" is false for someone with nothing to pick up.
  const LEDE_RETURNING = "Pick up where you left off, or start a new one.";
  const LEDE_FIRST_RUN = "Type a few rough notes. Sero turns them into a brief for the conversation.";

  // The screen has exactly ONE blue button and it is the same DOM node in every state
  // (DESIGN rule 3, guarded by start-core.test.ts's source count). With nothing to show
  // it MOVES into the invitation card, so the card and the way in are one object; once
  // there are 1:1s it moves back to the header. Moving keeps its click wiring bound.
  //
  // On the admin app the bench owns the accent, so there is no button to move and the
  // card gets none. Correct: internal QA is not the first-run audience.
  function placeStartButton(intoCard) {
    if (!startBtn) return;
    const slot = intoCard ? firstRunHost.querySelector(".js-start-slot") : null;
    if (slot) {
      slot.appendChild(startBtn);
      startBtn.textContent = "Start your first 1:1";
    } else if (headerActions && startBtn.parentElement !== headerActions) {
      headerActions.appendChild(startBtn);
      startBtn.textContent = "Start a new 1:1";
    }
  }

  // Internal QA verdict vocabulary ("Reviewed" / "Review half-done" from review.json).
  // It means nothing to a manager and would sit next to the prep-status chip saying
  // something different, so the customer view never gets it.
  function reviewChip(run) {
    if (!isInternalAdmin(store.user)) return "";
    if (run.reviewStatus === "complete") return `<span class="run-row__review run-row__review--done" title="Reviewed">Reviewed ${icon(Check, { size: 16 })}</span>`;
    if (run.reviewStatus === "partial") return `<span class="run-row__review run-row__review--partial" title="Review in progress">Review half-done</span>`;
    return "";
  }

  // A prep left mid-flow is the one row a returning manager is looking for, and it
  // otherwise looks identical to a finished one. A finished row gets no chip:
  // absence already reads as normal and keeps the list quiet.
  function statusChip(model) {
    return model.status === "open" ? `<span class="run-list__status">Half done</span>` : "";
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

  // A failed fetch used to fall through to runs=[] and render the "First time?"
  // card, telling a returning manager they had never run a 1:1. Say what happened
  // instead, and offer the retry.
  function renderError() {
    list.setAttribute("aria-busy", "false");
    list.classList.remove("run-list--card");
    list.innerHTML = "";
    if (recentLabel) recentLabel.hidden = true;
    if (seeAll) seeAll.hidden = true;
    // We don't know what they have, so don't greet them as a newcomer. The button
    // goes back to the header where it always is for a returning manager.
    firstRunHost.hidden = true;
    firstRunHost.innerHTML = "";
    placeStartButton(false);
    if (lede) lede.textContent = LEDE_RETURNING;
    errorHost.hidden = false;
    errorHost.innerHTML = errorCardHtml({
      title: "Couldn't load your 1:1s",
      copyHtml: "Your 1:1s are safe. This looks like a connection problem.",
    });
    wireRetry(errorHost, () => {
      errorHost.hidden = true;
      renderSkeleton();
      void load();
    });
  }

  function render() {
    list.setAttribute("aria-busy", "false");
    errorHost.hidden = true;
    syncAccentBudget(false);
    // realRuns is what the manager actually did. It gains a `!isDemo` filter in Phase 3,
    // so the seeded example row shows WITH the invitation rather than replacing it.
    const realRuns = runs;
    // The card chrome only wraps real rows — the skeleton and the recovery card bring
    // their own surfaces (never nest cards). The invitation now sits OUTSIDE the list
    // entirely, so a card can't end up inside the list card.
    list.classList.toggle("run-list--card", runs.length > 0);
    if (seeAll) seeAll.hidden = runs.length === 0;

    // Zero real 1:1s: the "First time?" card IS the invitation, and it hosts the one
    // blue button. Anything else and the button goes back to the header.
    const firstRun = realRuns.length === 0;
    firstRunHost.hidden = !firstRun;
    if (firstRun) firstRunHost.innerHTML = firstRunIntroHtml({ actionSlot: true });
    else firstRunHost.innerHTML = "";
    placeStartButton(firstRun);
    if (lede) lede.textContent = firstRun ? LEDE_FIRST_RUN : LEDE_RETURNING;

    if (runs.length === 0) {
      if (recentLabel) recentLabel.hidden = true;
      list.innerHTML = "";
      return;
    }
    if (recentLabel) recentLabel.hidden = false;
    list.innerHTML = runs.map((r) => {
      // rowModel owns the copy contract: the name comes from ctx and NEVER falls back
      // to the raw headline, which is a "Name · Role · Seniority · MeetingType" blob
      // whose seniority slot has been seen holding an email address.
      const m = rowModel(r);
      return `
      <li class="run-list__item" data-id="${escape(r.id)}">
        <button type="button" class="run-list__row js-open" data-id="${escape(r.id)}">
          <span class="ds-avatar run-list__avatar" aria-hidden="true">${escape(initialOf(m.name))}</span>
          <span class="run-list__main">
            <span class="run-list__name">${escape(m.name)}${reviewChip(r)}</span>
            <span class="run-list__sub">${escape(m.sub)}</span>
          </span>
          <span class="run-list__side">${statusChip(m)}</span>
        </button>
        <button type="button" class="row-menu-btn js-row-more" data-id="${escape(r.id)}" aria-haspopup="menu" aria-label="More actions for this 1:1">${icon(MoreHorizontal, { size: 18 })}</button>
      </li>
    `;
    }).join("");
  }

  // Fetch 5, show 3. The hoist below lifts an unfinished prep to the top, and a
  // 3-row fetch can't reach one that has already slipped past the third slot —
  // which is the exact case the hoist exists for.
  async function load() {
    try {
      const res = await listRecentRuns(5);
      runs = orderForHome(res.runs || [], 3);
    } catch (e) {
      runs = [];
      console.warn("[start] listRecentRuns failed:", e);
      renderError();
      return;
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
    // Only ever ONE recovery card on screen. Clicking a second dead row used to heal that
    // one too, so a manager whose preps had all aged past the 7-day session TTL ended up
    // with three identical cards and three blue buttons, no rows left, and no way back
    // short of a reload. Re-render first: the previously healed row returns to being a row.
    render();
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

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
