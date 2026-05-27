import { STAGES } from "../state.js";
import { listRecentRuns, getRunOverview, deleteRun } from "../api.js";
import { createPipelineChangelog } from "../ui/pipeline-changelog.js";

let keyHandler = null;

export async function mount(root, { setState, rehydrateById }) {
  const pipeline = createPipelineChangelog();

  root.innerHTML = `
    <div class="stage-inner space-y-8">
      <header class="space-y-2">
        <h1 class="h1">Start a run</h1>
        <div class="text-ink-dim text-sm">Pick up where you left off, or start fresh.</div>
      </header>

      <div class="js-pipeline-host"></div>

      <section class="space-y-2">
        <div class="text-ink-mute text-xs uppercase tracking-wider">Recent runs</div>
        <ul class="js-runs space-y-2"></ul>
      </section>

      <div>
        <button class="btn js-new">Start new run</button>
        <span class="text-ink-mute text-sm ml-3"><span class="kbd">Enter</span> to start</span>
      </div>
    </div>
  `;

  root.querySelector(".js-pipeline-host").appendChild(pipeline.el);

  const list = root.querySelector(".js-runs");
  const newBtn = root.querySelector(".js-new");

  let runs = [];
  let expandedId = null;
  let currentAllDigest = null;

  async function loadPipelineStatus() {
    try {
      const s = await pipeline.loadForBaseline("latest");
      currentAllDigest = s?.current?.aggregates?.all ?? null;
    } catch (e) {
      console.warn("[start] pipeline status failed:", e);
      currentAllDigest = null;
    }
  }

  function driftDot(run) {
    if (!currentAllDigest || !run.pipelineDigest?.all) return "";
    if (run.pipelineDigest.all !== currentAllDigest) {
      return `<span class="run-row__drift-dot" title="Pipeline config differs from when this run started"></span>`;
    }
    return "";
  }

  function render() {
    if (runs.length === 0) {
      list.innerHTML = `<li class="text-ink-mute text-sm italic">No past runs yet.</li>`;
      return;
    }
    list.innerHTML = runs.map((r, i) => `
      <li class="run-row" data-id="${escape(r.id)}">
        <button class="run-row__head js-row" data-id="${escape(r.id)}">
          <span class="run-row__num">[${i + 1}]</span>
          <span class="run-row__headline">${escape(r.headline || r.id)}${driftDot(r)}</span>
          <span class="run-row__stage text-ink-mute text-xs">${escape(r.stage || "")}</span>
        </button>
        <div class="run-row__body js-body" data-id="${escape(r.id)}" hidden></div>
      </li>
    `).join("");
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
      return;
    }
    if (expandedId) collapse(expandedId);
    expandedId = id;
    const body = list.querySelector(`.js-body[data-id="${cssEscape(id)}"]`);
    if (!body) return;
    body.hidden = false;
    body.innerHTML = `<div class="text-ink-mute text-sm">Loading…</div>`;
    try {
      const o = await getRunOverview(id);
      let driftHtml = "";
      try {
        const drift = await pipeline.loadDriftForRun(id);
        if (drift.baseline?.hasLock && !drift.unchanged) {
          driftHtml = `<p class="run-row__drift text-sm">Config changed since this run started — resume uses current engine.</p>`;
        }
      } catch {}
      body.innerHTML = `
        <div class="run-row__overview text-ink text-sm">${escape(o.overview || "")}</div>
        ${driftHtml}
        <div class="run-row__actions">
          <button class="btn js-resume" data-id="${escape(id)}">Resume</button>
          <button class="btn btn--ghost js-delete" data-id="${escape(id)}">Delete</button>
          <span class="text-ink-mute text-xs ml-2">R · D · Esc</span>
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
      alert("Could not resume that run.");
    }
  }

  async function del(id) {
    if (!confirm("Delete this run permanently? This cannot be undone.")) return;
    try {
      await deleteRun(id);
    } catch (e) {
      alert("Delete failed: " + (e.message || e));
      return;
    }
    if (expandedId === id) expandedId = null;
    await load();
  }

  function startNew() {
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  }

  list.addEventListener("click", (e) => {
    const headBtn = e.target.closest(".js-row");
    if (headBtn) { toggle(headBtn.dataset.id); return; }
    const resumeBtn = e.target.closest(".js-resume");
    if (resumeBtn) { resume(resumeBtn.dataset.id); return; }
    const delBtn = e.target.closest(".js-delete");
    if (delBtn) { del(delBtn.dataset.id); return; }
  });

  newBtn.addEventListener("click", startNew);

  keyHandler = (e) => {
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === "Enter") { e.preventDefault(); startNew(); return; }
    if (e.key === "Escape") {
      if (expandedId) { collapse(expandedId); expandedId = null; }
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1;
      if (runs[idx]) toggle(runs[idx].id);
      return;
    }
    if (!expandedId) return;
    if (e.key.toLowerCase() === "r") { resume(expandedId); }
    else if (e.key.toLowerCase() === "d") { del(expandedId); }
  };
  window.addEventListener("keydown", keyHandler);

  await load();
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
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
