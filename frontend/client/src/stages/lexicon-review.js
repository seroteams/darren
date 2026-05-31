import { STAGES, resetSession } from "../state.js";
import { getLexiconCandidates, submitLexiconDecisions } from "../api.js";
import { revealSequence } from "../ui/reveal.js";

export async function mount(root, { store, setState }) {
  const sessionId = store.sessionId;

  root.innerHTML = `
    <div class="stage-inner space-y-8">
      <header class="space-y-1">
        <div class="eyebrow">Lexicon</div>
        <h1 class="h1">Anything worth keeping?</h1>
        <div class="text-ink-dim text-sm max-w-measure">
          Phrases and patterns from this 1:1 that might be worth adding to your lexicon. Yes keeps it, no drops it.
        </div>
      </header>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading candidates,</div>
      <div class="result-host"></div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  let candidates = [];
  let skipped = null;
  try {
    const data = await getLexiconCandidates(sessionId);
    candidates = Array.isArray(data?.candidates) ? data.candidates : [];
    skipped = data?.skipped || null;
  } catch (e) {
    console.warn("[lexicon-review] failed to load candidates:", e);
    skipped = "reviewer-failed";
  }

  thinkingHost.remove();

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
      <div class="flex gap-2 pt-6 reveal">
        <button class="btn js-done">Continue</button>
      </div>
    `;
    resultHost.querySelector(".js-done").addEventListener("click", finish);
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
      <div class="flex gap-2 pt-6 reveal">
        <button class="btn js-done" disabled>Continue</button>
        <span class="text-ink-mute text-sm js-progress"></span>
      </div>
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
      row.classList.remove("is-keep", "is-drop");
      row.classList.add(keep ? "is-keep" : "is-drop");
      syncProgress();
    }

    resultHost.querySelectorAll(".js-lex-yes").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".lex-row");
        mark(btn.dataset.id, true, row);
      });
    });
    resultHost.querySelectorAll(".js-lex-no").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest(".lex-row");
        mark(btn.dataset.id, false, row);
      });
    });

    doneBtn.addEventListener("click", async () => {
      doneBtn.disabled = true;
      try {
        await submitLexiconDecisions(sessionId, Array.from(decisions, ([id, keep]) => ({ id, keep })));
      } catch (e) {
        console.warn("[lexicon-review] submit failed:", e);
      }
      finish();
    });
  }

  function finish() {
    try { localStorage.removeItem("seroSessionId"); } catch {}
    resetSession();
    setState({ stage: STAGES.INTAKE, substage: "NAME" });
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
