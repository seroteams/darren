import { STAGES, store } from "../state.js";
import { listRecentRuns, getRunOverview, deleteRun, getPersonaBench, startSession, getPipelineStatus } from "../api.js";
import { confirmAction, alertAction } from "../ui/confirm.js";
import { stageLabel } from "../ui/stage-labels.js";

let keyHandler = null;

export async function mount(root, { setState, rehydrateById }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Start a 1:1 prep session</h1>
        <div class="text-ink-dim text-sm">Resume a session or start a new one.</div>
      </header>

      <section class="js-bench" hidden>
        <div class="card-flat space-y-3">
          <div>
            <div class="eyebrow">Demo persona</div>
            <p class="text-ink-dim text-sm mt-1">Sample employee context — or leave blank for your own setup.</p>
          </div>
          <div class="bench-select-wrap">
            <select class="bench-select js-bench-select" disabled>
            <option value="">Select a persona…</option>
            </select>
          </div>
          <div class="js-persona-review card-flat space-y-2" hidden>
            <div class="eyebrow js-persona-review-title">Session setup</div>
            <div class="text-sm text-ink js-persona-summary"></div>
            <div>
              <div class="eyebrow">What Sero should know</div>
              <p class="text-sm text-ink-dim js-persona-notes"></p>
            </div>
            <p class="text-xs text-ink-mute js-persona-footer"></p>
          </div>
          <div class="space-y-2">
            <div class="eyebrow">How to run</div>
            <p class="text-ink-dim text-sm">Manual or scripted replay — each persona supports both.</p>
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
              <span class="bench-flow__meta">Focus, prep, and final briefing still run live.</span>
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

      <section class="space-y-2">
        <div class="eyebrow">Recent sessions</div>
        <ul class="js-runs space-y-2"></ul>
      </section>

      <div class="start-cta">
        <button type="button" class="btn js-new">New session</button>
        <button type="button" class="btn btn--ghost js-compare">Compare runs</button>
      </div>
    </div>
  `;

  const list = root.querySelector(".js-runs");
  const newBtn = root.querySelector(".js-new");
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

  let runs = [];
  let expandedId = null;
  let currentAllDigest = null;

  async function loadPipelineStatus() {
    try {
      const s = await getPipelineStatus("latest");
      currentAllDigest = s?.current?.aggregates?.all ?? null;
    } catch (e) {
      console.warn("[start] pipeline status failed:", e);
      currentAllDigest = null;
    }
  }

  function driftDot(run) {
    if (!currentAllDigest || !run.pipelineDigest?.all) return "";
    if (run.pipelineDigest.all !== currentAllDigest) {
      return `<span class="run-row__drift-dot" title="Engine config changed since this run"></span>`;
    }
    return "";
  }

  function reviewChip(run) {
    if (run.reviewStatus === "complete") return ` <span class="run-row__review run-row__review--done" title="Reviewed">Reviewed ✓</span>`;
    if (run.reviewStatus === "partial") return ` <span class="run-row__review run-row__review--partial" title="Review in progress">Review · partial</span>`;
    return "";
  }

  function render() {
    if (runs.length === 0) {
      list.innerHTML = `<li class="text-ink-mute text-sm">No past sessions yet. Press <kbd class="kbd">Enter</kbd> or click <strong>New session</strong> to start.</li>`;
      return;
    }
    list.innerHTML = runs.map((r) => {
      const isOpen = expandedId === r.id;
      return `
      <li class="run-row" data-id="${escape(r.id)}">
        <button class="run-row__head js-row" data-id="${escape(r.id)}" aria-expanded="${isOpen}">
          <span class="run-row__chevron" aria-hidden="true">${isOpen ? "▼" : "▶"}</span>
          <span class="run-row__headline">${escape(r.headline || r.id)}${driftDot(r)}${reviewChip(r)}</span>
          <span class="run-row__meta text-ink-mute text-xs">${escape(formatRelativeTime(r.lastSeenAt))} · ${escape(stageLabel(r.stage))}</span>
        </button>
        <div class="run-row__body js-body" data-id="${escape(r.id)}" hidden></div>
      </li>
    `;
    }).join("");
  }

  async function load() {
    try {
      const res = await listRecentRuns(3);
      runs = res.runs || [];
    } catch (e) {
      runs = [];
      console.warn("[start] listRecentRuns failed:", e);
    }
    await loadPipelineStatus();
    render();
  }

  async function toggle(id) {
    if (expandedId === id) {
      collapse(id);
      expandedId = null;
      render();
      return;
    }
    if (expandedId) collapse(expandedId);
    expandedId = id;
    render();
    const body = list.querySelector(`.js-body[data-id="${cssEscape(id)}"]`);
    if (!body) return;
    body.hidden = false;
    body.innerHTML = `<div class="text-ink-mute text-sm">Loading…</div>`;
    try {
      const o = await getRunOverview(id);
      let driftHtml = "";
      try {
        const drift = await getPipelineStatus(id);
        if (drift.baseline?.hasLock && !drift.unchanged) {
          driftHtml = `<p class="run-row__drift text-sm">Engine config changed since this run — resume uses current engine.</p>`;
        }
      } catch {}
      const run = runs.find((x) => x.id === id);
      const finished = run?.stage === "BRIEFING";
      body.innerHTML = `
        <div class="run-row__overview text-ink text-sm">${escape(o.overview || "")}</div>
        ${driftHtml}
        <div class="run-row__actions">
          ${finished
            ? `<button class="btn js-review" data-id="${escape(id)}">Review</button>`
            : `<button class="btn js-resume" data-id="${escape(id)}">Resume</button>`}
          <button class="btn btn--ghost js-delete" data-id="${escape(id)}">Delete</button>
        </div>
      `;
    } catch (e) {
      body.innerHTML = `<div class="text-ink-mute text-sm">Failed to load overview.</div>`;
    }
  }

  function collapse(id) {
    const body = list.querySelector(`.js-body[data-id="${cssEscape(id)}"]`);
    if (body) {
      body.hidden = true;
      body.innerHTML = "";
    }
  }

  async function resume(id) {
    const ok = await rehydrateById(id);
    if (!ok) {
      await alertAction({ message: "Could not resume that session. It may have been deleted or expired." });
    }
  }

  function review(id) {
    setState({ reviewRunId: id, stage: STAGES.REVIEW_RUN });
  }

  async function del(id) {
    const ok = await confirmAction({
      message: "Delete this session permanently? This cannot be undone.",
      confirmLabel: "Delete session",
      cancelLabel: "Keep session",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteRun(id);
    } catch (e) {
      await alertAction({ message: "Delete failed: " + (e.message || e) });
      return;
    }
    if (expandedId === id) expandedId = null;
    await load();
  }

  const emptyCtx = () => ({
    name: "",
    role: "",
    seniority: "",
    meetingType: "",
    meetingTypeIndex: null,
    notes: "",
  });

  function beginCleanSetup() {
    store.scripted = null;
    Object.assign(store.ctx, emptyCtx());
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  }

  function startNew() {
    beginCleanSetup();
  }

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
      ? "This locks the interview questions and scripted answers. You will still review focus areas, prep, and the final briefing."
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

  list.addEventListener("click", (e) => {
    const headBtn = e.target.closest(".js-row");
    if (headBtn) { toggle(headBtn.dataset.id); return; }
    const resumeBtn = e.target.closest(".js-resume");
    if (resumeBtn) { resume(resumeBtn.dataset.id); return; }
    const reviewBtn = e.target.closest(".js-review");
    if (reviewBtn) { review(reviewBtn.dataset.id); return; }
    const delBtn = e.target.closest(".js-delete");
    if (delBtn) { del(delBtn.dataset.id); return; }
  });

  newBtn.addEventListener("click", startNew);
  root.querySelector(".js-compare").addEventListener("click", () => setState({ stage: STAGES.COMPARE }));

  keyHandler = (e) => {
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === "Enter") { e.preventDefault(); startNew(); return; }
    if (e.key === "Escape") {
      if (expandedId) { collapse(expandedId); expandedId = null; render(); }
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (runs[idx]) toggle(runs[idx].id);
      return;
    }
    if (!expandedId) return;
    if (e.key.toLowerCase() === "r") {
      const run = runs.find((x) => x.id === expandedId);
      if (run?.stage === "BRIEFING") review(expandedId);
      else resume(expandedId);
    }
    else if (e.key.toLowerCase() === "d") { del(expandedId); }
  };
  window.addEventListener("keydown", keyHandler);

  await Promise.all([load(), loadPersonas()]);
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - Number(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
