import { STAGES, resetSession } from "../state.js";
import { getMeetingTypes, startSession } from "../api.js";
import { swapField, focusField } from "../ui/field.js";
import { confirmAction } from "../ui/confirm.js";
import { confirmResetSession } from "../ui/session-reset.js";

const SUBSTAGES = ["NAME", "ROLE", "SENIORITY", "MEETING_TYPE", "NOTES"];

const STEP_NAMES = {
  NAME: "Name",
  ROLE: "Role",
  SENIORITY: "Seniority",
  MEETING_TYPE: "Meeting type",
  NOTES: "Context notes",
};

const COPY = {
  NAME: {
    question: "Who are you prepping for?",
    hint: "Their first name is enough.",
    placeholder: "e.g. Priya",
    key: "name",
  },
  ROLE: {
    question: "What do they do?",
    hint: "Their role as you'd say it out loud.",
    placeholder: "e.g. Senior backend engineer",
    key: "role",
  },
  SENIORITY: {
    question: "And their seniority?",
    hint: "IC level, staff, manager, director — whatever reads naturally.",
    placeholder: "e.g. Senior / Staff / Lead",
    key: "seniority",
  },
  NOTES: {
    question: "Anything Sero should know?",
    placeholder: "e.g. They've been working late. Something feels off.",
    key: "notes",
  },
};

export async function mount(root, { store, setState }) {
  root.innerHTML = `
    <div class="stage-inner space-y-10">
      <header class="space-y-3">
        <div class="intake-header__row">
          <div class="space-y-1 min-w-0">
            <div class="eyebrow">Setup</div>
            <div class="stage-step text-sm text-ink-mute"></div>
          </div>
          <button class="btn btn--ghost js-start-fresh flex-shrink-0" type="button">Cancel setup</button>
        </div>
        <p class="text-ink-dim text-sm max-w-measure">Sero prepares and runs a 1:1 interview, then writes a manager briefing.</p>
        <div class="intake-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${SUBSTAGES.length}" aria-valuenow="1">
          <div class="intake-progress__fill"></div>
        </div>
      </header>
      <div class="field-host"></div>
    </div>
  `;
  const host = root.querySelector(".field-host");
  const stepLabel = root.querySelector(".stage-step");
  const progressBar = root.querySelector(".intake-progress");
  const progressFill = root.querySelector(".intake-progress__fill");

  root.querySelector(".js-start-fresh").addEventListener("click", async () => {
    const ok = await confirmResetSession(confirmAction, { to: STAGES.START });
    if (!ok) return;
    resetSession();
    setState({ stage: STAGES.START });
  });

  let types = null;
  let currentSub = store.substage || "NAME";

  function refreshStep() {
    const idx = SUBSTAGES.indexOf(currentSub) + 1;
    stepLabel.textContent = `Step ${idx} of ${SUBSTAGES.length} — ${STEP_NAMES[currentSub]}`;
    progressBar.setAttribute("aria-valuenow", String(idx));
    progressFill.style.width = `${(idx / SUBSTAGES.length) * 100}%`;
  }

  refreshStep();

  function renderField(name) {
    if (name === "MEETING_TYPE") return renderMeetingType();
    if (name === "NOTES") return renderTextarea(name);
    return renderInput(name);
  }

  function renderInput(name) {
    const cfg = COPY[name];
    const wrap = document.createElement("div");
    wrap.className = "space-y-4";
    wrap.innerHTML = `
      <label class="block">
        <h1 class="h1 mb-4">${cfg.question}</h1>
        <input class="input" type="text" autocomplete="off"
               spellcheck="false" placeholder="${cfg.placeholder}" data-autofocus />
      </label>
      <div class="hint">${cfg.hint}</div>
      <div class="error-msg text-negative text-sm" hidden></div>
      <div class="field-actions">
        <button class="btn js-next">Continue</button>
      </div>
    `;
    const input = wrap.querySelector("input");
    input.value = store.ctx[cfg.key] || "";
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitInput();
      }
    });

    wrap.querySelector(".js-next").addEventListener("click", submitInput);

    function submitInput() {
      const val = input.value.trim();
      const err = wrap.querySelector(".error-msg");
      if (!val) {
        err.textContent = "Add a value to continue.";
        err.hidden = false;
        return;
      }
      err.hidden = true;
      store.ctx[cfg.key] = val;
      advance();
    }
    return wrap;
  }

  function renderTextarea(name) {
    const cfg = COPY[name];
    const wrap = document.createElement("div");
    wrap.className = "space-y-4";
    wrap.innerHTML = `
      <label class="block">
        <h1 class="h1 mb-4">${cfg.question}</h1>
        <textarea class="textarea" rows="4" placeholder="${cfg.placeholder}" data-autofocus></textarea>
      </label>
      <div class="field-actions">
        <button class="btn js-submit">Continue</button>
        <button class="btn btn--ghost js-skip">Skip (optional)</button>
      </div>
    `;
    const ta = wrap.querySelector("textarea");
    ta.value = store.ctx.notes || "";
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        store.ctx.notes = ta.value.trim();
        submit();
      }
    });
    wrap.querySelector(".js-submit").addEventListener("click", () => {
      store.ctx.notes = ta.value.trim();
      submit();
    });
    wrap.querySelector(".js-skip").addEventListener("click", () => {
      store.ctx.notes = "";
      submit();
    });
    return wrap;
  }

  function renderMeetingType() {
    const wrap = document.createElement("div");
    wrap.className = "space-y-5";
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("data-autofocus", "");
    wrap.innerHTML = `
      <h1 class="h1 mb-2">What kind of meeting?</h1>
      <div class="hint mb-3">Pick the shape that fits today. Click a card to continue — you can add nuance in the notes step.</div>
      <div class="grid gap-3 js-cards"></div>
    `;
    const cards = wrap.querySelector(".js-cards");
    let selected = Number.isInteger(store.ctx.meetingTypeIndex) ? store.ctx.meetingTypeIndex : 0;

    function paint() {
      cards.innerHTML = "";
      types.forEach((t, i) => {
        const btn = document.createElement("button");
        btn.className = "meeting-card";
        if (i === selected) btn.classList.add("is-selected");
        btn.setAttribute("data-i", String(i));
        btn.innerHTML = `
          <div>
            <span class="meeting-card__label">${t.label}</span>
            ${t.badge ? `<span class="meeting-card__badge">${t.badge}</span>` : ""}
          </div>
          <div class="meeting-card__meta">${t.duration} · ${t.description}</div>
        `;
        btn.addEventListener("click", () => {
          selected = i;
          paint();
          confirm();
        });
        cards.appendChild(btn);
      });
    }

    function confirm() {
      store.ctx.meetingTypeIndex = selected;
      store.ctx.meetingType = types[selected].label;
      advance();
    }

    paint();

    wrap.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        selected = (selected + 1) % types.length;
        paint();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        selected = (selected - 1 + types.length) % types.length;
        paint();
      } else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1;
        if (n < types.length) {
          selected = n;
          paint();
          confirm();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirm();
      }
    });

    return wrap;
  }

  async function advance() {
    const idx = SUBSTAGES.indexOf(currentSub);
    const next = SUBSTAGES[idx + 1];
    if (!next) return submit();
    currentSub = next;
    refreshStep();
    const node = await swapField(host, () => renderField(next));
    focusField(node);
  }

  async function submit() {
    try {
      const payload = {
        name: store.ctx.name,
        role: store.ctx.role,
        seniority: store.ctx.seniority,
        meetingTypeIndex: store.ctx.meetingTypeIndex,
        notes: store.ctx.notes || "",
      };
      const res = await startSession(payload);
      try { localStorage.setItem("seroSessionId", res.sessionId); } catch {}
      setState({
        sessionId: res.sessionId,
        sessionDir: res.sessionDir || null,
        createdAt: res.createdAt ?? Date.now(),
        stage: STAGES.FOCUS_POINTS,
      });
    } catch (e) {
      setState({ stage: STAGES.ERROR, error: e.message, retryStage: STAGES.INTAKE });
    }
  }

  try {
    const res = await getMeetingTypes();
    types = res.types;
  } catch (e) {
    types = [];
  }

  const node = await swapField(host, () => renderField(currentSub));
  focusField(node);
}

export function unmount() { /* nothing */ }
