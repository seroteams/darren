import { STAGES } from "../state.js";
import { listRecentRuns, getRunFull, suggestFix, postVerdict } from "../../../shared/api.js";
import { escapeHtml as escape } from "../ui/html.js";
import { relTime } from "../ui/time.ts";

const FIX_STAGES = ["focus_points", "preparation", "bank", "questioning", "evaluation"];

// Mirror server/handlers/verdict.js ISSUE_TYPES — [value, label] for the picker.
const ISSUE_TYPES = [
  ["too_generic", "too generic"],
  ["wrong_level", "wrong level"],
  ["bad_tone", "bad tone"],
  ["over_inferred", "over inferred"],
  ["missed_focus", "missed focus"],
  ["weak_action", "weak action"],
];

const AXIS_ORDER = ["wellbeing", "engagement", "clarity", "growth"];
const AXIS_LABELS = { wellbeing: "Wellbeing", engagement: "Engagement", clarity: "Clarity", growth: "Growth" };

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-wide l-stack l-stack--5">
      <header class="page-header">
        <div class="eyebrow">Test lane</div>
        <h1 class="h1">Compare runs</h1>
        <p class="text-ink-dim text-sm">Two runs, side by side. See what your prompt change moved.</p>
      </header>
      <div class="compare-picker">
        <select class="bench-select js-run-a"></select>
        <span class="text-ink-mute">vs</span>
        <select class="bench-select js-run-b"></select>
        <button type="button" class="btn js-load" disabled>Load</button>
        <button type="button" class="btn btn--ghost js-back">Back</button>
      </div>
      <p class="js-compare-err text-negative text-sm" hidden></p>
      <div class="cmp-results js-compare-grid"></div>
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
    err.textContent = "Couldn't load recent runs — is the API server running? (npm run dev)";
    err.hidden = false;
  }
  const opts = `<option value="">Select a run…</option>` +
    runs.map((r) => `<option value="${escape(r.id)}">${escape(optionLabel(r))}</option>`).join("");
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
      const metaA = runs.find((r) => r.id === selA.value) || {};
      const metaB = runs.find((r) => r.id === selB.value) || {};
      const [a, b] = await Promise.all([getRunFull(selA.value), getRunFull(selB.value)]);
      grid.innerHTML = "";
      grid.appendChild(renderDiff(a, b, metaA, metaB));
      grid.appendChild(renderActions(a, b));
    } catch (e) {
      grid.innerHTML = "";
      err.textContent = "Couldn't load one of the runs: " + (e.message || e);
      err.hidden = false;
    }
  });
}

// ---- run summary helpers ----

function optionLabel(r) {
  const bits = [r.headline || r.id];
  if (r.stage) bits.push(String(r.stage).toLowerCase());
  const t = relTime(r.lastSeenAt);
  if (t) bits.push(t);
  return bits.join(" · ");
}

// Normalize a run's four axes into { id: { score, notRead } }, mirroring the
// briefing's read-status rule (score 0 = "not enough signal", never a measured 0).
function axisMap(run) {
  const axes = run.briefing?.axes || [];
  const out = {};
  for (const id of AXIS_ORDER) {
    const a = axes.find((x) => x.id === id);
    if (!a) { out[id] = { score: null, notRead: true }; continue; }
    const notRead = a.read_status ? a.read_status === "not_read" : a.score === 0;
    out[id] = { score: a.score, notRead };
  }
  return out;
}

function fallbackCount(run) {
  if (run.mode !== "scripted") return null;
  return (run.scriptCoverage || {}).fallback_count || 0;
}

function fmtScore(s) { return s > 0 ? `+${s}` : `${s}`; }

// Map a -6..+6 axis score to a 0..100% position on the diff track (center = 0).
function posFor(score) {
  const clamped = Math.max(-6, Math.min(6, score));
  return 50 + (clamped / 6) * 50;
}

// ---- the answer: one line of what moved between A and B ----

function buildDelta(a, b) {
  const parts = [];
  const ma = axisMap(a), mb = axisMap(b);
  for (const id of AXIS_ORDER) {
    if (ma[id].notRead || mb[id].notRead) continue;
    const d = mb[id].score - ma[id].score;
    if (d !== 0) parts.push({ text: `${AXIS_LABELS[id]} ${fmtScore(d)}`, dir: d > 0 ? "up" : "down" });
  }
  const ha = a.briefing?.headline, hb = b.briefing?.headline;
  if (ha && hb && ha !== hb) parts.push({ text: "headline reworded", dir: "flat" });
  else if (!!ha !== !!hb) parts.push({ text: hb ? "briefing now present" : "briefing dropped", dir: hb ? "up" : "down" });
  const fa = fallbackCount(a), fb = fallbackCount(b);
  if (fa != null && fb != null && fa !== fb) {
    const d = fb - fa;
    parts.push({ text: `${Math.abs(d)} ${d < 0 ? "fewer" : "more"} fallback${Math.abs(d) === 1 ? "" : "s"}`, dir: d < 0 ? "up" : "down" });
  }
  const qa = (a.turns || []).length, qb = (b.turns || []).length;
  if (qa !== qb) {
    const d = qb - qa;
    parts.push({ text: `${Math.abs(d)} ${d < 0 ? "fewer" : "more"} question${Math.abs(d) === 1 ? "" : "s"}`, dir: "flat" });
  }
  return parts;
}

// ---- the aligned diff ----

function renderDiff(a, b, metaA, metaB) {
  const wrap = document.createElement("section");
  wrap.className = "cmp-diff";

  const parts = buildDelta(a, b);
  let deltaHtml;
  if (parts.length) {
    deltaHtml = `<div class="cmp-delta">${parts
      .map((p) => `<span class="cmp-delta-tok cmp-delta-tok--${p.dir}">${escape(p.text)}</span>`)
      .join(`<span class="cmp-delta-sep">·</span>`)}</div>`;
  } else if (!a.briefing && !b.briefing) {
    deltaHtml = `<div class="cmp-delta cmp-delta--flat">Neither run reached a briefing yet, so there are no axis reads to compare.</div>`;
  } else {
    deltaHtml = `<div class="cmp-delta cmp-delta--flat">No measurable difference between these two runs.</div>`;
  }

  const crossPersona = a.ctx?.name && b.ctx?.name && a.ctx.name !== b.ctx.name;
  const warnHtml = crossPersona
    ? `<div class="cmp-warn">Comparing across personas (${escape(a.ctx.name)} vs ${escape(b.ctx.name)}). Axis deltas may not mean much.</div>`
    : "";

  const headA = a.briefing?.headline || "";
  const headB = b.briefing?.headline || "";
  const headChanged = headA !== headB;

  wrap.innerHTML = `
    ${deltaHtml}
    ${warnHtml}
    <div class="cmp-rows">
      <div class="cmp-row cmp-row--identity">
        <div class="cmp-row__label"></div>
        <div class="cmp-cell">${identityCell(a, b, metaA, "a")}</div>
        <div class="cmp-cell">${identityCell(b, a, metaB, "b")}</div>
      </div>
      <div class="cmp-row${headChanged ? " cmp-row--changed" : ""}">
        <div class="cmp-row__label">Briefing</div>
        <div class="cmp-cell${headA ? "" : " cmp-cell--muted"}">${escape(headA || "no briefing yet")}</div>
        <div class="cmp-cell${headB ? "" : " cmp-cell--muted"}">${escape(headB || "no briefing yet")}</div>
      </div>
      ${factRow("Questions", String((a.turns || []).length), String((b.turns || []).length))}
      ${factRow("Notes", String((a.notes || []).length), String((b.notes || []).length))}
    </div>
    ${renderAxes(a, b)}
  `;
  return wrap;
}

function identityCell(run, other, meta, ab) {
  const time = relTime(meta.lastSeenAt);
  return `
    <div class="cmp-id">
      <span class="cmp-tag cmp-tag--${ab}">${ab.toUpperCase()}</span>
      <div class="cmp-id__body">
        <div class="cmp-id__headline">${escape(run.headline || run.id)}</div>
        <div class="fp-row">${fallbackBadge(run)} ${fpChips(run, other)}</div>
        <div class="cmp-id__meta">${escape(run.id)}${time ? " · " + escape(time) : ""}</div>
      </div>
    </div>`;
}

function factRow(label, va, vb) {
  const changed = va !== vb;
  return `
    <div class="cmp-row${changed ? " cmp-row--changed" : ""}">
      <div class="cmp-row__label">${escape(label)}</div>
      <div class="cmp-cell num-tabular">${escape(va)}</div>
      <div class="cmp-cell num-tabular">${escape(vb)}</div>
    </div>`;
}

function renderAxes(a, b) {
  const ma = axisMap(a), mb = axisMap(b);
  const anyRead = AXIS_ORDER.some((id) => !ma[id].notRead || !mb[id].notRead);
  if (!anyRead) {
    return `<div class="cmp-axes">
      <div class="eyebrow">Axis reads</div>
      <p class="text-ink-mute text-sm">No axis reads on either run yet. The four axes appear once a run reaches its briefing.</p>
    </div>`;
  }
  const rows = AXIS_ORDER.map((id) => axisRow(id, ma[id], mb[id])).join("");
  return `
    <div class="cmp-axes">
      <div class="cmp-axes__head">
        <div class="eyebrow">Axis reads</div>
        <div class="cmp-legend">
          <span><span class="cmp-dot cmp-dot--a"></span>A</span>
          <span><span class="cmp-dot cmp-dot--b"></span>B</span>
        </div>
      </div>
      ${rows}
    </div>`;
}

function axisRow(id, sa, sb) {
  if (sa.notRead || sb.notRead) {
    const valA = sa.notRead ? "—" : fmtScore(sa.score);
    const valB = sb.notRead ? "—" : fmtScore(sb.score);
    return `
      <div class="cmp-axis cmp-axis--unread">
        <div class="cmp-axis__label">${AXIS_LABELS[id]}</div>
        <div class="cmp-axis__track"><div class="cmp-axis__mid"></div></div>
        <div class="cmp-axis__read"><span class="cmp-axis__vals">${valA} → ${valB}</span></div>
      </div>`;
  }
  const pa = posFor(sa.score), pb = posFor(sb.score);
  const lo = Math.min(pa, pb), hi = Math.max(pa, pb);
  const d = sb.score - sa.score;
  const dir = d > 0 ? "up" : d < 0 ? "down" : "flat";
  const seg = hi > lo
    ? `<div class="cmp-axis__seg cmp-axis__seg--${dir}" style="left:${lo}%;width:${hi - lo}%"></div>`
    : "";
  const deltaChip = d !== 0
    ? `<span class="cmp-axis__delta cmp-axis__delta--${dir}">${d > 0 ? "▲" : "▼"} ${Math.abs(d)}</span>`
    : `<span class="cmp-axis__delta cmp-axis__delta--flat">=</span>`;
  return `
    <div class="cmp-axis">
      <div class="cmp-axis__label">${AXIS_LABELS[id]}</div>
      <div class="cmp-axis__track">
        <div class="cmp-axis__mid"></div>
        ${seg}
        <span class="cmp-axis__pt cmp-axis__pt--a" style="left:${pa}%"></span>
        <span class="cmp-axis__pt cmp-axis__pt--b" style="left:${pb}%"></span>
      </div>
      <div class="cmp-axis__read">
        <span class="cmp-axis__vals">${fmtScore(sa.score)} → ${fmtScore(sb.score)}</span>
        ${deltaChip}
      </div>
    </div>`;
}

function fpChips(run, other) {
  const fp = run.fingerprint || {};
  const ofp = (other && other.fingerprint) || {};
  const chips = [];
  if (run.runLabel) chips.push(`<span class="fp-chip fp-chip--label">${escape(run.runLabel)}</span>`);
  const add = (key, label, val) => {
    if (!val) return;
    const changed = other && ofp[key] && ofp[key] !== val;
    chips.push(`<span class="fp-chip${changed ? " fp-chip--changed" : ""}" ${changed ? 'title="changed vs the other run"' : ""}>${label} ${escape(val)}</span>`);
  };
  add("promptVersion", "prompt", fp.promptVersion);
  add("modelConfigVersion", "models", fp.modelConfigVersion);
  add("scriptVersion", "script", fp.scriptVersion);
  return chips.join(" ");
}

// keep = good, fix = needs work, block = bad (see server/handlers/verdict.js)
const VERDICT_TONE = { keep: "pass", fix: "warn", block: "fail" };

function verdictBlock(v) {
  if (!v) {
    return `<div class="cmp-verdict cmp-verdict--none">No verdict yet — record one to unlock Suggest fix.</div>`;
  }
  const tone = VERDICT_TONE[v.verdict] || "neutral";
  return `<div class="cmp-verdict cmp-verdict--${tone}">
      <span class="cmp-verdict-tag">${escape(v.verdict)}</span>${v.issue_type ? `<span class="cmp-verdict-issue">${escape(v.issue_type)}</span>` : ""}
      ${v.note ? `<div class="text-ink-dim text-sm">${escape(v.note)}</div>` : ""}
    </div>`;
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

// ---- per-run actions (verdict + suggest fix), below the diff ----

function renderActions(a, b) {
  const wrap = document.createElement("div");
  wrap.className = "cmp-actions";
  wrap.appendChild(actionColumn(a, "a"));
  wrap.appendChild(actionColumn(b, "b"));
  return wrap;
}

function actionColumn(run, ab) {
  const col = document.createElement("div");
  col.className = "card cmp-act-col space-y-3";
  const v = run.verdict;
  const hasVerdict = !!v;
  const turns = (run.turns || [])
    .map((t) => `<div class="cmp-turn"><div class="cmp-q">${escape(t.name || t.alias || "")}</div><div class="cmp-a">${t.skipped ? "<em>(skipped)</em>" : escape(t.answer || "")}</div></div>`)
    .join("");
  col.innerHTML = `
    <div class="cmp-act-col__head">
      <span class="cmp-tag cmp-tag--${ab}">${ab.toUpperCase()}</span>
      <div class="cmp-act-col__name">${escape(run.headline || run.id)}</div>
    </div>
    <div>
      <div class="eyebrow">Verdict</div>
      <div class="js-verdict-block">${verdictBlock(v)}</div>
      <div class="verdict-row cmp-verdict-edit">
        <button type="button" class="btn btn--ghost js-verdict${v?.verdict === "keep" ? " is-active" : ""}" data-v="keep">Keep</button>
        <button type="button" class="btn btn--ghost js-verdict${v?.verdict === "fix" ? " is-active" : ""}" data-v="fix">Fix</button>
        <button type="button" class="btn btn--ghost js-verdict${v?.verdict === "block" ? " is-active" : ""}" data-v="block">Block</button>
      </div>
      <div class="cmp-verdict-meta">
        <select class="bench-select js-issue-type">
          <option value="">issue type (optional)</option>
          ${ISSUE_TYPES.map(([val, label]) => `<option value="${val}"${v?.issue_type === val ? " selected" : ""}>${label}</option>`).join("")}
        </select>
        <input class="cmp-input js-verdict-note" type="text" autocomplete="off" placeholder="note (optional)" value="${escape(v?.note || "")}" />
        <span class="js-verdict-confirm text-sm text-ink-mute" style="opacity:0; transition: opacity 0.2s;">Saved</span>
      </div>
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
      <div class="cmp-fix-controls"${hasVerdict ? "" : " hidden"}>
        <div class="cmp-fix-row">
          <select class="bench-select js-fix-stage">${FIX_STAGES.map((s) => `<option value="${s}"${s === "evaluation" ? " selected" : ""}>${s}</option>`).join("")}</select>
          <button type="button" class="btn btn--ghost js-fix-btn">Suggest fix</button>
        </div>
        <div class="cmp-fix-out-wrap" hidden>
          <button type="button" class="btn btn--ghost btn--sm js-fix-copy">Copy</button>
          <pre class="cmp-fix-out"></pre>
        </div>
      </div>
      <p class="cmp-fix-hint text-ink-mute text-sm"${hasVerdict ? " hidden" : ""}>Record a verdict to suggest a fix.</p>
    </div>
  `;

  const fixControls = col.querySelector(".cmp-fix-controls");
  const fixHint = col.querySelector(".cmp-fix-hint");
  const fixBtn = col.querySelector(".js-fix-btn");
  const fixStage = col.querySelector(".js-fix-stage");
  const fixOutWrap = col.querySelector(".cmp-fix-out-wrap");
  const fixOut = col.querySelector(".cmp-fix-out");
  const fixCopy = col.querySelector(".js-fix-copy");

  fixBtn.addEventListener("click", async () => {
    fixBtn.disabled = true;
    const label = fixBtn.textContent;
    fixBtn.textContent = "Thinking…";
    fixOutWrap.hidden = false;
    fixOut.textContent = "Asking the model for a minimal prompt edit…";
    try {
      const { fix } = await suggestFix(run.id, fixStage.value);
      fixOut.textContent = typeof fix === "string" ? fix : JSON.stringify(fix, null, 2);
    } catch (e) {
      fixOut.textContent = "Fix failed: " + (e.message || e) + "\n(Did you record a verdict on this run?)";
    } finally {
      fixBtn.disabled = false;
      fixBtn.textContent = label;
    }
  });

  fixCopy.addEventListener("click", () => {
    navigator.clipboard?.writeText(fixOut.textContent || "");
    const prev = fixCopy.textContent;
    fixCopy.textContent = "Copied";
    setTimeout(() => { fixCopy.textContent = prev; }, 1200);
  });

  // Verdict editor — records ground truth straight onto the past run. The server
  // restores the run as a session by id, sets the verdict, and re-persists it,
  // which is exactly what Suggest fix reads. Saving reveals the fix controls.
  const verdictBtns = [...col.querySelectorAll(".js-verdict")];
  const issueSel = col.querySelector(".js-issue-type");
  const noteInput = col.querySelector(".js-verdict-note");
  const confirm = col.querySelector(".js-verdict-confirm");
  const verdictBlockEl = col.querySelector(".js-verdict-block");
  let chosen = run.verdict?.verdict || null;

  async function saveVerdict() {
    if (!chosen) return;
    try {
      const { verdict: saved } = await postVerdict(run.id, {
        verdict: chosen,
        issue_type: issueSel.value || null,
        note: noteInput.value || null,
      });
      run.verdict = saved;
      verdictBlockEl.innerHTML = verdictBlock(saved);
      fixControls.hidden = false;
      fixHint.hidden = true;
      confirm.textContent = "Saved";
      confirm.style.opacity = "1";
      setTimeout(() => { confirm.style.opacity = "0"; }, 1500);
    } catch (e) {
      confirm.textContent = "Save failed: " + (e.message || e);
      confirm.style.opacity = "1";
    }
  }

  verdictBtns.forEach((bn) => bn.addEventListener("click", () => {
    chosen = bn.dataset.v;
    verdictBtns.forEach((x) => x.classList.toggle("is-active", x === bn));
    saveVerdict();
  }));
  issueSel.addEventListener("change", saveVerdict);
  noteInput.addEventListener("change", saveVerdict);

  return col;
}

export function unmount() { /* nothing */ }
