// Lexicon review — the end-of-run "anything worth keeping?" screen, in the admin
// costume (P6 D4): two tabs (this session's candidates / phrases waiting to go
// live), per-row Keep/Drop, checkbox bulk actions, and partial save (only what's
// marked is submitted; undecided rows simply stay for next time). Same API calls
// and flow as before; rows render at once (no reveal stagger).
import { STAGES, resetSession } from "../state.js";
import {
  getLexiconCandidates,
  submitLexiconDecisions,
  getLexiconPromotePending,
  submitLexiconPromote,
} from "../../../shared/api.js";
import { escapeCopy as escape, escapeHtml } from "../ui/html.js";
import { createSkeleton } from "../ui/skeleton.js";
import "../styles/lexicon-review.css";

export async function mount(root, { store, setState }) {
  const sessionId = store.sessionId;

  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Coaching phrases</div>
        <h1 class="h1 js-stage-title">Anything worth keeping?</h1>
        <div class="text-ink-dim max-w-measure js-stage-lede">
          Terms worth saving from this conversation for future runs. Keep adds it; drop removes it.
        </div>
      </header>
      <div class="js-tabs"></div>
      <div class="thinking-host min-h-[60px]"></div>
      <div class="result-host"></div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  thinkingHost.replaceChildren(createSkeleton(3)); // standard ghost cards while candidates load
  const resultHost = root.querySelector(".result-host");
  const tabsHost = root.querySelector(".js-tabs");
  const titleEl = root.querySelector(".js-stage-title");
  const ledeEl = root.querySelector(".js-stage-lede");

  let candidates = [];
  let skipped = null;
  let promotePending = [];

  if (sessionId) {
    try {
      const [candData, promoteData] = await Promise.all([
        getLexiconCandidates(sessionId),
        getLexiconPromotePending().catch(() => ({ items: [] })),
      ]);
      candidates = Array.isArray(candData?.candidates) ? candData.candidates : [];
      skipped = candData?.skipped || null;
      promotePending = Array.isArray(promoteData?.items) ? promoteData.items : [];
    } catch (e) {
      console.warn("[lexicon-review] failed to load candidates:", e);
      skipped = "reviewer-failed";
    }
  } else {
    // Standalone entry (opened from the top nav, no active session): the per-run
    // candidate pile doesn't apply, so only the live-phrases tab exists.
    try {
      const promoteData = await getLexiconPromotePending().catch(() => ({ items: [] }));
      promotePending = Array.isArray(promoteData?.items) ? promoteData.items : [];
    } catch (e) {
      console.warn("[lexicon-review] standalone promote-pending failed:", e);
    }
  }

  thinkingHost.remove();

  // Decisions survive tab hops; each map holds only what's been marked.
  const sessionDecisions = new Map();
  const promoteDecisions = new Map();
  let tab = sessionId ? "session" : "live";

  function finish() {
    resetSession();
    setState({ stage: STAGES.START });
  }

  function renderTabs() {
    if (!sessionId) {
      tabsHost.innerHTML = "";
      return;
    }
    tabsHost.innerHTML = `
      <div class="seg" role="tablist" aria-label="Lexicon sections">
        <button type="button" role="tab" class="seg__btn js-tab" data-tab="session"
          aria-selected="${tab === "session"}">This session</button>
        <button type="button" role="tab" class="seg__btn js-tab" data-tab="live"
          aria-selected="${tab === "live"}">Live phrases (${promotePending.length})</button>
      </div>`;
    tabsHost.querySelectorAll(".js-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.tab === tab) return;
        tab = btn.dataset.tab;
        render();
      });
    });
  }

  function rowHtml({ id, num, topLabel, phrase, context, yesLabel, yesAct }) {
    return `
      <div class="lex-row lex-row--pick" data-id="${escapeHtml(id)}">
        <label class="lex-row__pick"><input type="checkbox" class="js-pick" aria-label="Select phrase"></label>
        <div class="lex-row__num">${num}</div>
        <div class="lex-row__body">
          ${topLabel ? `<div class="text-ink-mute text-xs mb-1">${escape(topLabel)}</div>` : ""}
          <div class="lex-row__phrase">${escape(phrase)}</div>
          ${context ? `<div class="lex-row__context text-ink-dim text-sm">${escape(context)}</div>` : ""}
        </div>
        <div class="lex-row__actions">
          <button type="button" class="btn btn--sm ${yesAct}" data-id="${escapeHtml(id)}">${escape(yesLabel)}</button>
          <button type="button" class="btn btn--sm btn--ghost js-row-no" data-id="${escapeHtml(id)}">Drop</button>
        </div>
      </div>`;
  }

  function toolbarHtml(yesLabel) {
    return `
      <div class="lex-toolbar">
        <label class="lex-selectall"><input type="checkbox" class="js-select-all"> Select all</label>
        <div class="lex-toolbar__bulk">
          <button type="button" class="btn btn--ghost btn--sm js-bulk-yes" disabled>${escape(yesLabel)} selected</button>
          <button type="button" class="btn btn--ghost btn--sm js-bulk-no" disabled>Drop selected</button>
        </div>
      </div>`;
  }

  // Wires rows + checkboxes + bulk buttons for whichever list is on screen.
  function wireList({ decisions, keepClass, yesSelector, onChange }) {
    const rows = Array.from(resultHost.querySelectorAll(".lex-row"));
    const picks = Array.from(resultHost.querySelectorAll(".js-pick"));
    const selectAll = resultHost.querySelector(".js-select-all");
    const bulkYes = resultHost.querySelector(".js-bulk-yes");
    const bulkNo = resultHost.querySelector(".js-bulk-no");

    function mark(id, keep, row) {
      decisions.set(id, keep);
      row.classList.toggle(keepClass, keep);
      row.classList.toggle("lex-row--drop", !keep);
      onChange();
    }
    function pickedRows() {
      return rows.filter((r) => r.querySelector(".js-pick").checked);
    }
    function syncBulk() {
      const any = picks.some((p) => p.checked);
      if (bulkYes) bulkYes.disabled = !any;
      if (bulkNo) bulkNo.disabled = !any;
      if (selectAll) selectAll.checked = picks.length > 0 && picks.every((p) => p.checked);
    }

    resultHost.querySelectorAll(yesSelector).forEach((btn) => {
      btn.addEventListener("click", () => mark(btn.dataset.id, true, btn.closest(".lex-row")));
    });
    resultHost.querySelectorAll(".js-row-no").forEach((btn) => {
      btn.addEventListener("click", () => mark(btn.dataset.id, false, btn.closest(".lex-row")));
    });
    picks.forEach((p) => p.addEventListener("change", syncBulk));
    if (selectAll) {
      selectAll.addEventListener("change", () => {
        picks.forEach((p) => { p.checked = selectAll.checked; });
        syncBulk();
      });
    }
    if (bulkYes) bulkYes.addEventListener("click", () => {
      pickedRows().forEach((row) => mark(row.dataset.id, true, row));
    });
    if (bulkNo) bulkNo.addEventListener("click", () => {
      pickedRows().forEach((row) => mark(row.dataset.id, false, row));
    });
    syncBulk();
  }

  // Restore marked/dropped classes after a re-render (tab hop back).
  function paintDecisions(decisions, keepClass) {
    resultHost.querySelectorAll(".lex-row").forEach((row) => {
      if (!decisions.has(row.dataset.id)) return;
      const keep = decisions.get(row.dataset.id);
      row.classList.toggle(keepClass, keep);
      row.classList.toggle("lex-row--drop", !keep);
    });
  }

  function renderSessionPanel() {
    titleEl.textContent = "Anything worth keeping?";
    ledeEl.textContent =
      "Terms worth saving from this conversation for future runs. Keep adds it; drop removes it. Only what you mark is saved.";

    if (!candidates.length) {
      const emptyCopy =
        skipped === "reviewer-failed"
          ? "The lexicon review didn't finish. You can continue without saving phrases."
          : skipped === "empty" || skipped === null
            ? "Nothing strong enough to suggest this time. Shorter or shallow sessions often produce no candidates. That's normal."
            : "No lexicon candidates from this run.";
      resultHost.innerHTML = `
        <div class="card">
          <div class="text-ink-dim">${escape(emptyCopy)}</div>
        </div>
        <div class="l-cluster l-cluster--2 pt-6">
          <button type="button" class="btn js-done">Continue</button>
        </div>
      `;
      resultHost.querySelector(".js-done").addEventListener("click", finish);
      return;
    }

    resultHost.innerHTML = `
      <div class="card l-stack l-stack--3">
        ${toolbarHtml("Keep")}
        <div>
          ${candidates.map((c, i) => rowHtml({
            id: c.id,
            num: i + 1,
            phrase: c.phrase || c.label || "",
            context: c.context,
            yesLabel: "Keep",
            yesAct: "js-row-yes",
          })).join("")}
        </div>
      </div>
      <div class="l-cluster l-cluster--2 pt-6">
        <button type="button" class="btn js-done">Save &amp; continue</button>
      </div>
      <span class="text-ink-mute text-sm js-progress"></span>
    `;

    const doneBtn = resultHost.querySelector(".js-done");
    const progress = resultHost.querySelector(".js-progress");
    const syncProgress = () => {
      progress.textContent = `${sessionDecisions.size} of ${candidates.length} decided`;
    };

    paintDecisions(sessionDecisions, "lex-row--keep");
    wireList({
      decisions: sessionDecisions,
      keepClass: "lex-row--keep",
      yesSelector: ".js-row-yes",
      onChange: syncProgress,
    });
    syncProgress();

    doneBtn.addEventListener("click", async () => {
      doneBtn.disabled = true;
      try {
        if (sessionDecisions.size > 0) {
          await submitLexiconDecisions(
            sessionId,
            Array.from(sessionDecisions, ([id, keep]) => ({ id, keep }))
          );
        }
        try {
          const promoteData = await getLexiconPromotePending();
          promotePending = Array.isArray(promoteData?.items) ? promoteData.items : [];
        } catch {}
        if (promotePending.length > 0) {
          tab = "live";
          render();
          return;
        }
      } catch (e) {
        console.warn("[lexicon-review] submit failed:", e);
      }
      finish();
    });
  }

  function renderPromotePanel() {
    titleEl.textContent = "Add to live phrases";
    ledeEl.textContent =
      "These phrases are saved from past sessions but not yet in the live set future runs pull from. Add moves them into the live set; drop removes them. Only what you mark is applied.";

    if (!promotePending.length) {
      resultHost.innerHTML = `
        <div class="card">
          <div class="text-ink-dim">Nothing waiting to promote right now.</div>
        </div>
        <div class="l-cluster l-cluster--2 pt-6">
          <button type="button" class="btn js-done">Continue</button>
        </div>
      `;
      resultHost.querySelector(".js-done").addEventListener("click", finish);
      return;
    }

    resultHost.innerHTML = `
      <div class="card l-stack l-stack--3">
        ${toolbarHtml("Promote")}
        <div>
          ${promotePending.map((item, i) => rowHtml({
            id: item.id,
            num: i + 1,
            topLabel: item.scopeLabel || "",
            phrase: item.phrase || "",
            context: item.context,
            yesLabel: "Promote",
            yesAct: "js-row-yes",
          })).join("")}
        </div>
      </div>
      <div class="l-cluster l-cluster--2 pt-6">
        <button type="button" class="btn js-apply" disabled>Apply promotions</button>
        <button type="button" class="btn btn--ghost js-skip">Finish without applying</button>
      </div>
      <span class="text-ink-mute text-sm js-progress"></span>
    `;

    const applyBtn = resultHost.querySelector(".js-apply");
    const progress = resultHost.querySelector(".js-progress");
    const syncProgress = () => {
      progress.textContent = `${promoteDecisions.size} of ${promotePending.length} decided`;
      applyBtn.disabled = promoteDecisions.size === 0;
    };

    paintDecisions(promoteDecisions, "lex-row--promote");
    wireList({
      decisions: promoteDecisions,
      keepClass: "lex-row--promote",
      yesSelector: ".js-row-yes",
      onChange: syncProgress,
    });
    syncProgress();

    resultHost.querySelector(".js-skip").addEventListener("click", finish);

    applyBtn.addEventListener("click", async () => {
      applyBtn.disabled = true;
      try {
        const result = await submitLexiconPromote(
          Array.from(promoteDecisions, ([id, keep]) => ({ id, keep }))
        );
        const promoted = result.promoted || 0;
        const dropped = result.dropped || 0;
        const skippedCount = result.skipped || 0;

        if (promoted + dropped === 0) {
          // Every decision was skipped — the phrases were already saved or the
          // list went stale since it loaded. Don't claim success.
          tabsHost.innerHTML = "";
          titleEl.textContent = "Nothing to apply";
          ledeEl.textContent = "These phrases were already saved, or the list changed since you opened it.";
          resultHost.innerHTML = `
            <div class="card">
              <div class="text-ink-dim">No changes were made to the live lexicon. Reload to see what's still waiting.</div>
            </div>
            <div class="l-cluster l-cluster--2 pt-6">
              <button type="button" class="btn js-done">Done</button>
            </div>
          `;
          resultHost.querySelector(".js-done").addEventListener("click", finish);
          return;
        }

        promotePending = [];
        promoteDecisions.clear();
        tabsHost.innerHTML = "";
        titleEl.textContent = "Promotions applied";
        const skipNote = skippedCount > 0 ? ` ${skippedCount} couldn't be applied.` : "";
        ledeEl.textContent = `Promoted ${promoted}, dropped ${dropped}.${skipNote}`;
        resultHost.innerHTML = `
          <div class="card">
            <div class="text-ink-dim">Live lexicon updated. Future 1:1s can pull these phrases.</div>
          </div>
          <div class="l-cluster l-cluster--2 pt-6">
            <button type="button" class="btn js-done">Continue</button>
          </div>
        `;
        resultHost.querySelector(".js-done").addEventListener("click", finish);
      } catch (e) {
        console.warn("[lexicon-review] promote failed:", e);
        applyBtn.disabled = false;
        progress.textContent = "Promotion failed. Try again.";
      }
    });
  }

  function render() {
    renderTabs();
    if (tab === "session") renderSessionPanel();
    else renderPromotePanel();
  }

  render();
}

export function unmount() {}
