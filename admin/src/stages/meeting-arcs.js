// Meeting arcs — a browsable, editable home for every 1:1 type's arc (its phases,
// the tone it's asked in, and the anti-patterns to avoid). View any type, or hit
// Edit to change its phases / tone / anti-patterns. Edits are saved to a sidecar
// overlay (never the source); "Reset to default" wipes them. Renaming or removing
// a phase that has tagged questions warns before it orphans them.

import { getArcs, saveArc, resetArc } from "../../../shared/api.js";
import { escapeHtml as esc } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { X, ChevronRight } from "lucide";

const STYLE = `
<style>
  .arc-card { padding: 0; overflow: hidden; }
  .arc-card__head { display:flex; align-items:center; gap:10px; width:100%; padding:14px 16px;
    background:none; border:none; cursor:pointer; text-align:left; color:var(--color-ink); }
  .arc-card__head:focus-visible { outline:3px solid var(--color-ink); outline-offset:-3px; border-radius:6px; }
  .arc-card__head[disabled] { cursor:default; }
  .arc-card__chev { transition: transform .15s ease; color:var(--color-ink-dim); flex:none; }
  .arc-card[data-open="true"] .arc-card__chev { transform: rotate(90deg); }
  .arc-card__meta { margin-left:auto; font-size:var(--type-body-sm); color:var(--color-ink-dim); }
  .arc-edited { font-size:var(--type-body-sm); font-weight:600; padding:3px 9px; border-radius:6px;
    background:var(--sero-gold-200); color:var(--sero-gold-800); }
  .arc-chips { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:0 16px 16px 40px; }
  .arc-chip { font-size:var(--type-body); font-weight:500; line-height:1.4;
    padding:4px 11px; border-radius:7px; background:var(--sero-soft-200); color:var(--color-ink);
    border:1px solid var(--color-border-strong); }
  .arc-chip__sep { color:var(--color-ink-dim); font-size:1.1rem; }
  .arc-body { padding:4px 16px 16px; border-top:1px solid var(--color-border); }
  .arc-sec { font-size:var(--type-body-sm); font-weight:600; letter-spacing:.04em; text-transform:uppercase;
    color:var(--color-ink-dim); margin:16px 0 8px; }
  .arc-phase { display:flex; align-items:flex-start; gap:12px; padding:10px 0;
    border-bottom:1px solid var(--color-border); }
  .arc-phase:last-child { border-bottom:none; }
  .arc-phase__id { font-size:var(--type-body-sm); font-weight:600;
    padding:3px 9px; border-radius:7px; background:var(--sero-soft-200); color:var(--color-ink);
    border:1px solid var(--color-border-strong); flex:none; margin-top:1px; }
  .arc-phase__main { flex:1; min-width:0; }
  .arc-phase__label { font-weight:600; font-size:var(--type-body); color:var(--color-ink); }
  .arc-phase__intent { font-size:var(--type-body); color:var(--color-ink-dim); margin-top:3px; line-height:1.5; }
  .arc-phase__q { flex:none; font-size:var(--type-body-sm); color:var(--color-ink-dim); white-space:nowrap; margin-top:3px; }
  .arc-anti { margin:0; padding-left:20px; color:var(--color-ink-dim); font-size:var(--type-body); line-height:1.5; }
  .arc-anti li { margin:5px 0; }

  /* --- actions + edit mode --- */
  .arc-actions { display:flex; gap:8px; padding:0 16px 16px 40px; }
  .arc-btn { font-size:var(--type-body); font-weight:600; padding:6px 14px; border-radius:8px; cursor:pointer;
    border:1px solid var(--color-border-strong); background:var(--color-surface); color:var(--color-ink); }
  .arc-btn:hover { background:var(--sero-soft-200); }
  .arc-btn--primary { background:var(--color-ink); color:var(--color-surface); border-color:var(--color-ink); }
  .arc-btn--primary:hover { opacity:.9; background:var(--color-ink); }
  .arc-btn--danger { color:var(--sero-rose-700, #b4232a); }
  .arc-btn--mini { font-size:var(--type-body-sm); padding:4px 9px; }
  .arc-btn[disabled] { opacity:.4; cursor:not-allowed; }

  .arc-edit { padding:8px 16px 18px; border-top:1px solid var(--color-border); }
  .arc-edit__row { display:flex; gap:10px; align-items:flex-start; padding:12px 0;
    border-bottom:1px solid var(--color-border); }
  .arc-edit__move { display:flex; flex-direction:column; gap:4px; flex:none; }
  .arc-edit__fields { flex:1; min-width:0; display:flex; flex-direction:column; gap:8px; }
  .arc-edit__line { display:flex; gap:10px; flex-wrap:wrap; }
  .arc-field { display:flex; flex-direction:column; gap:3px; }
  .arc-field--id { width:170px; }
  .arc-field--label { flex:1; min-width:160px; }
  .arc-field--q { width:90px; }
  .arc-field--grow { flex:1; min-width:100%; }
  .arc-field > span { font-size:var(--type-label); font-weight:600; letter-spacing:.03em; text-transform:uppercase;
    color:var(--color-ink-dim); }
  .arc-input, .arc-textarea { font:inherit; color:var(--color-ink); background:var(--color-surface);
    border:1px solid var(--color-border-strong); border-radius:7px; padding:7px 9px; width:100%; }
  .arc-input:focus, .arc-textarea:focus { outline:2px solid var(--color-ink); outline-offset:-1px; }
  .arc-textarea { resize:vertical; min-height:46px; line-height:1.5; }
  .arc-edit__foot { display:flex; align-items:center; gap:10px; margin-top:16px; flex-wrap:wrap; }
  .arc-edit__msg { font-size:var(--type-body); }
  .arc-edit__msg--err { color:var(--sero-rose-700, #b4232a); }
  .arc-edit__spacer { margin-left:auto; }

  /* --- page-level "check for changes" action --- */
  .arc-update { display:flex; align-items:center; gap:12px; margin-top:14px; flex-wrap:wrap; }
  .arc-update__msg { font-size:var(--type-body); color:var(--color-ink-dim); }
  .arc-update__msg--ok { color:var(--sero-green-700, #1f7a4d); }
  .arc-update__msg--err, .arc-update__msg--warn { color:var(--sero-rose-700, #b4232a); }
  .arc-update__time { font-size:var(--type-body-sm); color:var(--color-ink-mute, var(--color-ink-dim)); }
</style>`;

const CHEV = icon(ChevronRight, { size: 16, className: "arc-card__chev" });

// View state, scoped to the mount.
let arcs = [];
const open = new Set();
let editingSlug = null;
let draft = null; // working copy of the arc being edited
let resultHost = null;
let updateMsgEl = null; // status line next to the page-level Update button
let updateTimeEl = null; // "Last checked …" stamp next to the Update button

export async function mount(root) {
  arcs = [];
  open.clear();
  editingSlug = null;
  draft = null;

  root.innerHTML = `
    ${STYLE}
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Configure</div>
        <h1 class="h1">Meeting arcs</h1>
        <div class="text-ink-dim max-w-measure">
          The phases each 1:1 moves through, with the tone they're asked in and the patterns to avoid. Open any meeting to see its shape, or hit Edit to change it. Edits are saved separately from the code — "Reset to default" undoes them.
        </div>
        <div class="arc-update">
          <button type="button" class="arc-btn arc-btn--primary" id="arc-update-btn">Update</button>
          <span class="arc-update__msg" id="arc-update-msg" role="status" aria-live="polite"></span>
          <span class="arc-update__time" id="arc-update-time"></span>
        </div>
      </header>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading meeting arcs…</div>
      <div class="result-host l-stack l-stack--4"></div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  resultHost = root.querySelector(".result-host");
  updateMsgEl = root.querySelector("#arc-update-msg");
  updateTimeEl = root.querySelector("#arc-update-time");
  root.querySelector("#arc-update-btn").addEventListener("click", checkForUpdates);

  if (!(await load())) {
    thinkingHost.textContent = "Couldn't load meeting arcs — try again in a moment.";
    return;
  }
  thinkingHost.remove();

  if (!arcs.length) {
    resultHost.innerHTML = `<p class="text-ink-mute">No meeting types found.</p>`;
    return;
  }

  if (!open.size) open.add(arcs[0].slug); // first card open by default
  renderAll();
  resultHost.addEventListener("click", onClick);
}

async function load() {
  try {
    const res = await getArcs();
    arcs = Array.isArray(res?.arcs) ? res.arcs : [];
    return true;
  } catch (e) {
    console.warn("[meeting-arcs] fetch failed:", e);
    return false;
  }
}

// A stable string of everything shown for one arc, so we can tell whether the
// system's copy changed since we last loaded it.
function arcFingerprint(a) {
  return JSON.stringify({
    label: a.label,
    edited: Boolean(a.edited),
    tone: a.tone_register || "",
    anti: a.anti_patterns || [],
    arc: (a.arc || []).map((p) => [p.id, p.label, p.intent, p.target_questions]),
  });
}

function setUpdateMsg(text, kind) {
  if (!updateMsgEl) return;
  updateMsgEl.textContent = text;
  updateMsgEl.className = "arc-update__msg" + (kind ? ` arc-update__msg--${kind}` : "");
}

function stampLastChecked() {
  if (!updateTimeEl) return;
  const t = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  updateTimeEl.textContent = `Last checked ${t}`;
}

// Re-pull the arcs from the server and report what (if anything) moved since the
// page was last loaded — so the view can be kept current without leaving it.
async function checkForUpdates() {
  if (editingSlug) {
    setUpdateMsg("Finish or cancel your edit first, then Update.", "warn");
    return;
  }
  setUpdateMsg("Checking…", "");

  const prevPrints = new Map(arcs.map((a) => [a.slug, arcFingerprint(a)]));
  const prevLabels = new Map(arcs.map((a) => [a.slug, a.label]));

  if (!(await load())) {
    setUpdateMsg("Couldn't reach the server — try again in a moment.", "err");
    return;
  }
  renderAll();

  const changed = [];
  const added = [];
  for (const a of arcs) {
    if (!prevPrints.has(a.slug)) added.push(a.label);
    else if (prevPrints.get(a.slug) !== arcFingerprint(a)) changed.push(a.label);
  }
  const liveSlugs = new Set(arcs.map((a) => a.slug));
  const removed = [...prevLabels.entries()]
    .filter(([slug]) => !liveSlugs.has(slug))
    .map(([, label]) => label);

  const bits = [];
  if (changed.length) bits.push(`${changed.length} changed (${changed.join(", ")})`);
  if (added.length) bits.push(`${added.length} added (${added.join(", ")})`);
  if (removed.length) bits.push(`${removed.length} removed (${removed.join(", ")})`);

  if (!bits.length) setUpdateMsg("Up to date — nothing changed.", "ok");
  else setUpdateMsg(`Refreshed — ${bits.join("; ")}.`, "ok");
  stampLastChecked();
}

function renderAll() {
  resultHost.innerHTML = arcs.map((a) => cardHtml(a)).join("");
}

function getArcBySlug(slug) {
  return arcs.find((a) => a.slug === slug);
}

async function onClick(e) {
  const card = e.target.closest(".arc-card");
  if (!card) return;
  const slug = card.dataset.slug;

  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act) {
    e.preventDefault();
    return handleAction(act, slug, card, e.target.closest("[data-act]"));
  }

  // Header toggle — ignored while this card is being edited.
  if (e.target.closest(".arc-card__head") && editingSlug !== slug) {
    if (open.has(slug)) open.delete(slug);
    else open.add(slug);
    renderAll();
  }
}

async function handleAction(act, slug, card, btn) {
  switch (act) {
    case "edit": {
      const a = getArcBySlug(slug);
      draft = {
        slug: a.slug,
        label: a.label,
        tone_register: a.tone_register || "",
        anti_patterns: Array.isArray(a.anti_patterns) ? [...a.anti_patterns] : [],
        arc: (a.arc || []).map((p) => ({ ...p })),
      };
      editingSlug = slug;
      open.add(slug);
      renderAll();
      return;
    }
    case "cancel": {
      editingSlug = null;
      draft = null;
      renderAll();
      return;
    }
    case "add-phase": {
      syncDraft(card);
      draft.arc.push({ id: "", label: "", intent: "", target_questions: 1 });
      renderAll();
      return;
    }
    case "del-phase": {
      syncDraft(card);
      draft.arc.splice(Number(btn.dataset.i), 1);
      renderAll();
      return;
    }
    case "up":
    case "down": {
      syncDraft(card);
      const i = Number(btn.dataset.i);
      const j = act === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= draft.arc.length) return;
      [draft.arc[i], draft.arc[j]] = [draft.arc[j], draft.arc[i]];
      renderAll();
      return;
    }
    case "save":
      syncDraft(card);
      return doSave(card, false);
    case "reset": {
      if (!window.confirm(`Reset "${getArcBySlug(slug).label}" to its default arc? Your edits will be discarded.`)) return;
      try {
        await resetArc(slug);
      } catch (err) {
        return setMsg(card, err.message || "Reset failed.", true);
      }
      editingSlug = null;
      draft = null;
      await load();
      renderAll();
      return;
    }
  }
}

async function doSave(card, confirm) {
  setMsg(card, "Saving…", false);
  let res;
  try {
    res = await saveArc(draft.slug, {
      arc: draft.arc,
      tone_register: draft.tone_register,
      anti_patterns: draft.anti_patterns,
      confirm,
    });
  } catch (err) {
    return setMsg(card, err.message || "Save failed.", true);
  }

  if (res.needsConfirm) {
    if (window.confirm(res.warning)) return doSave(card, true);
    return setMsg(card, "", false); // cancelled — leave edits in place
  }

  editingSlug = null;
  draft = null;
  await load();
  renderAll();
}

// Pull the live form values back into `draft` before any re-render or save.
function syncDraft(card) {
  if (!draft) return;
  const rows = card.querySelectorAll(".arc-edit__row");
  draft.arc = [...rows].map((row) => ({
    id: row.querySelector('[data-f="id"]').value.trim(),
    label: row.querySelector('[data-f="label"]').value.trim(),
    intent: row.querySelector('[data-f="intent"]').value.trim(),
    target_questions: Number(row.querySelector('[data-f="q"]').value),
  }));
  const tone = card.querySelector('[data-f="tone"]');
  if (tone) draft.tone_register = tone.value.trim();
  const anti = card.querySelector('[data-f="anti"]');
  if (anti) {
    draft.anti_patterns = anti.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function setMsg(card, text, isErr) {
  const el = card.querySelector(".arc-edit__msg");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("arc-edit__msg--err", Boolean(isErr));
}

// ---------- rendering ----------

function totalQuestions(arc) {
  return (arc.arc || []).reduce((n, p) => n + (Number(p.target_questions) || 0), 0);
}

function cardHtml(a) {
  const editing = editingSlug === a.slug;
  const isOpen = editing || open.has(a.slug);
  const phases = Array.isArray(a.arc) ? a.arc : [];
  const meta = `${phases.length} ${phases.length === 1 ? "phase" : "phases"} · ${totalQuestions(a)} questions`;
  const edited = a.edited ? `<span class="arc-edited">edited</span>` : "";

  let inner;
  if (editing) {
    inner = editHtml();
  } else if (isOpen) {
    inner = bodyHtml(a, phases) + actionsHtml(a);
  } else {
    const chips = phases
      .map((p) => `<span class="arc-chip">${esc(p.id)}</span>`)
      .join(`<span class="arc-chip__sep" aria-hidden="true">→</span>`);
    const spoken = phases.map((p) => p.id).join(", then ");
    inner = `<div class="arc-chips" role="group" aria-label="Phases: ${esc(spoken)}">${chips}</div>`;
  }

  return `
    <section class="card arc-card" data-slug="${esc(a.slug)}" data-open="${isOpen}">
      <button type="button" class="arc-card__head" aria-expanded="${isOpen}" ${editing ? "disabled" : ""}>
        ${CHEV}
        <span class="h3" style="margin:0;">${esc(a.label)}</span>
        ${edited}
        <span class="arc-card__meta">${meta}</span>
      </button>
      ${inner}
    </section>`;
}

function actionsHtml(a) {
  const reset = a.edited
    ? `<button type="button" class="arc-btn arc-btn--danger" data-act="reset">Reset to default</button>`
    : "";
  return `
    <div class="arc-actions">
      <button type="button" class="arc-btn arc-btn--primary" data-act="edit">Edit</button>
      ${reset}
    </div>`;
}

function bodyHtml(a, phases) {
  const phaseRows = phases
    .map(
      (p) => `
      <div class="arc-phase">
        <span class="arc-phase__id">${esc(p.id)}</span>
        <div class="arc-phase__main">
          <div class="arc-phase__label">${esc(p.label || p.id)}</div>
          ${p.intent ? `<div class="arc-phase__intent">${esc(p.intent)}</div>` : ""}
        </div>
        <span class="arc-phase__q">${Number(p.target_questions) || 0} q</span>
      </div>`
    )
    .join("");

  const anti = Array.isArray(a.anti_patterns) && a.anti_patterns.length
    ? `<div class="arc-sec">Anti-patterns</div>
       <ul class="arc-anti">${a.anti_patterns.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
    : "";

  const tone = a.tone_register
    ? `<div class="arc-sec">Tone</div><p class="text-ink-dim" style="font-size:var(--type-body-sm); margin:0;">${esc(a.tone_register)}</p>`
    : "";

  return `
    <div class="arc-body">
      <div class="arc-sec">Phases</div>
      ${phaseRows}
      ${tone}
      ${anti}
    </div>`;
}

function editHtml() {
  const last = draft.arc.length - 1;
  const rows = draft.arc
    .map(
      (p, i) => `
      <div class="arc-edit__row">
        <div class="arc-edit__move">
          <button type="button" class="arc-btn arc-btn--mini" data-act="up" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
          <button type="button" class="arc-btn arc-btn--mini" data-act="down" data-i="${i}" ${i === last ? "disabled" : ""} aria-label="Move down">↓</button>
        </div>
        <div class="arc-edit__fields">
          <div class="arc-edit__line">
            <label class="arc-field arc-field--id"><span>Phase id</span>
              <input class="arc-input" data-f="id" value="${esc(p.id)}" placeholder="lower_snake"></label>
            <label class="arc-field arc-field--label"><span>Label</span>
              <input class="arc-input" data-f="label" value="${esc(p.label || "")}" placeholder="Pulse"></label>
            <label class="arc-field arc-field--q"><span>Questions</span>
              <input class="arc-input" data-f="q" type="number" min="0" step="1" value="${Number(p.target_questions) || 0}"></label>
          </div>
          <label class="arc-field arc-field--grow"><span>Intent</span>
            <textarea class="arc-textarea" data-f="intent" rows="2" placeholder="What this phase is for…">${esc(p.intent || "")}</textarea></label>
        </div>
        <button type="button" class="arc-btn arc-btn--mini arc-btn--danger" data-act="del-phase" data-i="${i}" aria-label="Remove phase">${icon(X, { size: 16 })}</button>
      </div>`
    )
    .join("");

  return `
    <div class="arc-edit">
      <div class="arc-sec">Phases</div>
      ${rows}
      <div style="margin-top:12px;">
        <button type="button" class="arc-btn" data-act="add-phase">+ Add phase</button>
      </div>

      <div class="arc-sec">Tone</div>
      <textarea class="arc-textarea" data-f="tone" rows="2" placeholder="The register this 1:1 is asked in…">${esc(draft.tone_register || "")}</textarea>

      <div class="arc-sec">Anti-patterns <span style="text-transform:none; font-weight:400;">— one per line</span></div>
      <textarea class="arc-textarea" data-f="anti" rows="4" placeholder="One thing to avoid per line…">${esc((draft.anti_patterns || []).join("\n"))}</textarea>

      <div class="arc-edit__foot">
        <button type="button" class="arc-btn arc-btn--primary" data-act="save">Save</button>
        <button type="button" class="arc-btn" data-act="cancel">Cancel</button>
        <span class="arc-edit__msg" role="status" aria-live="polite"></span>
        <span class="arc-edit__spacer"></span>
        <button type="button" class="arc-btn arc-btn--danger" data-act="reset">Reset to default</button>
      </div>
    </div>`;
}
