import { STAGES } from "../state.js";
import { getQuestion, submitAnswer, suggestAnswers, setAgendaCovered } from "../api.js";
import { createOrb } from "../ui/orb.js";
import { createAxesPanel, AXIS_ORDER, AXIS_SEED } from "../ui/axes.js";
import { openSse } from "../sse.js";
import { revealOne, sleep } from "../ui/reveal.js";
import { confirmAction } from "../ui/confirm.js";
import { renderCtxSegments } from "../ui/notes-panel-utils.js";
import { escapeCopy as escape } from "../ui/html.js";

let unmountFn = null;

export async function mount(root, { store, setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--6">
      <header class="page-header">
        <div class="page-header__row">
          <div class="questioning-head min-w-0 space-y-1">
            <p class="turn-label page-header__step"></p>
            <div class="question-session-ctx ctx-segments" aria-label="Session context"></div>
          </div>
          <button class="btn btn--ghost js-save-exit shrink-0" type="button">Skip to briefing</button>
        </div>
      </header>
      <div class="question-host"></div>
      <div class="thinking-host min-h-[72px]"></div>
      <div class="axes-wrap space-y-2" aria-label="Live scores — updated each answer, not the final briefing">
        <div class="eyebrow" title="Live scores — updated each answer, not the final briefing">Live scores</div>
        <div class="card axes-host"></div>
      </div>
      <div class="footer-host text-sm text-ink-mute"></div>
    </div>
  `;
  const turnLabel = root.querySelector(".turn-label");
  const sessionCtxEl = root.querySelector(".question-session-ctx");
  const qHost = root.querySelector(".question-host");

  renderCtxSegments(sessionCtxEl, store.ctx || {}, { compact: true });
  const thinkingHost = root.querySelector(".thinking-host");
  const axesHost = root.querySelector(".axes-host");
  const footerHost = root.querySelector(".footer-host");

  const axes = createAxesPanel({ celebrate: false });
  axes.renderInitial(
    store.axes?.length
      ? store.axes
      : AXIS_ORDER.map((id) => ({
          id,
          score: AXIS_SEED[id],
          lastDelta: 0,
          historyLen: 0,
        }))
  );
  axesHost.appendChild(axes.el);

  let activeSse = null;
  let activeEscListener = null;

  function teardown() {
    if (activeSse) { activeSse.close(); activeSse = null; }
    if (activeEscListener) {
      document.removeEventListener("keydown", activeEscListener);
      activeEscListener = null;
    }
  }

  root.querySelector(".js-save-exit").addEventListener("click", async () => {
    const ok = await confirmAction({
      message: "Skip the remaining questions and open the briefing now? Any unanswered questions will be dropped.",
      confirmLabel: "Open briefing",
      cancelLabel: "Keep questioning",
    });
    if (!ok) return;
    teardown();
    setState({ stage: STAGES.BRIEFING });
  });

  async function showNextQuestion() {
    qHost.innerHTML = "";
    thinkingHost.innerHTML = "";
    footerHost.innerHTML = "";

    const res = await getQuestion(store.sessionId);
    if (res.done) {
      if (res.agenda?.summary && res.agenda.covered == null) {
        showAgendaClosingCheck(res.agenda);
        return;
      }
      setState({ stage: STAGES.EVAL });
      return;
    }

    turnLabel.textContent = `Question ${res.turn} of ${res.total}`;
    const q = res.question;
    store.currentQuestion = q;

    // Replay test lane: prefer the server's current scripted answer so refreshes
    // and resumed sessions do not silently fall back to manual/dev controls.
    const scripted = res.scripted || store.scripted || null;
    const scriptAnswer = res.scripted
      ? res.scripted.answer
      : scripted
        ? scripted.answers[q.alias]
        : undefined;
    const hasScript = Boolean(scripted) && scriptAnswer != null;

    const card = document.createElement("div");
    card.className = "card questioning-card space-y-4 reveal";
    card.innerHTML = `
      ${res.returningToArc ? `<div class="question-drill-hint text-sm text-ink-dim">Back on the main agenda — next question follows the planned flow.</div>` : ""}
      ${scripted ? `<div class="script-meta text-xs">
        <span class="script-alias">${escape(q.alias)}</span>
        <span class="script-state ${hasScript ? "script-state--matched" : "script-state--missing"}">${hasScript ? "replay answer ready" : "no replay answer — fallback available"}</span>
      </div>` : ""}
      <div class="question-card-head">
        <div class="question-card-head__text space-y-2">
          <h1 class="question-stem leading-snug">${escape(q.name)}</h1>
          ${q.description ? `<div class="question-desc">${escape(q.description)}</div>` : ""}
        </div>
        <button type="button" class="copy-snippet-btn js-copy-question" title="Copy question" aria-label="Copy question">
          <span class="copy-snippet-btn__label">Copy</span>${COPY_ICON}
        </button>
      </div>
      <label class="block">
        <span class="sr-only">Your notes</span>
        <textarea class="textarea textarea--question" rows="5" placeholder="Jot what they said — your shorthand, not a transcript" aria-label="Your notes"></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit">Submit answer</button>
        <button class="btn btn--ghost js-deeper" type="button" disabled>Go deeper</button>
        <button class="btn btn--ghost js-skip">Skip</button>
        ${scripted ? `<button class="btn btn--ghost js-play" type="button">Insert scripted answer</button><button class="btn btn--ghost js-play-submit" type="button">Insert & submit</button>` : ""}
        ${!scripted && import.meta.env.DEV ? `<button class="btn btn--ghost js-suggest" type="button">Suggest notes (dev)</button>` : ""}
      </div>
      <p class="hint hint--kbd text-xs text-ink-mute">Shift+Enter · Skip · Esc</p>
      ${import.meta.env.DEV ? `<div class="answer-suggestions" hidden></div>` : ""}
    `;
    qHost.appendChild(card);
    revealOne(card, 40);

    card.querySelector(".js-copy-question").addEventListener("click", (e) => {
      const lines = [`Question ${res.turn}`];
      if (q.name) lines.push(String(q.name).trim());
      if (q.description) lines.push(String(q.description).trim());
      copySnippet(lines.join("\n\n"), e.currentTarget);
    });

    const ta = card.querySelector("textarea");
    setTimeout(() => ta.focus({ preventScroll: true }), 260);

    const deeperBtn = card.querySelector(".js-deeper");
    function syncDeeper() {
      deeperBtn.disabled = ta.value.trim().length === 0;
    }
    ta.addEventListener("input", syncDeeper);
    syncDeeper();

    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (!deeperBtn.disabled) onSubmit(ta.value, { goDeeper: true });
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit(ta.value);
      }
    });

    if (activeEscListener) document.removeEventListener("keydown", activeEscListener);
    activeEscListener = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSubmit("");
      }
    };
    document.addEventListener("keydown", activeEscListener);
    card.querySelector(".js-submit").addEventListener("click", () => onSubmit(ta.value));
    deeperBtn.addEventListener("click", () => onSubmit(ta.value, { goDeeper: true }));
    card.querySelector(".js-skip").addEventListener("click", () => onSubmit(""));

    // Default source is manual; the Play button promotes it to scripted/fallback.
    let answerSource = "manual";

    function insertScriptedAnswer() {
      const text = hasScript ? scriptAnswer : (scripted.fallback || "");
      answerSource = hasScript ? "scripted" : "fallback";
      ta.value = text;
      ta.focus({ preventScroll: true });
      syncDeeper();
      if (!hasScript) {
        const meta = card.querySelector(".script-state");
        if (meta) { meta.classList.add("script-state--fallback"); meta.textContent = "fallback answer used"; }
      }
      return text;
    }

    const playBtn = card.querySelector(".js-play");
    if (playBtn) {
      playBtn.addEventListener("click", insertScriptedAnswer);
    }
    const playSubmitBtn = card.querySelector(".js-play-submit");
    if (playSubmitBtn) {
      playSubmitBtn.addEventListener("click", () => {
        const text = insertScriptedAnswer();
        onSubmit(text);
      });
    }
    // If the tester edits after playing, it's no longer a clean scripted answer.
    ta.addEventListener("input", () => { if (answerSource !== "manual") answerSource = "manual"; });

    const suggestBtn = card.querySelector(".js-suggest");
    if (suggestBtn) {
      const sugHost = card.querySelector(".answer-suggestions");
      suggestBtn.addEventListener("click", async () => {
        suggestBtn.disabled = true;
        const original = suggestBtn.textContent;
        suggestBtn.textContent = "Thinking…";
        sugHost.hidden = false;
        sugHost.innerHTML = `<div class="hint">Drafting sample notes…</div>`;
        let answers = [];
        try {
          ({ answers = [] } = await suggestAnswers(store.sessionId));
        } catch {
          answers = [];
        }
        suggestBtn.disabled = false;
        suggestBtn.textContent = original;
        if (!answers.length) {
          sugHost.innerHTML = `<div class="hint">No suggestions came back — write your own or try again.</div>`;
          return;
        }
        sugHost.innerHTML = `<div class="hint">Dev only — sample notes to speed up test runs.</div>`;
        answers.forEach((text) => {
          const row = document.createElement("button");
          row.type = "button";
          row.className = "suggest-row";
          row.textContent = text;
          row.addEventListener("click", () => {
            ta.value = text;
            ta.focus({ preventScroll: true });
            syncDeeper();
          });
          sugHost.appendChild(row);
        });
      });
    }

    async function onSubmit(text, { goDeeper = false } = {}) {
      const val = text.trim();
      if (goDeeper && !val) return;
      let result;
      try {
        result = await submitAnswer(store.sessionId, val, { goDeeper, answerSource, alias: q.alias });
      } catch (e) {
        setState({ stage: STAGES.ERROR, error: e.message, retryStage: STAGES.QUESTIONING });
        return;
      }
      await exitQuestion(card);
      if (result?.truncated) {
        const warn = document.createElement("div");
        warn.className = "hint mt-2 text-amber-500";
        warn.textContent = "Answer was too long — trimmed to 4000 characters.";
        footerHost.appendChild(warn);
      }
      await runPlanStream(val, { goDeeper: Boolean(result?.goDeeper) });
    }
  }

  function showAgendaClosingCheck(agenda) {
    qHost.innerHTML = "";
    thinkingHost.innerHTML = "";
    footerHost.innerHTML = "";
    turnLabel.textContent = "Before we wrap";

    const card = document.createElement("div");
    card.className = "card questioning-card space-y-4 reveal";
    card.innerHTML = `
      <div class="question-card-head__text space-y-2">
        <h1 class="question-stem leading-snug">Earlier they wanted to cover ${escape(agenda.summary)}. Did you get to it?</h1>
      </div>
      <div class="field__actions">
        <button class="btn js-agenda-yes" type="button">Yes, covered</button>
        <button class="btn btn--ghost js-agenda-no" type="button">Not yet</button>
      </div>
    `;
    qHost.appendChild(card);
    revealOne(card, 40);

    async function resolve(covered) {
      try {
        await setAgendaCovered(store.sessionId, covered);
      } catch (e) {
        console.warn("[questioning] agenda cover failed:", e.message);
      }
      setState({ stage: STAGES.EVAL });
    }
    card.querySelector(".js-agenda-yes").addEventListener("click", () => resolve(true));
    card.querySelector(".js-agenda-no").addEventListener("click", () => resolve(false));
  }

  async function exitQuestion(card) {
    if (activeEscListener) {
      document.removeEventListener("keydown", activeEscListener);
      activeEscListener = null;
    }
    card.classList.add("field-exit");
    requestAnimationFrame(() => card.classList.add("is-out"));
    await sleep(240);
    card.remove();
  }

  async function runPlanStream(submittedText, { goDeeper = false } = {}) {
    const skipped = submittedText.trim() === "";
    const orb = createOrb(
      goDeeper
        ? "Going deeper…"
        : skipped
          ? "Next question…"
          : "Scoring answer…"
    );
    thinkingHost.appendChild(orb.el);

    const sse = openSse(`/api/plan/stream?s=${encodeURIComponent(store.sessionId)}`);
    activeSse = sse;

    let terminal = null;
    let noteShown = false;

    sse
      .on("thinking", (d) => orb.setLabel(d.label))
      .on("axes", async (d) => {
        await orb.exit();
        thinkingHost.innerHTML = "";
        axes.update(d.axes, { showDelta: true });
        store.axes = d.axes;
        if (d.issues?.length) console.warn("[planner] axis issues:", d.issues);
      })
      .on("note", (d) => {
        if (!d.note || noteShown) return;
        noteShown = true;
        const n = document.createElement("div");
        n.className = "hint mt-2 reveal";
        n.textContent = d.note;
        footerHost.appendChild(n);
        revealOne(n, 100);
      })
      .on("next", () => { terminal = "next"; })
      .on("done", () => { terminal = "done"; })
      .on("error", (d) => {
        setState({
          stage: STAGES.ERROR,
          error: d.message || "Planning failed.",
          retryStage: STAGES.QUESTIONING,
        });
      })
      .onError(() => {
        setState({
          stage: STAGES.ERROR,
          error: "Lost connection while scoring the answer.",
          retryStage: STAGES.QUESTIONING,
        });
      })
      .open();

    await sleep(1600);
    const started = Date.now();
    while (!terminal && Date.now() - started < 5000) await sleep(100);

    if (terminal === "done") {
      setState({ stage: STAGES.EVAL });
    } else {
      activeSse?.close(); // stop a slow/stale stream so it can't fire a late event after we advance
      showNextQuestion();
    }
  }

  showNextQuestion();

  unmountFn = teardown;
}

export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}


const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

async function copySnippet(text, btn, doneLabel = "Copied") {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.getAttribute("aria-label");
    btn.classList.add("is-copied");
    btn.setAttribute("aria-label", doneLabel);
    setTimeout(() => {
      btn.classList.remove("is-copied");
      btn.setAttribute("aria-label", prev || "Copy question");
    }, 1200);
  } catch (e) {
    console.warn("[questioning] clipboard write failed:", e.message);
  }
}
