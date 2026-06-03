import { STAGES } from "../state.js";
import { listRecentRuns, getRunFull, suggestFix } from "../api.js";

const FIX_STAGES = ["focus_points", "preparation", "bank", "questioning", "evaluation"];

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner space-y-5">
      <header class="space-y-1">
        <div class="eyebrow">Test lane</div>
        <h1 class="h1">Compare runs</h1>
        <p class="text-ink-dim text-sm">Same persona, two runs — see what your prompt change moved.</p>
      </header>
      <div class="compare-picker">
        <select class="bench-select js-run-a"></select>
        <span class="text-ink-mute">vs</span>
        <select class="bench-select js-run-b"></select>
        <button type="button" class="btn js-load" disabled>Load</button>
        <button type="button" class="btn btn--ghost js-back">Back</button>
      </div>
      <p class="js-compare-err text-negative text-sm" hidden></p>
      <div class="compare-grid js-compare-grid"></div>
    </div>
  `;

  const selA = root.querySelector(".js-run-a");
  const selB = root.querySelector(".js-run-b");
  const loadBtn = root.querySelector(".js-load");
  const grid = root.querySelector(".js-compare-grid");
  const err = root.querySelector(".js-compare-err");

  root.querySelector(".js-back").addEventListener("click", () => setState({ stage: STAGES.START }));

  let runs = [];
  try {
    ({ runs = [] } = await listRecentRuns(20));
  } catch {
    err.textContent = "Couldn't load recent runs.";
    err.hidden = false;
  }
  const opts = `<option value="">Select a run…</option>` +
    runs.map((r) => `<option value="${escape(r.id)}">${escape(r.headline || r.id)} · ${escape(r.id)}</option>`).join("");
  selA.innerHTML = opts;
  selB.innerHTML = opts;

  function syncLoad() {
    loadBtn.disabled = !selA.value || !selB.value;
  }
  selA.addEventListener("change", syncLoad);
  selB.addEventListener("change", syncLoad);

  loadBtn.addEventListener("click", async () => {
    err.hidden = true;
    grid.innerHTML = `<div class="hint">Loading…</div>`;
    try {
      const [a, b] = await Promise.all([getRunFull(selA.value), getRunFull(selB.value)]);
      grid.innerHTML = "";
      grid.appendChild(renderColumn(a));
      grid.appendChild(renderColumn(b));
    } catch (e) {
      grid.innerHTML = "";
      err.textContent = "Couldn't load one of the runs: " + (e.message || e);
      err.hidden = false;
    }
  });
}

function fpChips(run) {
  const fp = run.fingerprint || {};
  const chips = [];
  if (run.runLabel) chips.push(`<span class="fp-chip fp-chip--label">${escape(run.runLabel)}</span>`);
  if (fp.promptVersion) chips.push(`<span class="fp-chip">prompt ${escape(fp.promptVersion)}</span>`);
  if (fp.modelConfigVersion) chips.push(`<span class="fp-chip">models ${escape(fp.modelConfigVersion)}</span>`);
  if (fp.scriptVersion) chips.push(`<span class="fp-chip">script ${escape(fp.scriptVersion)}</span>`);
  return chips.join(" ");
}

function fallbackBadge(run) {
  if (run.mode !== "scripted") return `<span class="fp-chip">manual run</span>`;
  const cov = run.scriptCoverage || {};
  const n = cov.fallback_count || 0;
  const played = (cov.aliases_answered_by_script || []).length;
  if (n) return `<span class="fp-chip fp-chip--warn">⚠ ${n} fallback answer${n === 1 ? "" : "s"}</span>`;
  if (played) return `<span class="fp-chip fp-chip--ok">on-script</span>`;
  return `<span class="fp-chip fp-chip--warn">typed (off-script)</span>`;
}

function renderColumn(run) {
  const col = document.createElement("div");
  col.className = "compare-col card space-y-3";
  const v = run.verdict;
  const turns = (run.turns || [])
    .map((t) => `<div class="cmp-turn"><div class="cmp-q">${escape(t.name || t.alias || "")}</div><div class="cmp-a">${t.skipped ? "<em>(skipped)</em>" : escape(t.answer || "")}</div></div>`)
    .join("");
  col.innerHTML = `
    <div class="space-y-1">
      <div class="cmp-headline">${escape(run.headline || run.id)}</div>
      <div class="fp-row">${fallbackBadge(run)} ${fpChips(run)}</div>
    </div>
    <div>
      <div class="eyebrow">Briefing</div>
      <div class="cmp-briefing">${escape(run.briefing?.headline || "(no briefing)")}</div>
    </div>
    <div>
      <div class="eyebrow">Verdict</div>
      <div class="cmp-verdict">${v ? `<strong>${escape(v.verdict)}</strong>${v.issue_type ? ` · ${escape(v.issue_type)}` : ""}${v.note ? `<div class="text-ink-dim text-sm">${escape(v.note)}</div>` : ""}` : '<span class="text-ink-mute">none recorded</span>'}</div>
    </div>
    <details>
      <summary class="eyebrow">Questions asked (${(run.turns || []).length})</summary>
      <div class="cmp-turns">${turns}</div>
    </details>
    <details>
      <summary class="eyebrow">Notes (${(run.notes || []).length})</summary>
      <div class="cmp-notes">${(run.notes || []).map((n) => `<div class="text-sm">${escape(n.text || n)}</div>`).join("") || '<span class="text-ink-mute">none</span>'}</div>
    </details>
    <div class="cmp-fix">
      <div class="eyebrow">Suggest prompt fix</div>
      <div class="cmp-fix-row">
        <select class="bench-select js-fix-stage">${FIX_STAGES.map((s) => `<option value="${s}"${s === "evaluation" ? " selected" : ""}>${s}</option>`).join("")}</select>
        <button type="button" class="btn btn--ghost js-fix-btn">Suggest fix</button>
      </div>
      <pre class="cmp-fix-out" hidden></pre>
    </div>
  `;

  const fixBtn = col.querySelector(".js-fix-btn");
  const fixStage = col.querySelector(".js-fix-stage");
  const fixOut = col.querySelector(".cmp-fix-out");
  fixBtn.addEventListener("click", async () => {
    fixBtn.disabled = true;
    const label = fixBtn.textContent;
    fixBtn.textContent = "Thinking…";
    fixOut.hidden = false;
    fixOut.textContent = "Asking the model for a minimal prompt edit…";
    try {
      const { fix } = await suggestFix(run.id, fixStage.value);
      fixOut.textContent = JSON.stringify(fix, null, 2);
    } catch (e) {
      fixOut.textContent = "Fix failed: " + (e.message || e) + "\n(Did you record a verdict on this run?)";
    } finally {
      fixBtn.disabled = false;
      fixBtn.textContent = label;
    }
  });

  return col;
}

export function unmount() { /* nothing */ }

function escape(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
