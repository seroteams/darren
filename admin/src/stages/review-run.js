// In-app Run Review (internal QA tooling). A READ-ONLY view of a finished run
// (prep brief → questions → final briefing) plus an 8-dimension pass/fail
// verdict, an overall Keep/Fix/Block, and one note. Saves only review.json to
// the run folder via POST /api/runs/:id/review. Not part of the live manager flow.

import { STAGES, store } from "../state.js";
import { getRunFull, saveReview } from "../../../shared/api.js";
import { DIMENSIONS, OVERALL_VALUES, reviewStatusFromMarks, serializeReview, engineTag } from "../ui/review-serialize.js";
import { escapeHtml as esc } from "../ui/html.js";

const OVERALL_LABEL = { keep: "Keep", fix: "Fix", block: "Block" };

function card(label, inner) {
  return `<div class="stage-review__card"><div class="eyebrow">${esc(label)}</div>${inner}</div>`;
}

function bullets(items) {
  return `<ul class="stage-review__bullets">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

function dateFromId(id) {
  const m = /^(\d{4})_([A-Za-z]{3})(\d{2})/.exec(String(id || ""));
  return m ? `${m[1]} ${m[2]} ${m[3]}` : "";
}

function renderPrep(prep) {
  if (!prep) return `<p class="stage-review__empty caption">Prep unavailable for this run.</p>`;
  const rows = [
    ["Likely theme", prep.coreIssue],
    ["Say this first", prep.openingQuestion],
    ["Listen for", prep.listenFor],
    ["Avoid", prep.avoid],
    ["Success looks like", prep.goodOutcome],
    ["Suggested action", prep.suggestedAction],
  ];
  const body = rows
    .map(([label, val]) => {
      if (val == null || (Array.isArray(val) && !val.length) || (!Array.isArray(val) && !String(val).trim())) return "";
      return card(label, Array.isArray(val) ? bullets(val) : `<p>${esc(val)}</p>`);
    })
    .join("");
  return body || `<p class="stage-review__empty caption">Prep unavailable for this run.</p>`;
}

function renderManagerSetup(ctx) {
  const notes = String(ctx.notes || "").trim();
  if (!notes) return "";
  return `<div class="stage-review__card stage-review__card--private">
    <div class="eyebrow">Manager setup · private</div>
    <p>${esc(notes)}</p>
  </div>`;
}

function renderQuestions(turns) {
  const list = (turns || []).filter((t) => t && (t.name || t.answer));
  if (!list.length) return `<p class="stage-review__empty caption">No questions recorded.</p>`;
  return list
    .map((t, i) => {
      const q = t.name ? `${i + 1}. ${t.name}` : `${i + 1}.`;
      const a = t.skipped ? "(skipped)" : t.answer || "(no answer)";
      return card(esc(q), `<p>${esc(a)}</p>`);
    })
    .join("");
}

function renderBriefing(b) {
  if (!b) return `<p class="stage-review__empty caption">No briefing recorded.</p>`;
  const out = [];
  if (b.headline) out.push(`<p class="stage-review__headline">${esc(b.headline)}</p>`);
  if ((b.summary_bullets || []).length) out.push(card("What stood out", bullets(b.summary_bullets)));
  if (b.understanding_paragraph) out.push(card("What we understood", `<p>${esc(b.understanding_paragraph)}</p>`));
  if (b.brutal_truth_employee) out.push(card("Honest read — them", `<p>${esc(b.brutal_truth_employee)}</p>`));
  if (b.brutal_truth_manager) out.push(card("Honest read — you", `<p>${esc(b.brutal_truth_manager)}</p>`));
  if ((b.next_actions || []).length) {
    const items = b.next_actions.map((a) => `${a.when ? esc(a.when) + ": " : ""}${esc(a.action || "")}`);
    out.push(card("What to do next", `<ul class="stage-review__bullets">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`));
  }
  if ((b.watch_for || []).length) out.push(card("Reminders", bullets(b.watch_for)));
  return out.join("") || `<p class="stage-review__empty caption">No briefing recorded.</p>`;
}

function verdictRows(marks) {
  return DIMENSIONS.map((d, i) => {
    const m = marks[d.key];
    const cls = (val) => `rv-seg__btn js-mark${m === val ? " is-" + val : ""}`;
    return `
      <div class="rv-row" data-key="${esc(d.key)}" data-idx="${i}">
        <div class="rv-row__label">${esc(d.label)}<span class="rv-row__hint">${esc(d.hint)}</span></div>
        <div class="rv-seg">
          <button type="button" class="${cls("pass")}" data-key="${esc(d.key)}" data-val="pass">Pass</button>
          <button type="button" class="${cls("fail")}" data-key="${esc(d.key)}" data-val="fail">Fail</button>
        </div>
      </div>`;
  }).join("");
}

function overallRow(overall) {
  const btn = (val) =>
    `<button type="button" class="rv-ov__btn js-overall${overall === val ? " is-" + val : ""}" data-ov="${val}">${OVERALL_LABEL[val]}</button>`;
  return `<div class="rv-ov">${OVERALL_VALUES.map(btn).join("")}</div>`;
}

let cleanup = null;

export async function mount(root, { setState }) {
  const id = store.reviewRunId;

  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1 js-title">Run review</h1>
          <div class="page-header__actions">
            <button class="btn btn--ghost js-copy-all" type="button">Copy all</button>
            <button class="btn btn--ghost js-back" type="button">Back</button>
          </div>
        </div>
        <div class="text-ink-dim js-subtitle"></div>
        <div class="text-ink-mute text-sm js-meta"></div>
      </header>
      <div class="js-host"><p class="caption text-ink-mute">Loading run…</p></div>
    </div>
  `;

  const back = () => setState({ stage: STAGES.LIBRARY });
  const backBtn = root.querySelector(".js-back");
  backBtn.addEventListener("click", back);

  // Lifecycle: `alive` is flipped false on unmount so any in-flight save/timer
  // callback that resolves after we've navigated away becomes a no-op.
  let alive = true;
  let saveTimer = null;
  let copyTimer = null;
  cleanup = () => {
    alive = false;
    clearTimeout(saveTimer);
    clearTimeout(copyTimer);
    backBtn.removeEventListener("click", back);
    if (keyHandler) window.removeEventListener("keydown", keyHandler);
  };

  let keyHandler = null;
  const host = root.querySelector(".js-host");

  if (!id) {
    host.innerHTML = `<p class="stage-review__empty caption">No run selected.</p>`;
    return;
  }

  let run;
  try {
    run = await getRunFull(id);
  } catch {
    host.innerHTML = `<p class="stage-review__empty caption">Could not load this run. It may have been deleted.</p>`;
    return;
  }
  if (!alive || !root.isConnected) return;

  const ctx = run.ctx || {};
  root.querySelector(".js-title").textContent = ctx.name || run.headline || "Run review";
  root.querySelector(".js-subtitle").textContent = [ctx.role, ctx.seniority, ctx.meetingType]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" · ");

  const marks = {};
  for (const d of DIMENSIONS) {
    const v = run.review?.marks?.[d.key];
    marks[d.key] = v === "pass" || v === "fail" ? v : null;
  }
  let overall = OVERALL_VALUES.includes(run.review?.overall) ? run.review.overall : null;
  let note = run.review?.note || "";

  host.innerHTML = `
    <div class="run-review l-grid">
      <div class="run-review__run l-stack l-stack--6">
        <section><div class="stage-review__section-title">Manager setup</div>${renderManagerSetup(ctx) || `<p class="stage-review__empty caption">No setup notes.</p>`}</section>
        <section><div class="stage-review__section-title">Prep brief</div>${renderPrep(run.prep)}</section>
        <section><div class="stage-review__section-title">Questions</div>${renderQuestions(run.turns)}</section>
        <section><div class="stage-review__section-title">Recap</div>${renderBriefing(run.briefing)}</section>
      </div>
      <aside class="run-review__verdict">
        <div class="card-flat l-stack l-stack--4">
          <div class="run-review__verdict-head">
            <h2 class="h2">Your verdict</h2>
            <div class="run-review__verdict-actions">
              <span class="rv-status" data-state="idle"></span>
              <button type="button" class="btn btn--sm js-save">Save</button>
            </div>
          </div>
          <div class="rv-rows">${verdictRows(marks)}</div>
          <div class="rv-overall">
            <div class="eyebrow">Overall</div>
            ${overallRow(overall)}
          </div>
          <textarea class="rv-note input" placeholder="Notes on this run (optional)…">${esc(note)}</textarea>
        </div>
      </aside>
    </div>
  `;

  const statusEl = host.querySelector(".rv-status");
  const saveBtn = host.querySelector(".js-save");
  const noteEl = host.querySelector(".rv-note");
  const copyBtn = root.querySelector(".js-copy-all");
  const metaEl = root.querySelector(".js-meta");
  const rowsEl = host.querySelector(".rv-rows");

  let dirty = false;
  let selIdx = -1;

  function updateMeta() {
    const decided = DIMENSIONS.filter((d) => marks[d.key] === "pass" || marks[d.key] === "fail").length;
    const status = reviewStatusFromMarks(marks);
    metaEl.textContent = [
      `run ${run.id}`,
      dateFromId(run.id),
      engineTag(run.fingerprint) ? `engine ${engineTag(run.fingerprint)}` : "",
      `${decided}/${DIMENSIONS.length} judged`,
      status,
    ].filter(Boolean).join(" · ");
  }
  updateMeta();

  function setStatus(state) {
    if (!alive) return;
    statusEl.dataset.state = state;
    if (state === "saving") statusEl.textContent = "Saving…";
    else if (state === "saved") statusEl.textContent = "Saved";
    else if (state === "failed") statusEl.innerHTML = `Save failed · <button type="button" class="rv-retry js-retry">Retry</button>`;
    else statusEl.textContent = "";
  }

  async function doSave() {
    setStatus("saving");
    try {
      await saveReview(id, { marks, overall, note });
      if (!alive) return;
      dirty = false;
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }

  function scheduleSave() {
    dirty = true;
    setStatus("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 600);
  }

  // Update only the affected row's buttons in place so the page never
  // re-renders and the scroll position stays put.
  function applyMark(key, val) {
    marks[key] = marks[key] === val ? null : val;
    const row = rowsEl.querySelector(`.rv-row[data-key="${key}"]`);
    if (row) {
      row.querySelectorAll(".js-mark").forEach((b) => {
        b.classList.toggle("is-pass", b.dataset.val === "pass" && marks[key] === "pass");
        b.classList.toggle("is-fail", b.dataset.val === "fail" && marks[key] === "fail");
      });
    }
    updateMeta();
    scheduleSave();
  }

  function applyOverall(val) {
    overall = overall === val ? null : val;
    host.querySelectorAll(".js-overall").forEach((b) => {
      b.classList.toggle("is-keep", b.dataset.ov === "keep" && overall === "keep");
      b.classList.toggle("is-fix", b.dataset.ov === "fix" && overall === "fix");
      b.classList.toggle("is-block", b.dataset.ov === "block" && overall === "block");
    });
    scheduleSave();
  }

  function selectRow(idx) {
    selIdx = Math.max(0, Math.min(DIMENSIONS.length - 1, idx));
    rowsEl.querySelectorAll(".rv-row").forEach((r, i) => r.classList.toggle("is-selected", i === selIdx));
    const row = rowsEl.querySelector(`.rv-row[data-idx="${selIdx}"]`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }

  rowsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-mark");
    if (!btn) return;
    selectRow(Number(btn.closest(".rv-row").dataset.idx));
    applyMark(btn.dataset.key, btn.dataset.val);
  });

  host.querySelector(".rv-ov").addEventListener("click", (e) => {
    const btn = e.target.closest(".js-overall");
    if (btn) applyOverall(btn.dataset.ov);
  });

  noteEl.addEventListener("input", () => {
    note = noteEl.value;
    scheduleSave();
  });

  statusEl.addEventListener("click", (e) => {
    if (e.target.closest(".js-retry")) doSave();
  });

  // Manual save: flush immediately, cancelling the pending autosave debounce.
  saveBtn.addEventListener("click", () => {
    clearTimeout(saveTimer);
    doSave();
  });

  async function copyAll() {
    const text = serializeReview(run, { marks, overall, note });
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied";
    } catch {
      copyBtn.textContent = "Copy failed";
    }
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyBtn.textContent = "Copy all"; }, 1200);
  }
  copyBtn.addEventListener("click", copyAll);

  // Keyboard for repeated QA: ↑/↓ select dimension, P/F mark it, N note, C copy,
  // Esc back. Ignore when typing in the note box (except Esc to blur).
  keyHandler = (e) => {
    const typing = /^(input|textarea|select)$/i.test(e.target.tagName);
    if (typing) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    const k = e.key.toLowerCase();
    if (e.key === "ArrowDown") { e.preventDefault(); selectRow(selIdx < 0 ? 0 : selIdx + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selectRow(selIdx < 0 ? 0 : selIdx - 1); }
    else if (k === "p" && selIdx >= 0) applyMark(DIMENSIONS[selIdx].key, "pass");
    else if (k === "f" && selIdx >= 0) applyMark(DIMENSIONS[selIdx].key, "fail");
    else if (k === "n") { e.preventDefault(); noteEl.focus(); }
    else if (k === "c") copyAll();
    else if (e.key === "Escape") back();
  };
  window.addEventListener("keydown", keyHandler);

  // On leave: stop callbacks, cancel timers, drop listeners, and flush any
  // unsaved edits so nothing is lost.
  cleanup = () => {
    alive = false;
    clearTimeout(saveTimer);
    clearTimeout(copyTimer);
    backBtn.removeEventListener("click", back);
    window.removeEventListener("keydown", keyHandler);
    if (dirty) saveReview(id, { marks, overall, note }).catch(() => {});
  };
}

export function unmount() {
  if (cleanup) cleanup();
  cleanup = null;
}
