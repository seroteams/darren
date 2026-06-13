// One-page run — the whole flow on a single page that grows downward.
// You answer; the next question appears below; answered steps settle into a
// locked "answered" look (not a greyed-out disabled box).
//
// Phase 1 covers setup only: name -> role -> seniority -> meeting type -> notes,
// then creates the session (same startSession as a normal run) and shows a
// "ready" section. Focus points / prep / interview / briefing land here in later
// phases. Reuses api.js, reveal.js, and the existing design-system classes.

import { STAGES, resetSession } from "../state.js";
import { getMeetingTypes, startSession } from "../api.js";
import { focusField } from "../ui/field.js";
import { revealOne } from "../ui/reveal.js";
import { confirmAction } from "../ui/confirm.js";
import { confirmResetSession } from "../ui/session-reset.js";

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

export async function mount(root, { store, setState }) {
  root.classList.add("flow-page");
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="space-y-3">
        <div class="intake-header__row">
          <div class="space-y-1 min-w-0">
            <div class="eyebrow">One-page run</div>
            <p class="text-ink-dim text-sm js-flow-lede">Everything on one page. Answer each step and the next appears below.</p>
          </div>
          <button class="btn btn--ghost js-cancel flex-shrink-0" type="button">Cancel</button>
        </div>
      </header>
      <div class="flow-steps l-stack l-stack--6"></div>
    </div>
  `;

  const steps = root.querySelector(".flow-steps");

  root.querySelector(".js-cancel").addEventListener("click", async () => {
    const ok = await confirmResetSession(confirmAction, { to: STAGES.START });
    if (!ok) return;
    resetSession();
    setState({ stage: STAGES.START });
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

  // Replace the current active step with its settled version, then append + reveal
  // the next active step (or finish). `scrollTo` is false for the very first step.
  function place(nextNode, { scrollTo = true } = {}) {
    nextNode.classList.add("field-enter");
    steps.appendChild(nextNode);
    activeNode = nextNode;
    revealOne(nextNode);
    if (scrollTo) {
      requestAnimationFrame(() => nextNode.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    focusField(nextNode);
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
        <button class="btn btn--ghost js-skip" type="button">Skip (optional)</button>
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
      // Stay on the one-page stage (no remount) — just record the live session.
      setState({
        sessionId: res.sessionId,
        sessionDir: res.sessionDir || null,
        createdAt: res.createdAt ?? Date.now(),
      });
      const ready = settledNode(
        "Setup saved",
        "Your one-page run is ready. The focus areas, prep brief, interview and briefing land right here next.",
      );
      ready.classList.add("flow-ready", "field-enter");
      steps.appendChild(ready);
      revealOne(ready);
      requestAnimationFrame(() => ready.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setState({ stage: STAGES.ERROR, error: e.message, retryStage: STAGES.ONEPAGE });
    }
  }

  // First step — no scroll, just reveal + focus.
  place(renderActive(SETUP[0]), { scrollTo: false });
}

export function unmount() { /* nothing */ }
