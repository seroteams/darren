import { STAGES } from "../state.js";
import { getQuestion, submitAnswer, suggestAnswers, setAgendaCovered, goBack, wrapUpSession, getPriorPromises, savePromiseOutcomes } from "../../../shared/api.js";
import { renderPromiseCheckin } from "../ui/promise-checkin.ts";
import { createOrb } from "../ui/orb.js";
import { createAxesPanel, AXIS_ORDER, AXIS_SEED } from "../ui/axes.js";
import { createCoachPanel } from "../ui/coach-panel.ts";
import { openSse } from "../../../shared/sse.js";
import { revealOne, sleep } from "../ui/reveal.js";
import { confirmAction } from "../ui/confirm.js";
import { renderCtxSegments } from "../ui/notes-panel-utils.js";
import { isTouchScreen } from "../ui/field.js";
import { escapeCopy as escape } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Copy } from "lucide";

let unmountFn = null;

// A runtime thread-follow quotes a fragment of the previous answer in its stem
// ('You said "…"'). Showing the FULL prior answer beside it restores the context
// the fragment alone lost (2026-07-21 user test). Only show it when it genuinely
// matches — a stale store.lastAnswer (mid-session refresh) must never front a
// quote the report didn't say.
function threadFollowSource(question, lastAnswer) {
  const src = String(lastAnswer || "").trim();
  if (!src) return "";
  const quoted = String(question?.name || "").match(/^you said\s+"([^"]+)"/i);
  if (!quoted) return src;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return norm(src).includes(norm(quoted[1])) ? src : "";
}

// The coach panel (coach-panel) is now the layout for BOTH apps — the full-screen
// 50/50 runner ships to the customer app too (Carl, 2026-07-21). This stage module
// is shared, so one constant flips both. Kept as a named flag so the single-column
// fallback below stays readable and easy to restore if ever needed.
const USE_COACH_SPLIT = true;

export async function mount(root, { store, setState }) {
  // Admin: the POC's TRUE full-screen 50/50 (runner-v2, Carl-approved) — fixed overlay,
  // three datum lines (72px header row + hairline, shared content line, footer line),
  // 560px columns, paper left / lavender right. Customer app: today's single column.
  // The overlay is appended to <body>: the stage host lives inside animated/contained
  // shell ancestors, which trap position:fixed and shrink the split (Carl's 2026-07-19
  // "this is not the design" catch). The nav rail stays; topbar + dev rail sit under it.
  const adminScreenHtml = `<div class="cp-screen">
        <div class="cp-half cp-half--q">
          <header class="cp-head">
            <div class="cp-head__facts">
              <span class="turn-label cp-head__turn"></span>
              <span class="question-session-ctx ctx-segments" aria-label="Session context"></span>
            </div>
            <div class="cp-head__actions">
              <button class="btn btn--ghost js-save-exit" type="button">Skip to recap</button>
            </div>
          </header>
          <div class="cp-col">
            <div class="question-host"></div>
            <div class="thinking-host"></div>
            <div class="footer-host text-sm text-ink-mute"></div>
          </div>
          <div class="cp-foot"></div>
        </div>
        <aside class="cp-half cp-half--coach" aria-label="Coaching — only you see this">
          <header class="cp-head">
            <div class="cp-toggle" role="tablist" aria-label="Coach panel view">
              <button type="button" class="cp-seg js-coach-seg" data-mode="support" role="tab" aria-selected="true">Support</button>
              <button type="button" class="cp-seg js-coach-seg" data-mode="scores" role="tab" aria-selected="false">Live scores</button>
            </div>
            <span class="cp-privacy">Only you see this — never ${escape(store.ctx?.name || "them")}.</span>
          </header>
          <div class="cp-col"><div class="coach-host"></div></div>
          <div class="cp-foot"></div>
        </aside>
      </div>`;
  let screenEl = null;
  if (USE_COACH_SPLIT) {
    root.innerHTML = "";
    screenEl = document.createElement("div");
    screenEl.innerHTML = adminScreenHtml;
    screenEl = screenEl.firstElementChild;
    document.body.appendChild(screenEl);
  } else {
    root.innerHTML = `<div class="stage-questioning l-stack l-stack--6">
      <header class="page-header">
        <div class="page-header__row">
          <div class="questioning-head min-w-0 space-y-1">
            <p class="turn-label page-header__step"></p>
            <div class="question-session-ctx ctx-segments" aria-label="Session context"></div>
            <p class="question-session-notes" aria-label="What you told Sero" hidden></p>
          </div>
          <button class="btn btn--ghost js-save-exit shrink-0" type="button">Skip to recap</button>
        </div>
      </header>
      <div class="question-host"></div>
      <div class="thinking-host min-h-[72px]"></div>
      <div class="axes-wrap space-y-2" aria-label="Live scores — updated each answer, not the final recap">
        <div class="eyebrow" title="Live scores — updated each answer, not the final recap">Live scores</div>
        <div class="card axes-host"></div>
      </div>
      <div class="footer-host text-sm text-ink-mute"></div>
    </div>`;
  }
  const ui = screenEl || root;
  const turnLabel = ui.querySelector(".turn-label");
  const sessionCtxEl = ui.querySelector(".question-session-ctx");
  const qHost = ui.querySelector(".question-host");

  renderCtxSegments(sessionCtxEl, store.ctx || {}, { compact: true });
  // Echo what the manager told Sero at setup (chips summary + their own words) so
  // the full context stays visible the whole way through the interview. The POC split
  // (admin) has no notes echo — its header keeps the single 72px facts row.
  const sessionNotesEl = ui.querySelector(".question-session-notes");
  const ctxNotes = String(store.ctx?.notes || "").replace(/\s*\n+\s*/g, " ").trim();
  if (ctxNotes && sessionNotesEl) {
    sessionNotesEl.textContent = `“${ctxNotes}”`;
    sessionNotesEl.hidden = false;
  }
  const thinkingHost = ui.querySelector(".thinking-host");
  const axesHost = ui.querySelector(USE_COACH_SPLIT ? ".coach-host" : ".axes-host");
  const footerHost = ui.querySelector(".footer-host");

  // Same duck-type surface either way: renderInitial / update (+ setNote on the coach panel).
  const axes = USE_COACH_SPLIT
    ? createCoachPanel({ sessionId: store.sessionId, personName: store.ctx?.name || "" })
    : createAxesPanel({ celebrate: false });
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

  // Coach panel (Phase 2): the Support / Live-scores toggle drives the panel view.
  // Admin app only (createCoachPanel provides setMode / setQuestionHints).
  if (USE_COACH_SPLIT && axes.setMode) {
    ui.querySelectorAll(".js-coach-seg").forEach((seg) =>
      seg.addEventListener("click", () => {
        const next = seg.dataset.mode;
        ui.querySelectorAll(".js-coach-seg").forEach((s) =>
          s.setAttribute("aria-selected", String(s.dataset.mode === next)));
        axes.setMode(next);
      }));
  }

  let activeSse = null;
  let activeEscListener = null;

  function teardown() {
    if (activeSse) { activeSse.close(); activeSse = null; }
    if (activeEscListener) {
      document.removeEventListener("keydown", activeEscListener);
      activeEscListener = null;
    }
  }

  // Wrap-up exit (wrap-up-exit Phase 1): from Q4 the escape becomes a warm door —
  // one closing question, then the briefing — instead of the straight-to-briefing
  // trapdoor. showNextQuestion() sets wrapMode + relabels per question.
  const saveExitBtn = ui.querySelector(".js-save-exit");
  let wrapMode = false;
  let answered = 0;
  saveExitBtn.addEventListener("click", async () => {
    if (wrapMode) {
      const ok = await confirmAction({
        message: "You've covered good ground. One closing question, then your recap — everything you've answered is kept.",
        confirmLabel: "Wrap up",
        cancelLabel: "Keep going",
      });
      if (!ok) return;
      const res = await wrapUpSession(store.sessionId).catch(() => null);
      if (res?.closerNext) {
        teardown();
        showNextQuestion();
        return;
      }
      // No usable closer — fall through to the plain skip below (no second confirm).
      teardown();
      setState({ stage: STAGES.EVAL });
      return;
    }
    const ok = await confirmAction({
      message: `You've only answered ${answered} question${answered === 1 ? "" : "s"} so far — your recap will be thin. Open it now anyway? Anything unanswered is dropped.`,
      confirmLabel: "Open recap anyway",
      cancelLabel: "Keep questioning",
      destructive: true,
    });
    if (!ok) return;
    teardown();
    // Skip must run the evaluation synthesis first (like the natural "questions done"
    // path below), then EVAL auto-advances to the briefing. Jumping straight to BRIEFING
    // left an ungenerated run showing "Briefing not available" (F-006).
    setState({ stage: STAGES.EVAL });
  });

  async function showNextQuestion({ prefill = null } = {}) {
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
    // Feed this question's manager-only hints to the coach panel's Support view.
    if (USE_COACH_SPLIT && axes.setQuestionHints) axes.setQuestionHints(q.hints);

    // Replay test lane: prefer the server's current scripted answer so refreshes
    // and resumed sessions do not silently fall back to manual/dev controls.
    const scripted = res.scripted || store.scripted || null;
    const scriptAnswer = res.scripted
      ? res.scripted.answer
      : scripted
        ? scripted.answers[q.alias]
        : undefined;
    const hasScript = Boolean(scripted) && scriptAnswer != null;

    // Quiet "planner adapted" cue: a thread-follow / drill question digs into the
    // previous answer, so flag it so the jump never reads as random.
    const isFollowUp = /thread_follow|drill|follow_up/i.test(q.alias || "");

    // Promises loop phase 1 — the final question carries the fork: the PRIMARY way
    // out of a 1:1 is agreeing next actions (the briefing then opens on the confirm
    // card); the ghost "Finish" path skips confirming. Both submit the typed notes —
    // the pipeline is unchanged, only the flag differs. Reset here so a stale flag
    // from an earlier run can't leak into this one. Scripted QA lane keeps Skip.
    const isFinal = res.turn >= res.total && !scripted;
    if (isFinal) store.promisesConfirmSkip = false;

    // Wrap-up exit: from Q4 (and before the final question) the escape button
    // becomes the warm door. Floor of 4 = the shortest possible 1:1 (3 answers +
    // the closer) — Balanced policy. Scripted lane keeps the plain skip.
    answered = res.turn - 1;
    wrapMode = !scripted && !isFinal && res.turn >= 4;
    saveExitBtn.textContent = wrapMode ? "Wrap up — get my recap" : "Skip to recap";

    const card = document.createElement("div");
    card.className = USE_COACH_SPLIT ? "cp-q space-y-4 reveal" : "card questioning-card space-y-4 reveal";
    const whoSaid = store.ctx?.name ? `What ${store.ctx.name} said` : "What they said";
    const followSource = isFollowUp ? threadFollowSource(q, store.lastAnswer) : "";
    card.innerHTML = `
      ${isFollowUp
        ? `<div class="question-drill-hint text-ink-dim">↳ Following up on what you just said.</div>${
            followSource
              ? `<blockquote class="question-source-answer">${escape(followSource)}</blockquote>`
              : ""
          }`
        : ""}
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
      <label class="block field-live-label">
        <span class="field-live-label__text">${escape(whoSaid)}</span>
        <textarea class="textarea textarea--question" rows="5" placeholder="Jot their words — your shorthand, not a transcript" aria-label="${escape(whoSaid)}"></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit">${isFinal ? "Agree next actions" : "Submit answer"}</button>
        ${isFinal
          ? `<button class="btn btn--ghost js-finish" type="button" title="Wrap up without agreeing next actions">Finish without next steps</button>`
          : `<button class="btn btn--ghost js-skip">Skip</button>`}
        ${res.turn > 1 && !scripted ? `<button class="btn btn--ghost js-back" type="button" title="Go back and fix your last answer">Back</button>` : ""}
        ${scripted ? `<button class="btn btn--ghost js-play" type="button">Insert scripted answer</button><button class="btn btn--ghost js-play-submit" type="button">Insert & submit</button>` : ""}
        ${!scripted && import.meta.env.DEV ? `<button class="btn btn--ghost js-suggest" type="button">Suggest notes (dev)</button>` : ""}
      </div>
      <p class="hint hint--kbd text-xs text-ink-mute">Enter to submit · Esc to skip</p>
      ${import.meta.env.DEV ? `<div class="answer-suggestions" hidden></div>` : ""}
    `;
    qHost.appendChild(card);
    revealOne(card, 40);
    // Each question restarts at the top — submitting leaves the page scrolled
    // to where the buttons were, hiding the next question (phone walk 2026-07-11).
    window.scrollTo(0, 0);

    card.querySelector(".js-copy-question").addEventListener("click", (e) => {
      const lines = [`Question ${res.turn}`];
      if (q.name) lines.push(String(q.name).trim());
      if (q.description) lines.push(String(q.description).trim());
      copySnippet(lines.join("\n\n"), e.currentTarget);
    });

    const ta = card.querySelector("textarea");
    if (prefill) ta.value = prefill;
    // Desktop only: on a phone this would pop the keyboard over the question
    // before it's even been read (phone walk 2026-07-11).
    if (!isTouchScreen()) setTimeout(() => ta.focus({ preventScroll: true }), 260);

    // Phone: when the tap opens the keyboard, pull the question back into view
    // so what they're answering stays readable above it.
    ta.addEventListener("focus", () => {
      if (!isTouchScreen()) return;
      setTimeout(() => card.scrollIntoView({ block: "start", behavior: "smooth" }), 350);
    });

    // Feed the answer draft to the store (debounced) so the right-rail "Sending"
    // tab shows the exact planner prompt live, filling in as you type. Seed it once
    // now to cover a prefilled/back-nav answer.
    setState({ draftAnswer: ta.value });
    let draftTimer = null;
    ta.addEventListener("input", () => {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => setState({ draftAnswer: ta.value }), 250);
    });

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
    card.querySelector(".js-skip")?.addEventListener("click", () => onSubmit(""));
    // Final-turn ghost: same submit (typed notes kept), but the briefing opens
    // without the promises confirm card.
    card.querySelector(".js-finish")?.addEventListener("click", () => {
      store.promisesConfirmSkip = true;
      onSubmit(ta.value);
    });

    const backBtn = card.querySelector(".js-back");
    if (backBtn) {
      backBtn.addEventListener("click", async () => {
        backBtn.disabled = true;
        let prev;
        try {
          prev = await goBack(store.sessionId);
        } catch {
          backBtn.disabled = false;
          footerHost.innerHTML = "";
          const warn = document.createElement("div");
          warn.className = "hint mt-2 text-amber-500";
          warn.textContent = "Couldn't go back — the previous answer may already be locked in.";
          footerHost.appendChild(warn);
          return;
        }
        if (activeEscListener) {
          document.removeEventListener("keydown", activeEscListener);
          activeEscListener = null;
        }
        if (prev.axes) {
          axes.renderInitial(prev.axes);
          store.axes = prev.axes;
        }
        showNextQuestion({ prefill: prev.answer ?? "" });
      });
    }

    // Default source is manual; the Play button promotes it to scripted/fallback.
    let answerSource = "manual";

    function insertScriptedAnswer() {
      const text = hasScript ? scriptAnswer : (scripted.fallback || "");
      answerSource = hasScript ? "scripted" : "fallback";
      ta.value = text;
      ta.focus({ preventScroll: true });
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
          });
          sugHost.appendChild(row);
        });
      });
    }

    let submitting = false;
    async function onSubmit(text) {
      if (submitting) return;
      const val = text.trim();
      store.lastAnswer = val; // source for the next question's thread-follow context block
      submitting = true;
      setState({ draftAnswer: "" }); // answer's leaving the box — stop previewing it as "Sending"
      let result;
      try {
        result = await submitAnswer(store.sessionId, val, { answerSource, alias: q.alias });
      } catch (e) {
        setState({ stage: STAGES.ERROR, error: e.message, retryStage: STAGES.QUESTIONING });
        return;
      }
      await exitQuestion(card);
      if (result?.truncated) {
        const warn = document.createElement("div");
        warn.className = "hint mt-2 text-amber-500";
        warn.textContent = "That answer was very long — we kept the first 4,000 characters.";
        footerHost.appendChild(warn);
      }
      await runPlanStream(val);
    }
  }

  function showAgendaClosingCheck(agenda) {
    qHost.innerHTML = "";
    thinkingHost.innerHTML = "";
    footerHost.innerHTML = "";
    turnLabel.textContent = "Before we wrap";

    const card = document.createElement("div");
    card.className = USE_COACH_SPLIT ? "cp-q space-y-4 reveal" : "card questioning-card space-y-4 reveal";
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
    // Each question restarts at the top — submitting leaves the page scrolled
    // to where the buttons were, hiding the next question (phone walk 2026-07-11).
    window.scrollTo(0, 0);

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

  async function runPlanStream(submittedText) {
    const skipped = submittedText.trim() === "";
    const orb = createOrb(skipped ? "Next question…" : "Scoring answer…");
    thinkingHost.appendChild(orb.el);
    // Pull the page up so the progress orb is visible, not stranded above the fold.
    window.scrollTo(0, 0);

    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/plan/stream`);
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
        // Admin: the note IS the coach panel's per-axis "why" — no duplicate footer hint.
        if (USE_COACH_SPLIT) {
          axes.setNote(d.note);
          return;
        }
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
          error: d.message || "Couldn't line up the next question — try again.",
          retryStage: STAGES.QUESTIONING,
        });
      })
      .onError(() => {
        setState({
          stage: STAGES.ERROR,
          error: "Lost connection while scoring your answer — try again.",
          retryStage: STAGES.QUESTIONING,
        });
      })
      .open();

    await sleep(1600);
    // Wait for the stream's terminal event — the planner takes as long as it
    // takes (often 5–15s on the big model). The old 5s cap closed the stream
    // before the axes event arrived, which froze the live score bars and let
    // the UI advance while the server was still re-planning the queue (the
    // Jun 11 demo's "scores stopped working" + mid-run haywire). Dead
    // connections surface via onError above; this long cap only catches a
    // hung-but-alive stream, and it fails loudly instead of moving on.
    const started = Date.now();
    while (!terminal && Date.now() - started < 120000) await sleep(100);

    if (terminal === "done") {
      setState({ stage: STAGES.EVAL });
    } else if (terminal === "next") {
      showNextQuestion();
    } else {
      activeSse?.close();
      setState({
        stage: STAGES.ERROR,
        error: "Scoring this answer is taking too long — the connection may be stuck.",
        retryStage: STAGES.QUESTIONING,
      });
    }
  }

  // Card zero (Promises loop phase 2): before question 1, check in on last
  // time's promises with this person. The server decides eligibility (fresh
  // person, scripted lane, resumed run, already answered → prior: null), so a
  // failed read just falls through to the questions — never blocks a 1:1.
  async function proceedBoot() {
    let prior = null;
    try {
      ({ prior } = await getPriorPromises(store.sessionId));
    } catch (e) {
      console.warn("[questioning] prior-promises read failed (skipping check-in):", e.message);
    }
    if (prior?.promises?.length) {
      showPromiseCheckin(prior);
      return;
    }
    showNextQuestion();
  }

  function showPromiseCheckin(prior) {
    qHost.innerHTML = "";
    thinkingHost.innerHTML = "";
    footerHost.innerHTML = "";
    turnLabel.textContent = "Before question 1";

    const card = document.createElement("div");
    card.className = USE_COACH_SPLIT ? "cp-q space-y-4 reveal" : "card questioning-card space-y-4 reveal";
    const head = document.createElement("h1");
    head.className = "question-stem leading-snug";
    head.textContent = "How did last time's agreements go?";
    card.appendChild(head);
    const body = document.createElement("div");
    card.appendChild(body);
    renderPromiseCheckin(body, {
      promises: prior.promises,
      reportName: store.ctx?.name || "",
      onDone: async (outcomes) => {
        // The save must land (it writes the PRIOR run) — renderPromiseCheckin
        // keeps the card up with a retry note if this throws.
        await savePromiseOutcomes(store.sessionId, { outcomes });
        await exitQuestion(card);
        showNextQuestion();
      },
      onSkip: async () => {
        // Best-effort stamp so a refresh doesn't re-ask; promises stay open.
        try {
          await savePromiseOutcomes(store.sessionId, { skipped: true });
        } catch (e) {
          console.warn("[questioning] check-in skip stamp failed:", e.message);
        }
        await exitQuestion(card);
        showNextQuestion();
      },
    });
    qHost.appendChild(card);
    revealOne(card, 40);
    window.scrollTo(0, 0);
  }

  proceedBoot();

  unmountFn = () => {
    teardown();
    // The admin split lives on <body> (portal) — remove it with the stage.
    if (screenEl) { screenEl.remove(); screenEl = null; }
  };
}

export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}


const COPY_ICON = icon(Copy, { size: 14 });

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
