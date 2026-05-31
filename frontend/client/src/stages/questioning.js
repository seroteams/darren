import { STAGES, resetSession } from "../state.js";
import { getQuestion, submitAnswer } from "../api.js";
import { createOrb } from "../ui/orb.js";
import { createAxesPanel, AXIS_ORDER, AXIS_SEED } from "../ui/axes.js";
import { openSse } from "../sse.js";
import { revealOne, revealSequence, sleep } from "../ui/reveal.js";
import { confirmAction } from "../ui/confirm.js";
let unmountFn = null;

export async function mount(root, { store, setState }) {
  root.innerHTML = `
    <div class="stage-inner space-y-6">
      <header class="flex items-baseline justify-between">
        <div class="eyebrow turn-label"></div>
        <div class="flex gap-2">
          <button class="btn btn--ghost js-save-exit" type="button">Save and exit</button>
          <button class="btn btn--ghost js-start-fresh" type="button">Start over</button>
        </div>
      </header>
      <div class="question-host"></div>
      <div class="thinking-host min-h-[72px]"></div>
      <div class="axes-wrap space-y-2">
        <div class="axes-explainer text-xs text-ink-dim max-w-measure">
          Session signals — these bars move on what answers mean, not how long they are. Short filler like "fine" or "ok" won't shift them.
        </div>
        <div class="card axes-host"></div>
      </div>
      <div class="footer-host text-xs text-ink-mute"></div>
    </div>
  `;
  const turnLabel = root.querySelector(".turn-label");
  const qHost = root.querySelector(".question-host");
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
    const ok = await confirmAction({ message: "Are you sure?" });
    if (!ok) return;
    teardown();
    setState({ stage: STAGES.BRIEFING });
  });

  root.querySelector(".js-start-fresh").addEventListener("click", async () => {
    const ok = await confirmAction({ message: "Are you sure?" });
    if (!ok) return;
    teardown();
    resetSession();
    setState({ stage: STAGES.START });
  });

  async function showNextQuestion() {
    qHost.innerHTML = "";
    thinkingHost.innerHTML = "";
    footerHost.innerHTML = "";

    const res = await getQuestion(store.sessionId);
    if (res.done) {
      setState({ stage: STAGES.EVAL });
      return;
    }

    turnLabel.textContent = `Question ${res.turn} of ${res.total}`;
    const q = res.question;
    store.currentQuestion = q;

    const card = document.createElement("div");
    card.className = "card questioning-card space-y-4 reveal";
    card.innerHTML = `
      <h1 class="question-stem leading-snug">${escape(q.name)}</h1>
      ${q.description ? `<div class="question-desc">${escape(q.description)}</div>` : ""}
      <textarea class="textarea textarea--question" rows="5" placeholder="What did they say?"></textarea>
      <div class="field-actions">
        <button class="btn js-submit">Record and continue</button>
        <button class="btn btn--ghost js-skip">Skip</button>
      </div>
      <div class="text-xs text-ink-mute"><span class="kbd">Enter</span> to continue · <span class="kbd">Esc</span> to skip</div>
    `;
    qHost.appendChild(card);
    revealOne(card, 40);
    setTimeout(() => card.querySelector("textarea").focus({ preventScroll: true }), 260);

    const ta = card.querySelector("textarea");
    ta.addEventListener("keydown", (e) => {
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
    card.querySelector(".js-skip").addEventListener("click", () => onSubmit(""));

    async function onSubmit(text) {
      const val = text.trim();
      let result;
      try {
        result = await submitAnswer(store.sessionId, val);
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
      await runPlanStream(val);
    }
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

  async function runPlanStream(submittedText) {
    const skipped = submittedText.trim() === "";
    const orb = createOrb(skipped
      ? "Choosing the next question…"
      : "Listening…");
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

    // Wait for axis reveal animation + a breath, then advance
    await sleep(1600);
    // If the SSE emitted terminal, navigate; else wait a bit more
    const started = Date.now();
    while (!terminal && Date.now() - started < 5000) await sleep(100);

    if (terminal === "done") {
      setState({ stage: STAGES.EVAL });
    } else {
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

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
