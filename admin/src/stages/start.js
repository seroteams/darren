// The ADMIN app's start screen: the shared benchless core (start-core.js) plus
// the internal persona bench — demo personas + replay test runs (frontend-admin-split
// Phase 3 / F-005). The bench lives ONLY here: the customer app's stage map imports
// start-core.js directly, so none of this file (markup, persona API calls) reaches
// the customer bundle. Only the internal `admin` role gets the bench; a manager on
// the admin app still gets the clean core dashboard.
import { STAGES, store, isInternalAdmin } from "../state.js";
import { getPersonaBench, startSession } from "../../../shared/api.js";
import { alertAction } from "../ui/confirm.js";
import { escapeHtml as escape } from "../ui/html.js";
import { mount as mountCore, unmount as unmountCore } from "./start-core.js";

const BENCH_HTML = `
      <section class="js-bench" hidden>
        <div class="card-flat space-y-3">
          <div>
            <div class="eyebrow">Demo persona</div>
            <p class="text-ink-dim mt-1">Sample employee context — or leave blank for your own setup.</p>
          </div>
          <div class="bench-select-wrap">
            <select class="bench-select js-bench-select" aria-label="Demo persona" disabled>
            <option value="">Select a persona…</option>
            </select>
          </div>
          <div class="js-persona-review card-flat space-y-2" hidden>
            <div class="eyebrow js-persona-review-title">Session setup</div>
            <div class="text-ink js-persona-summary"></div>
            <div>
              <div class="eyebrow">What Sero should know</div>
              <p class="text-ink-dim js-persona-notes"></p>
            </div>
            <p class="text-sm text-ink-mute js-persona-footer"></p>
          </div>
          <div class="space-y-2">
            <div class="eyebrow">How to run</div>
            <p class="text-ink-dim">Manual or scripted replay — each persona supports both.</p>
          </div>
          <div class="bench-flows" role="radiogroup" aria-label="Demo run flow">
            <button type="button" class="bench-flow js-mode is-active" data-mode="manual" role="radio" aria-checked="true">
              <span class="bench-flow__pick" aria-hidden="true"></span>
              <span class="bench-flow__head">
                <span class="bench-flow__title">Manual</span>
                <span class="bench-flow__tag">You drive</span>
              </span>
              <span class="bench-flow__desc">Answer each question yourself, like a real 1:1 prep session.</span>
              <span class="bench-flow__meta">No persona? Continue to setup and fill everything in yourself.</span>
            </button>
            <button type="button" class="bench-flow js-mode" data-mode="scripted" role="radio" aria-checked="false">
              <span class="bench-flow__pick" aria-hidden="true"></span>
              <span class="bench-flow__head">
                <span class="bench-flow__title">Replay test run</span>
                <span class="bench-flow__tag">Fixed script</span>
              </span>
              <span class="bench-flow__desc">Uses fixed questions and fixed answers so prompt changes are comparable.</span>
              <span class="bench-flow__meta">Focus, prep, and final recap still run live.</span>
            </button>
          </div>
          <label class="js-runlabel-wrap" hidden>
            <span class="eyebrow">What are you testing? <span class="text-ink-mute">(optional label)</span></span>
            <input class="input js-runlabel" type="text" autocomplete="off" placeholder="e.g. baseline — no Neutral Cause Rule" />
          </label>
          <button type="button" class="btn js-bench-start" disabled>Start demo session</button>
          <p class="js-bench-err text-negative text-sm" hidden></p>
        </div>
      </section>
`;

async function wireBench(root, { setState, beginCleanSetup }) {
  const benchSection = root.querySelector(".js-bench");
  const benchSelect = root.querySelector(".js-bench-select");
  const benchStartBtn = root.querySelector(".js-bench-start");
  const benchErr = root.querySelector(".js-bench-err");
  const modeBtns = [...root.querySelectorAll(".js-mode")];
  const runLabelWrap = root.querySelector(".js-runlabel-wrap");
  const runLabelInput = root.querySelector(".js-runlabel");
  const personaReview = root.querySelector(".js-persona-review");
  const personaReviewTitle = root.querySelector(".js-persona-review-title");
  const personaSummary = root.querySelector(".js-persona-summary");
  const personaNotes = root.querySelector(".js-persona-notes");
  const personaFooter = root.querySelector(".js-persona-footer");
  let benchMode = "manual";

  let personas = [];

  function personaOptionLabel(p) {
    return `${p.displayName} · ${p.issue}`;
  }

  function personaOptionTitle(p) {
    return `${p.displayName} · ${p.seniority} · ${p.meeting_type} · ${p.issue}`;
  }

  function updateBenchStartEnabled() {
    const hasPersona = Boolean(benchSelect.value);
    const benchReady = personas.length > 0;
    if (benchMode === "scripted") {
      benchStartBtn.disabled = !hasPersona || !benchReady;
      benchStartBtn.textContent = "Start replay test";
    } else {
      benchStartBtn.disabled = !benchReady;
      benchStartBtn.textContent = hasPersona ? "Start demo session" : "Continue to setup";
    }
    renderPersonaReview();
  }

  function renderPersonaReview() {
    const p = personas.find((x) => x.id === benchSelect.value);
    const show = Boolean(p);
    personaReview.hidden = !show;
    if (!show || !p) return;
    personaReviewTitle.textContent = benchMode === "scripted" ? "Replay setup" : "Session setup";
    personaSummary.textContent = `${p.displayName} · ${p.seniority} · ${p.role} · ${p.meeting_type}`;
    personaNotes.textContent = p.notes || "(no manager context provided)";
    personaFooter.textContent = benchMode === "scripted"
      ? "This locks the interview questions and scripted answers. You will still review focus areas, prep, and the final recap."
      : "Setup context is pre-filled. You'll answer each question yourself.";
  }

  async function loadPersonas() {
    try {
      const res = await getPersonaBench();
      personas = res.personas || [];
      benchSelect.innerHTML = `<option value="">Select a persona…</option>` +
        personas.map((p) =>
          `<option value="${escape(p.id)}" title="${escape(personaOptionTitle(p))}">${escape(personaOptionLabel(p))}</option>`
        ).join("");
      benchSelect.disabled = personas.length === 0;
      benchSection.hidden = false;
      benchErr.hidden = true;
      updateBenchStartEnabled();
    } catch (e) {
      console.warn("[start] getPersonaBench failed:", e);
      benchErr.textContent = "Couldn't load demo personas.";
      benchErr.hidden = false;
      benchSection.hidden = false;
    }
  }

  async function startWithPersona() {
    const p = personas.find((x) => x.id === benchSelect.value);
    if (!p || p.meetingTypeIndex < 0) return;

    benchStartBtn.disabled = true;
    try {
      store.ctx.name = p.name;
      store.ctx.role = p.role;
      store.ctx.seniority = p.seniority;
      store.ctx.meetingTypeIndex = p.meetingTypeIndex;
      store.ctx.meetingType = p.meeting_type;
      store.ctx.notes = p.notes;

      store.scripted = benchMode === "scripted"
        ? {
            mode: "scripted",
            personaId: p.id,
            fallback: p.scripted_fallback || "",
            answers: Object.fromEntries((p.script || []).map((s) => [s.alias, s.answer])),
          }
        : null;

      const res = await startSession({
        name: p.name,
        role: p.role,
        seniority: p.seniority,
        meetingTypeIndex: p.meetingTypeIndex,
        notes: p.notes,
        mode: benchMode,
        runLabel: benchMode === "scripted" ? runLabelInput.value : null,
        personaId: p.id,
      });
      try { localStorage.setItem("seroSessionId", res.sessionId); } catch {}
      setState({
        sessionId: res.sessionId,
        sessionDir: res.sessionDir || null,
        createdAt: res.createdAt ?? Date.now(),
        stage: STAGES.FOCUS_POINTS,
      });
    } catch (e) {
      await alertAction({ message: "Could not start session: " + (e.message || e) });
    } finally {
      updateBenchStartEnabled();
    }
  }

  function setMode(mode) {
    benchMode = mode === "scripted" ? "scripted" : "manual";
    modeBtns.forEach((b) => {
      const on = b.dataset.mode === benchMode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", String(on));
    });
    runLabelWrap.hidden = benchMode !== "scripted";
    updateBenchStartEnabled();
  }

  async function onBenchStart() {
    if (benchMode === "manual" && !benchSelect.value) {
      beginCleanSetup();
      return;
    }
    await startWithPersona();
  }

  benchSelect.addEventListener("change", updateBenchStartEnabled);
  benchStartBtn.addEventListener("click", onBenchStart);
  modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  await loadPersonas();
}

export async function mount(root, ctx) {
  // Managers never load the persona bench — only the internal `admin` role.
  const internal = isInternalAdmin(store.user);
  await mountCore(root, ctx, internal ? { html: BENCH_HTML, wire: wireBench } : null);
}

export function unmount() {
  unmountCore();
}
