// One-page run — the whole flow on a single page that grows downward.
// You answer; the next question appears below; answered steps settle into a
// locked "answered" look (not a greyed-out disabled box).
//
// Covered so far:
//   Phase 1 — setup: name -> role -> seniority -> meeting type -> notes.
//   Phase 2 — focus areas + prep brief stream in as the next grow-down sections,
//             then "Continue to interview" bridges to the existing question +
//             briefing screens (Phase 3 puts questions on-page; Phase 4 makes
//             the results their own page 2).
// Reuses api.js, sse.js, orb.js, reveal.js and the existing design-system classes.

import { STAGES, resetSession } from "../state.js";
import { exitStage } from "../ui/landing.ts";
import { getMeetingTypes, startSession, setSelectedFocus, getQuestion, submitAnswer, setAgendaCovered, getRoleProfile } from "../../../shared/api.js";
import { focusField } from "../ui/field.js";
import { revealOne, sleep } from "../ui/reveal.js";
import { openSse } from "../../../shared/sse.js";
import { createOrb } from "../ui/orb.js";
import { createAxesPanel, AXIS_ORDER, AXIS_SEED } from "../ui/axes.js";
import { escapeCopy as escape } from "../ui/html.js";
import { groupTerms, isGrouped } from "../ui/vocab-groups.js";
import { confirmAction } from "../ui/confirm.js";
import { confirmResetSession } from "../ui/session-reset.js";

// Reduced-motion: skip smooth-scroll easing (CSS already gates the reveal
// transforms via prefers-reduced-motion).
const reduceMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollBehavior = () => (reduceMotion() ? "auto" : "smooth");

const SETUP = [
  { key: "NAME", field: "name", type: "text", required: true,
    question: "Who are you prepping for?", hint: "Their first name is enough.", placeholder: "e.g. Priya" },
  { key: "ROLE", field: "role", type: "text", required: true,
    question: "What do they do?", hint: "Their role as you'd say it out loud.", placeholder: "e.g. Senior backend engineer" },
  { key: "SENIORITY", field: "seniority", type: "text", required: true,
    question: "And their seniority?", hint: "IC level, staff, manager, director — whatever reads naturally.", placeholder: "e.g. Senior / Staff / Lead" },
  { key: "MEETING_TYPE", type: "meeting",
    question: "What kind of meeting?", hint: "Pick the shape that fits today." },
  { key: "NOTES", field: "notes", type: "textarea", required: false,
    question: "Anything Sero should know?", placeholder: "e.g. They've been working late. Something feels off." },
];

const PREP_VIEW_SECTIONS = [
  { label: "Likely theme",       key: "coreIssue",       type: "paragraph" },
  { label: "How sure is this",   key: "confidence",      type: "paragraph" },
  { label: "Don't assume yet",   key: "dontAssume",      type: "paragraph" },
  { label: "Say this first",     key: "openingQuestion", type: "callout" },
  { label: "Listen for",         key: "listenFor",       type: "bullets" },
  { label: "Avoid",              key: "avoid",           type: "bullets" },
  { label: "Success looks like", key: "goodOutcome",     type: "paragraph" },
  { label: "Suggested action",   key: "suggestedAction", type: "paragraph" },
];

let teardown = null;

export async function mount(root, { store, setState }) {
  root.classList.add("flow-page");
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="space-y-3">
        <div class="intake-header__row">
          <div class="space-y-1 min-w-0">
            <div class="eyebrow">Everything on one page</div>
            <h1 class="h1">Prep your 1:1</h1>
            <p class="text-ink-dim js-flow-lede">Answer each step and the next appears below.</p>
          </div>
          <button class="btn btn--ghost js-cancel flex-shrink-0" type="button">Cancel</button>
        </div>
      </header>
      <div class="flow-steps l-stack l-stack--6"></div>
    </div>
  `;

  const steps = root.querySelector(".flow-steps");
  const stageInner = root.querySelector(".stage-inner");
  let currentSse = null;
  let activeEsc = null;
  let axes = null;
  let thinkingHost = null;
  let noteHost = null;
  let interviewRail = null;
  let activeQuestionCard = null;
  teardown = () => {
    if (currentSse) { currentSse.close(); currentSse = null; }
    if (activeEsc) { document.removeEventListener("keydown", activeEsc); activeEsc = null; }
  };

  root.querySelector(".js-cancel").addEventListener("click", async () => {
    const ok = await confirmResetSession(confirmAction, { to: STAGES.START });
    if (!ok) return;
    resetSession();
    setState({ stage: exitStage(store.user, store.memberHome, store.guestHome) });
  });

  let types = [];
  try {
    const res = await getMeetingTypes();
    types = res.types || [];
  } catch {
    types = [];
  }

  let idx = 0;
  let activeNode = null;

  // A settled (answered, locked) block — clearly done, not a disabled input.
  function settledNode(question, answer, { muted = false } = {}) {
    const node = document.createElement("div");
    node.className = "flow-section flow-section--settled";
    node.innerHTML = `
      <div class="flow-answer">
        <div class="flow-answer__q"></div>
        <div class="flow-answer__a${muted ? " flow-answer__a--muted" : ""}"></div>
      </div>
    `;
    node.querySelector(".flow-answer__q").textContent = question;
    node.querySelector(".flow-answer__a").textContent = answer;
    return node;
  }

  // Append + reveal + scroll a new section to the bottom of the page.
  function appendSection(node, { scrollTo = true, focus = false } = {}) {
    node.classList.add("field-enter");
    steps.appendChild(node);
    revealOne(node);
    if (scrollTo) requestAnimationFrame(() => node.scrollIntoView({ behavior: scrollBehavior(), block: "start" }));
    if (focus) focusField(node);
    return node;
  }

  function place(nextNode, { scrollTo = true } = {}) {
    activeNode = nextNode;
    appendSection(nextNode, { scrollTo, focus: true });
  }

  function settleAndAdvance(question, answer, opts = {}) {
    if (activeNode) steps.replaceChild(settledNode(question, answer, opts), activeNode);
    idx += 1;
    if (idx >= SETUP.length) return finish();
    place(renderActive(SETUP[idx]));
  }

  function renderActive(step) {
    if (step.type === "meeting") return renderMeeting(step);
    if (step.type === "textarea") return renderTextarea(step);
    return renderText(step);
  }

  function renderText(step) {
    const wrap = document.createElement("div");
    wrap.className = "flow-section flow-section--active space-y-4";
    wrap.innerHTML = `
      <label class="block">
        <h1 class="h1 flow-q mb-4"></h1>
        <input class="input" type="text" autocomplete="off" spellcheck="false" data-autofocus />
      </label>
      <div class="hint"></div>
      <div class="field__error" hidden></div>
      <div class="field__actions"><button class="btn js-next" type="button">Continue</button></div>
    `;
    wrap.querySelector(".flow-q").textContent = step.question;
    wrap.querySelector(".hint").textContent = step.hint;
    const input = wrap.querySelector("input");
    input.placeholder = step.placeholder;
    input.value = store.ctx[step.field] || "";
    const err = wrap.querySelector(".field__error");

    function submit() {
      const val = input.value.trim();
      if (step.required && !val) {
        err.textContent = "Add a value to continue.";
        err.hidden = false;
        input.setAttribute("aria-invalid", "true");
        return;
      }
      err.hidden = true;
      input.removeAttribute("aria-invalid");
      store.ctx[step.field] = val;
      settleAndAdvance(step.question, val);
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    wrap.querySelector(".js-next").addEventListener("click", submit);
    return wrap;
  }

  function renderTextarea(step) {
    const wrap = document.createElement("div");
    wrap.className = "flow-section flow-section--active space-y-4";
    wrap.innerHTML = `
      <label class="block">
        <h1 class="h1 flow-q mb-4"></h1>
        <textarea class="textarea" rows="4" data-autofocus></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit" type="button">Continue</button>
        <button class="btn btn--ghost js-skip" type="button">Skip</button>
      </div>
    `;
    wrap.querySelector(".flow-q").textContent = step.question;
    const ta = wrap.querySelector("textarea");
    ta.placeholder = step.placeholder;
    ta.value = store.ctx[step.field] || "";

    function go(val) {
      store.ctx[step.field] = val;
      settleAndAdvance(step.question, val || "(skipped)", { muted: !val });
    }
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(ta.value.trim()); }
    });
    wrap.querySelector(".js-submit").addEventListener("click", () => go(ta.value.trim()));
    wrap.querySelector(".js-skip").addEventListener("click", () => go(""));
    return wrap;
  }

  function renderMeeting(step) {
    const wrap = document.createElement("div");
    wrap.className = "flow-section flow-section--active space-y-5";
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("data-autofocus", "");
    wrap.innerHTML = `
      <h1 class="h1 flow-q mb-2"></h1>
      <div class="hint mb-3"></div>
      <div class="grid gap-3 js-cards"></div>
    `;
    wrap.querySelector(".flow-q").textContent = step.question;
    wrap.querySelector(".hint").textContent = step.hint;
    const cards = wrap.querySelector(".js-cards");

    if (!types.length) {
      cards.innerHTML = `<div class="field__error">Couldn't load meeting types. Reload and try again.</div>`;
      return wrap;
    }

    let selected = Number.isInteger(store.ctx.meetingTypeIndex) ? store.ctx.meetingTypeIndex : 0;

    function paint() {
      cards.innerHTML = "";
      types.forEach((t, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "meeting-card" + (i === selected ? " is-selected" : "");
        btn.innerHTML = `
          <div>
            <span class="meeting-card__label">${t.label}</span>
            ${t.badge ? `<span class="meeting-card__badge">${t.badge}</span>` : ""}
          </div>
          <div class="meeting-card__meta">${t.duration} · ${t.description}</div>
        `;
        btn.addEventListener("click", () => { selected = i; choose(); });
        cards.appendChild(btn);
      });
    }

    function choose() {
      store.ctx.meetingTypeIndex = selected;
      store.ctx.meetingType = types[selected].label;
      settleAndAdvance(step.question, types[selected].label);
    }

    wrap.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); selected = (selected + 1) % types.length; paint(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); selected = (selected - 1 + types.length) % types.length; paint(); }
      else if (/^[1-9]$/.test(e.key)) { const n = Number(e.key) - 1; if (n < types.length) { selected = n; choose(); } }
      else if (e.key === "Enter") { e.preventDefault(); choose(); }
    });

    paint();
    return wrap;
  }

  async function finish() {
    try {
      const res = await startSession({
        name: store.ctx.name,
        role: store.ctx.role,
        seniority: store.ctx.seniority,
        meetingTypeIndex: store.ctx.meetingTypeIndex,
        notes: store.ctx.notes || "",
      });
      try { localStorage.setItem("seroSessionId", res.sessionId); } catch {}
      // Stay on the one-page stage (no remount) — record the live session, then
      // flow straight into focus areas.
      setState({
        sessionId: res.sessionId,
        sessionDir: res.sessionDir || null,
        createdAt: res.createdAt ?? Date.now(),
      });
      runFocusPoints();
    } catch (e) {
      setState({ stage: STAGES.ERROR, error: e.message, retryStage: STAGES.ONEPAGE });
    }
  }

  // --- Focus areas (streamed) -------------------------------------------------

  function appendWorking(label) {
    const node = document.createElement("div");
    node.className = "flow-section flow-section--active";
    const orb = createOrb(label);
    node.appendChild(orb.el);
    appendSection(node);
    return { node, orb };
  }

  function failTo(message) {
    setState({ stage: STAGES.ERROR, error: message, retryStage: STAGES.ONEPAGE });
  }

  function runFocusPoints() {
    const working = appendWorking("Analyzing context…");
    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/focus-points/stream`);
    currentSse = sse;
    sse
      .on("thinking", (d) => working.orb.setLabel(d.label))
      .on("result", async (d) => {
        sse.close();
        currentSse = null;
        await working.orb.exit();
        working.node.remove();
        renderFocusPick(d);
      })
      .on("error", (d) => failTo(d.message || "Focus-point generation failed."))
      .onError(() => failTo("Lost connection while generating focus areas."))
      .open();
  }

  function renderFocusPick(d) {
    store.focusPoints = d.focus_points;
    const selectedIds = new Set();
    const node = document.createElement("div");
    node.className = "flow-section flow-section--active space-y-4";
    node.innerHTML = `
      <h2 class="h2 flow-q">What we'll cover</h2>
      <div class="focus-select-hint">Select at least one topic for this 1:1.</div>
      <div class="card focus-point-list">
        ${d.focus_points.map((fp, i) => `
          <div class="js-fp-wrapper">
            <button type="button" class="focus-point focus-point--selectable js-fp-toggle" data-fp-id="${escape(fp.id)}" aria-pressed="false" title="${escape(fp.reason || "")}">
              <div class="focus-point__num">${i + 1}</div>
              <div class="focus-point__body">
                <div class="focus-point__label">${escape(fp.label || fp.type || fp.id)}</div>
                ${fp.reason ? `<div class="focus-point__reason">${escape(focusReason(fp.reason))}</div>` : ""}
              </div>
              <div class="focus-point__check" aria-hidden="true"></div>
            </button>
          </div>
        `).join("")}
      </div>
      <div class="field__actions"><button class="btn js-continue" type="button" disabled>Continue to prep brief</button></div>
    `;
    appendSection(node);
    const cont = node.querySelector(".js-continue");

    node.querySelectorAll(".js-fp-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.fpId;
        if (selectedIds.has(id)) {
          selectedIds.delete(id); btn.classList.remove("is-selected"); btn.setAttribute("aria-pressed", "false");
        } else {
          selectedIds.add(id); btn.classList.add("is-selected"); btn.setAttribute("aria-pressed", "true");
        }
        cont.disabled = selectedIds.size === 0;
      });
    });

    cont.addEventListener("click", async () => {
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      cont.disabled = true;
      try { await setSelectedFocus(store.sessionId, ids); }
      catch (e) { console.warn("[onepage] focus save failed:", e.message); }
      const chosen = d.focus_points.filter((fp) => selectedIds.has(fp.id));
      store.focusPoints = chosen;
      const labels = chosen.map((fp) => fp.label || fp.type || fp.id).join(" · ");
      steps.replaceChild(settledNode("Focus areas", labels), node);
      runPreparation();
    });
  }

  // --- Prep brief (streamed) --------------------------------------------------

  function runPreparation() {
    const working = appendWorking("Preparing your prep brief…");
    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/preparation/stream`);
    currentSse = sse;
    sse
      .on("thinking", (d) => working.orb.setLabel(d.label))
      .on("result", async (d) => {
        sse.close();
        currentSse = null;
        await working.orb.exit();
        working.node.remove();
        setState({ preparation: d.brief, preparationRunId: d.runId });
        renderPrep(d.brief);
      })
      .on("error", (d) => failTo(d.message || "Preparation briefing failed."))
      .onError(() => failTo("Lost connection while generating the prep brief."))
      .open();
  }

  function renderPrep(brief) {
    const sections = PREP_VIEW_SECTIONS.filter((s) => {
      const v = brief[s.key];
      return Array.isArray(v) ? v.length : v && String(v).trim();
    });
    const node = document.createElement("div");
    node.className = "flow-section space-y-5";
    node.innerHTML = `
      <div class="eyebrow">Prep brief</div>
      <div class="card prep-brief">
        ${sections.map((s) => `
          <div class="prep-brief__row">
            <div class="eyebrow">${s.label}</div>
            ${renderPrepField(s.type, brief[s.key])}
          </div>
        `).join("")}
      </div>
      <div class="field__actions"><button class="btn js-to-interview" type="button">Continue to interview</button></div>
    `;
    appendSection(node);
    node.querySelector(".js-to-interview").addEventListener("click", (e) => {
      e.currentTarget.disabled = true;
      showRoleLanguage();
    });
  }

  // --- The language of this role (read the cached role profile's terminology) --

  async function showRoleLanguage() {
    let terms = [];
    let groups = [];
    try {
      const res = await getRoleProfile(store.sessionId);
      terms = Array.isArray(res?.terminology) ? res.terminology : [];
      groups = Array.isArray(res?.terminologyGroups) ? res.terminologyGroups : [];
    } catch (e) {
      console.warn("[onepage] role profile fetch failed:", e.message);
    }
    // Nothing to show (edge case) — never block the interview.
    if (!terms.length) { startInterviewFlow(); return; }

    const rowsHtml = (rows) => rows.map((t) => `
      <div class="flow-glossary__row">
        <div class="flow-glossary__term">${escape(t.term || "")}</div>
        <div class="flow-glossary__meaning">${escape(t.meaning || "")}</div>
      </div>
    `).join("");
    const sections = groupTerms(terms, groups);
    // Grouped when the role declared groups (Craft → Level → Role); otherwise the
    // original flat list, unchanged.
    const glossary = isGrouped(sections)
      ? `<div class="card flow-glossary-card">${sections.map((s) => `
          <div class="flow-glossary-group">
            <h3 class="flow-glossary-group__head eyebrow">${escape(s.label || "Other")}</h3>
            <div class="flow-glossary">${rowsHtml(s.rows)}</div>
          </div>
        `).join("")}</div>`
      : `<div class="card flow-glossary">${rowsHtml(terms)}</div>`;

    const node = document.createElement("div");
    node.className = "flow-section space-y-4";
    node.innerHTML = `
      <div class="eyebrow">The language of this role</div>
      <p class="hint">Words a ${escape(store.ctx.role || "this role")} uses — so you're speaking the same language.</p>
      ${glossary}
      <div class="field__actions"><button class="btn js-to-interview-2" type="button">Continue to interview</button></div>
    `;
    appendSection(node);
    node.querySelector(".js-to-interview-2").addEventListener("click", (e) => {
      e.currentTarget.disabled = true;
      startInterviewFlow();
    });
  }

  // --- Interview: build the bank, then the question loop grows down -----------

  function startInterviewFlow() {
    const working = appendWorking("Building questions…");
    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/bank/stream`);
    currentSse = sse;
    sse
      .on("thinking", (d) => working.orb.setLabel(d.label))
      .on("ready", async () => {
        sse.close();
        currentSse = null;
        await working.orb.exit();
        working.node.remove();
        startInterview();
      })
      .on("error", (d) => failTo(d.message || "Question generation failed."))
      .onError(() => failTo("Lost connection while building questions."))
      .open();
  }

  // The live-scores rail lives just below the growing questions and stays there.
  function startInterview() {
    const rail = document.createElement("div");
    rail.className = "flow-interview-rail l-stack l-stack--3";
    rail.innerHTML = `
      <div class="thinking-host min-h-[48px]"></div>
      <div class="js-note-host text-sm text-ink-mute"></div>
      <div class="axes-wrap space-y-2" aria-label="Live scores — updated each answer, not the final briefing">
        <div class="eyebrow">Live scores</div>
        <div class="card axes-host"></div>
      </div>
      <div><button class="btn btn--ghost btn--sm js-skip-brief" type="button">Skip to briefing</button></div>
    `;
    stageInner.appendChild(rail);
    interviewRail = rail;
    thinkingHost = rail.querySelector(".thinking-host");
    noteHost = rail.querySelector(".js-note-host");
    axes = createAxesPanel({ celebrate: false });
    axes.renderInitial(
      store.axes?.length
        ? store.axes
        : AXIS_ORDER.map((id) => ({ id, score: AXIS_SEED[id], lastDelta: 0, historyLen: 0 }))
    );
    rail.querySelector(".axes-host").appendChild(axes.el);
    rail.querySelector(".js-skip-brief").addEventListener("click", async () => {
      const ok = await confirmAction({
        message: "Skip the remaining questions and open the briefing now? Any unanswered questions will be dropped.",
        confirmLabel: "Open briefing",
        cancelLabel: "Keep questioning",
      });
      if (!ok) return;
      // Drop the on-screen (unanswered) question and run the briefing inline.
      if (activeQuestionCard) { activeQuestionCard.remove(); activeQuestionCard = null; }
      finishInterview();
    });
    showNextQuestion();
  }

  async function showNextQuestion() {
    if (thinkingHost) thinkingHost.innerHTML = "";
    if (noteHost) noteHost.textContent = "";
    let res;
    try { res = await getQuestion(store.sessionId); }
    catch (e) { failTo(e.message || "Couldn't load the next question."); return; }
    if (res.done) {
      if (res.agenda?.summary && res.agenda.covered == null) { showAgendaCheck(res.agenda); return; }
      finishInterview();
      return;
    }
    renderQuestion(res);
  }

  function renderQuestion(res) {
    const q = res.question;
    store.currentQuestion = q;
    const card = document.createElement("div");
    card.className = "flow-section flow-section--active space-y-4";
    card.innerHTML = `
      <div class="eyebrow">Question ${res.turn} of ${res.total}</div>
      <h2 class="question-stem leading-snug">${escape(q.name)}</h2>
      ${q.description ? `<div class="question-desc">${escape(q.description)}</div>` : ""}
      <label class="block">
        <span class="sr-only">Your notes</span>
        <textarea class="textarea textarea--question" rows="5" placeholder="Jot what they said — your shorthand, not a transcript" data-autofocus></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit" type="button">Submit answer</button>
        <button class="btn btn--ghost js-skip" type="button">Skip</button>
      </div>
      <p class="hint text-xs text-ink-mute">Enter to submit · Esc to skip</p>
    `;
    appendSection(card, { scrollTo: true, focus: true });
    activeQuestionCard = card;

    const ta = card.querySelector("textarea");
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(ta.value); }
    });
    if (activeEsc) document.removeEventListener("keydown", activeEsc);
    activeEsc = (e) => { if (e.key === "Escape") { e.preventDefault(); submit(""); } };
    document.addEventListener("keydown", activeEsc);
    card.querySelector(".js-submit").addEventListener("click", () => submit(ta.value));
    card.querySelector(".js-skip").addEventListener("click", () => submit(""));

    let submitting = false;
    async function submit(text) {
      if (submitting) return;
      const val = text.trim();
      submitting = true;
      if (activeEsc) { document.removeEventListener("keydown", activeEsc); activeEsc = null; }
      try { await submitAnswer(store.sessionId, val, { answerSource: "manual", alias: q.alias }); }
      catch (e) { failTo(e.message); return; }
      steps.replaceChild(settledNode(q.name, val || "(skipped)", { muted: !val }), card);
      activeQuestionCard = null;
      await runPlanStream(val);
    }
  }

  function showAgendaCheck(agenda) {
    const card = document.createElement("div");
    card.className = "flow-section flow-section--active space-y-4";
    card.innerHTML = `
      <div class="eyebrow">Before we wrap</div>
      <h2 class="question-stem leading-snug">Earlier they wanted to cover ${escape(agenda.summary)}. Did you get to it?</h2>
      <div class="field__actions">
        <button class="btn js-agenda-yes" type="button">Yes, covered</button>
        <button class="btn btn--ghost js-agenda-no" type="button">Not yet</button>
      </div>
    `;
    appendSection(card, { scrollTo: true });
    async function resolve(covered) {
      try { await setAgendaCovered(store.sessionId, covered); }
      catch (e) { console.warn("[onepage] agenda cover failed:", e.message); }
      steps.replaceChild(settledNode("Agenda check", covered ? "Covered" : "Not yet"), card);
      finishInterview();
    }
    card.querySelector(".js-agenda-yes").addEventListener("click", () => resolve(true));
    card.querySelector(".js-agenda-no").addEventListener("click", () => resolve(false));
  }

  async function runPlanStream(submittedText) {
    const skipped = submittedText.trim() === "";
    const orb = createOrb(skipped ? "Next question…" : "Scoring answer…");
    thinkingHost.appendChild(orb.el);
    requestAnimationFrame(() => orb.el.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" }));
    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/plan/stream`);
    currentSse = sse;
    let terminal = null;
    let noteShown = false;
    sse
      .on("thinking", (d) => orb.setLabel(d.label))
      .on("axes", async (d) => {
        await orb.exit();
        thinkingHost.innerHTML = "";
        axes.update(d.axes, { showDelta: true });
        store.axes = d.axes;
      })
      .on("note", (d) => {
        if (!d.note || noteShown || !noteHost) return;
        noteShown = true;
        noteHost.textContent = d.note;
      })
      .on("next", () => { terminal = "next"; })
      .on("done", () => { terminal = "done"; })
      .on("error", (d) => failTo(d.message || "Planning failed."))
      .onError(() => failTo("Lost connection while scoring the answer."))
      .open();

    // The planner takes as long as it takes (often 5–15s). Wait for its terminal
    // event; dead connections surface via onError, this long cap only catches a
    // hung-but-alive stream and fails loudly rather than advancing early.
    await sleep(1600);
    const started = Date.now();
    while (!terminal && Date.now() - started < 120000) await sleep(100);
    currentSse = null;
    if (terminal === "done") finishInterview();
    else if (terminal === "next") showNextQuestion();
    else { sse.close(); failTo("Scoring this answer is taking too long — the connection may be stuck."); }
  }

  // The interview's done — clear its live-scores rail and key handlers, then run
  // synthesis + the final briefing as the closing sections of this same page
  // (no jump to a separate screen).
  function finishInterview() {
    if (activeEsc) { document.removeEventListener("keydown", activeEsc); activeEsc = null; }
    if (interviewRail) { interviewRail.remove(); interviewRail = null; }
    runEvaluation();
  }

  function runEvaluation() {
    if (currentSse) { currentSse.close(); currentSse = null; }
    const working = appendWorking("Writing the brief…");
    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/evaluation/stream`);
    currentSse = sse;
    sse
      .on("thinking", (d) => working.orb.setLabel(d.label))
      .on("briefing", async (d) => {
        sse.close();
        currentSse = null;
        await working.orb.exit();
        working.node.remove();
        store.briefing = d;
        // Record the briefing WITHOUT a stage change so the router doesn't
        // remount us off the one-page flow (main.js re-renders on stage/tick).
        setState({ briefing: d, completedAt: d.completedAt ?? store.completedAt ?? null });
        await renderBriefing(d);
      })
      .on("error", (d) => failTo(d.message || "Evaluation failed."))
      .onError(() => failTo("Lost connection during synthesis."))
      .open();
  }

  // Reuse the existing briefing renderer, mounted into the closing section.
  async function renderBriefing() {
    const section = document.createElement("div");
    section.className = "flow-section flow-briefing";
    steps.appendChild(section);
    try {
      const mod = await import("./briefing.js");
      await mod.mount(section, { store, setState, resetSession });
    } catch (e) {
      console.error("[onepage] inline briefing render failed:", e);
      failTo("Couldn't render the briefing.");
      return;
    }
    requestAnimationFrame(() => section.scrollIntoView({ behavior: scrollBehavior(), block: "start" }));
  }

  // First step — no scroll, just reveal + focus.
  place(renderActive(SETUP[0]), { scrollTo: false });
}

export function unmount() {
  if (teardown) teardown();
  teardown = null;
}

function focusReason(text) {
  const trimmed = String(text == null ? "" : text).trim();
  if (!trimmed) return "";
  const first = trimmed.match(/^(.+?[.!?])(?:\s|$)/)?.[1];
  return first || trimmed;
}

function renderPrepField(type, value) {
  if (type === "bullets" && Array.isArray(value)) {
    return `<ul class="prep-list">${value.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`;
  }
  if (type === "callout") {
    return `<blockquote class="prep-callout">${escape(value || "")}</blockquote>`;
  }
  return `<p class="text-ink leading-relaxed">${escape(value || "")}</p>`;
}
