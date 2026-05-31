import { STAGES, resetSession } from "../state.js";
import {
  getLexiconCandidates,
  submitLexiconDecisions,
  getLexiconPromotePending,
  submitLexiconPromote,
} from "../api.js";
import { revealSequence } from "../ui/reveal.js";

export async function mount(root, { store, setState }) {
  const sessionId = store.sessionId;

  root.innerHTML = `
    <div class="stage-inner space-y-8">
      <header class="space-y-1">
        <div class="eyebrow">Lexicon</div>
        <h1 class="h1 js-stage-title">Anything worth keeping?</h1>
        <div class="text-ink-dim text-sm max-w-measure js-stage-lede">
          Phrases and patterns from this 1:1 that might be worth adding to your lexicon. Yes keeps it, no drops it.
        </div>
      </header>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading candidates,</div>
      <div class="result-host"></div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");
  const titleEl = root.querySelector(".js-stage-title");
  const ledeEl = root.querySelector(".js-stage-lede");

  let candidates = [];
  let skipped = null;
  let promotePending = [];

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

  thinkingHost.remove();

  function finish() {
    try { localStorage.removeItem("seroSessionId"); } catch {}
    resetSession();
    setState({ stage: STAGES.INTAKE, substage: "NAME" });
  }

  function footerHtml({ showPromote, promoteCount, doneDisabled = false, doneLabel = "Continue" }) {
    const promoteBtn =
      showPromote && promoteCount > 0
        ? `<button type="button" class="btn btn--ghost js-promote">Promote to live lexicon (${promoteCount})</button>`
        : "";
    return `
      <div class="flex flex-wrap gap-2 pt-6 reveal">
        <button type="button" class="btn js-done"${doneDisabled ? " disabled" : ""}>${escape(doneLabel)}</button>
        ${promoteBtn}
      </div>
    `;
  }

  function wireFooter({ onDone, onPromote, doneDisabled = false }) {
    const doneBtn = resultHost.querySelector(".js-done");
    if (doneBtn) {
      doneBtn.addEventListener("click", onDone);
      if (doneDisabled) doneBtn.disabled = true;
    }
    const promoteBtn = resultHost.querySelector(".js-promote");
    if (promoteBtn && onPromote) promoteBtn.addEventListener("click", onPromote);
  }

  function renderPromotePanel() {
    titleEl.textContent = "Promote to live lexicon";
    ledeEl.textContent =
      "These phrases are in your candidate pile but not yet in the live lexicon questions pull from. Promote moves them into the canonical file; drop removes them from candidates.";

    if (!promotePending.length) {
      resultHost.innerHTML = `
        <div class="card reveal">
          <div class="text-ink-dim">Nothing waiting to promote right now.</div>
        </div>
        ${footerHtml({ showPromote: false })}
      `;
      wireFooter({ onDone: finish });
      revealSequence(Array.from(resultHost.querySelectorAll(".reveal")), { stagger: 60, initialDelay: 60 });
      return;
    }

    const decisions = new Map();
    resultHost.innerHTML = `
      <div class="card reveal">
        ${promotePending.map((item, i) => `
          <div class="lex-row" data-id="${escape(item.id)}">
            <div class="lex-row__num">${i + 1}</div>
            <div class="lex-row__body">
              <div class="text-ink-mute text-xs mb-1">${escape(item.scopeLabel || "")}</div>
              <div class="lex-row__phrase">${escape(item.phrase || "")}</div>
              ${item.context ? `<div class="lex-row__context text-ink-dim text-sm">${escape(item.context)}</div>` : ""}
            </div>
            <div class="lex-row__actions">
              <button type="button" class="btn btn--sm js-promote-yes" data-id="${escape(item.id)}">Promote</button>
              <button type="button" class="btn btn--sm btn--ghost js-promote-no" data-id="${escape(item.id)}">Drop</button>
            </div>
          </div>
        `).join("")}
      </div>
      ${footerHtml({ showPromote: false, doneDisabled: true, doneLabel: "Apply promotions" })}
      <span class="text-ink-mute text-sm js-progress reveal"></span>
    `;

    const doneBtn = resultHost.querySelector(".js-done");
    const progress = resultHost.querySelector(".js-progress");

    function syncProgress() {
      progress.textContent = `${decisions.size} of ${promotePending.length} decided`;
      doneBtn.disabled = decisions.size < promotePending.length;
    }
    syncProgress();

    function mark(id, keep, row) {
      decisions.set(id, keep);
      row.classList.toggle("lex-row--promote", keep);
      row.classList.toggle("lex-row--drop", !keep);
      syncProgress();
    }

    resultHost.querySelectorAll(".js-promote-yes").forEach((btn) => {
      btn.addEventListener("click", () => mark(btn.dataset.id, true, btn.closest(".lex-row")));
    });
    resultHost.querySelectorAll(".js-promote-no").forEach((btn) => {
      btn.addEventListener("click", () => mark(btn.dataset.id, false, btn.closest(".lex-row")));
    });

    doneBtn.addEventListener("click", async () => {
      doneBtn.disabled = true;
      try {
        const result = await submitLexiconPromote(
          Array.from(decisions, ([id, keep]) => ({ id, keep }))
        );
        promotePending = [];
        titleEl.textContent = "Promotions applied";
        ledeEl.textContent = `Promoted ${result.promoted || 0}, dropped ${result.dropped || 0}.`;
        resultHost.innerHTML = `
          <div class="card reveal">
            <div class="text-ink-dim">Live lexicon updated. Future 1:1s can pull these phrases.</div>
          </div>
          ${footerHtml({ showPromote: false })}
        `;
        wireFooter({ onDone: finish });
        revealSequence(Array.from(resultHost.querySelectorAll(".reveal")), { stagger: 60, initialDelay: 60 });
      } catch (e) {
        console.warn("[lexicon-review] promote failed:", e);
        doneBtn.disabled = false;
        progress.textContent = "Promotion failed — try again.";
      }
    });

    revealSequence(Array.from(resultHost.querySelectorAll(".reveal")), { stagger: 60, initialDelay: 60 });
  }

  function openPromote() {
    renderPromotePanel();
  }

  if (!candidates.length) {
    const emptyCopy =
      skipped === "reviewer-failed"
        ? "The lexicon review didn't finish — you can continue without saving phrases."
        : skipped === "empty" || skipped === null
          ? "Nothing strong enough to suggest this time. Shorter or shallow sessions often produce no candidates — that's normal."
          : "No lexicon candidates from this run.";
    resultHost.innerHTML = `
      <div class="card reveal">
        <div class="text-ink-dim">${escape(emptyCopy)}</div>
      </div>
      ${footerHtml({ showPromote: true, promoteCount: promotePending.length })}
    `;
    wireFooter({ onDone: finish, onPromote: openPromote });
  } else {
    const decisions = new Map();
    resultHost.innerHTML = `
      <div class="card reveal">
        ${candidates.map((c, i) => `
          <div class="lex-row" data-id="${escape(c.id)}">
            <div class="lex-row__num">${i + 1}</div>
            <div class="lex-row__body">
              <div class="lex-row__phrase">${escape(c.phrase || c.label || "")}</div>
              ${c.context ? `<div class="lex-row__context text-ink-dim text-sm">${escape(c.context)}</div>` : ""}
            </div>
            <div class="lex-row__actions">
              <button type="button" class="btn btn--sm js-lex-yes" data-id="${escape(c.id)}">Keep</button>
              <button type="button" class="btn btn--sm btn--ghost js-lex-no" data-id="${escape(c.id)}">Drop</button>
            </div>
          </div>
        `).join("")}
      </div>
      ${footerHtml({ showPromote: true, promoteCount: promotePending.length, doneDisabled: true })}
      <span class="text-ink-mute text-sm js-progress reveal"></span>
    `;

    const doneBtn = resultHost.querySelector(".js-done");
    const progress = resultHost.querySelector(".js-progress");

    function syncProgress() {
      progress.textContent = `${decisions.size} of ${candidates.length} decided`;
      doneBtn.disabled = decisions.size < candidates.length;
    }
    syncProgress();

    function mark(id, keep, row) {
      decisions.set(id, keep);
      row.classList.toggle("lex-row--keep", keep);
      row.classList.toggle("lex-row--drop", !keep);
      syncProgress();
    }

    resultHost.querySelectorAll(".js-lex-yes").forEach((btn) => {
      btn.addEventListener("click", () => mark(btn.dataset.id, true, btn.closest(".lex-row")));
    });
    resultHost.querySelectorAll(".js-lex-no").forEach((btn) => {
      btn.addEventListener("click", () => mark(btn.dataset.id, false, btn.closest(".lex-row")));
    });

    doneBtn.addEventListener("click", async () => {
      doneBtn.disabled = true;
      try {
        await submitLexiconDecisions(sessionId, Array.from(decisions, ([id, keep]) => ({ id, keep })));
        try {
          const promoteData = await getLexiconPromotePending();
          promotePending = Array.isArray(promoteData?.items) ? promoteData.items : [];
        } catch {}
        if (promotePending.length > 0) {
          openPromote();
          return;
        }
      } catch (e) {
        console.warn("[lexicon-review] submit failed:", e);
      }
      finish();
    });

    wireFooter({ onDone: null, onPromote: openPromote });
  }

  const reveals = Array.from(resultHost.querySelectorAll(".reveal"));
  revealSequence(reveals, { stagger: 60, initialDelay: 60 });
}

export function unmount() {}

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
