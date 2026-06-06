// In-app Run Review (internal QA tooling). A READ-ONLY view of a finished run
// (prep brief → questions → final briefing) plus an 8-dimension pass/fail
// verdict with one note. Saves only review.json to the run folder via
// POST /api/runs/:id/review. Not part of the live manager flow.

import { STAGES, store } from "../state.js";
import { getRunFull, saveReview } from "../api.js";
import { DIMENSIONS, serializeReview } from "../ui/review-serialize.js";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function card(label, inner) {
  return `<div class="stage-review__card"><div class="eyebrow">${esc(label)}</div>${inner}</div>`;
}

function bullets(items) {
  return `<ul class="stage-review__bullets">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
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
  return DIMENSIONS.map((d) => {
    const m = marks[d.key];
    const cls = (val) => `rv-seg__btn js-mark${m === val ? " is-" + val : ""}`;
    return `
      <div class="rv-row" data-key="${esc(d.key)}">
        <div class="rv-row__label">${esc(d.label)}<span class="rv-row__hint">${esc(d.hint)}</span></div>
        <div class="rv-seg">
          <button type="button" class="${cls("pass")}" data-key="${esc(d.key)}" data-val="pass">Pass</button>
          <button type="button" class="${cls("fail")}" data-key="${esc(d.key)}" data-val="fail">Fail</button>
        </div>
      </div>`;
  }).join("");
}

let cleanup = null;

export async function mount(root, { setState }) {
  const id = store.reviewRunId;

  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1 js-title">Run review</h1>
          <button class="btn btn--ghost js-back" type="button">Back</button>
        </div>
        <div class="text-ink-dim text-sm js-subtitle"></div>
      </header>
      <div class="js-host"><p class="caption text-ink-mute">Loading run…</p></div>
    </div>
  `;

  const back = () => setState({ stage: STAGES.START });
  const backBtn = root.querySelector(".js-back");
  backBtn.addEventListener("click", back);

  // Lifecycle: `alive` is flipped false on unmount so any in-flight save/timer
  // callback that resolves after we've navigated away becomes a no-op (no writes
  // to detached DOM). Set early so it also covers the load-failure paths.
  let alive = true;
  let saveTimer = null;
  let copyTimer = null;
  cleanup = () => {
    alive = false;
    clearTimeout(saveTimer);
    clearTimeout(copyTimer);
    backBtn.removeEventListener("click", back);
  };

  const host = root.querySelector(".js-host");

  if (!id) {
    host.innerHTML = `<p class="stage-review__empty caption">No run selected.</p>`;
    return;
  }

  let run;
  try {
    run = await getRunFull(id);
  } catch (e) {
    host.innerHTML = `<p class="stage-review__empty caption">Could not load this run. It may have been deleted.</p>`;
    return;
  }

  // The stage may have been replaced while awaiting.
  if (!alive || !root.isConnected) return;

  root.querySelector(".js-title").textContent = run.headline || "Run review";
  const ctx = run.ctx || {};
  root.querySelector(".js-subtitle").textContent = [ctx.role, ctx.seniority, ctx.meetingType]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" · ");

  const marks = {};
  for (const d of DIMENSIONS) {
    const v = run.review?.marks?.[d.key];
    marks[d.key] = v === "pass" || v === "fail" ? v : null;
  }
  let note = run.review?.note || "";

  host.innerHTML = `
    <div class="run-review l-grid">
      <div class="run-review__run l-stack l-stack--6">
        <section>${`<div class="stage-review__section-title">Prep brief</div>`}${renderPrep(run.prep)}</section>
        <section>${`<div class="stage-review__section-title">Questions</div>`}${renderQuestions(run.turns)}</section>
        <section>${`<div class="stage-review__section-title">Final briefing</div>`}${renderBriefing(run.briefing)}</section>
      </div>
      <aside class="run-review__verdict">
        <div class="card-flat l-stack l-stack--4">
          <div class="run-review__verdict-head">
            <h2 class="h2">Your verdict</h2>
            <span class="rv-status" data-state="idle"></span>
          </div>
          <div class="rv-rows">${verdictRows(marks)}</div>
          <textarea class="rv-note input" placeholder="Notes on this run (optional)…">${esc(note)}</textarea>
          <div class="run-review__verdict-actions">
            <button type="button" class="btn btn--ghost js-copy-all">Copy all</button>
          </div>
        </div>
      </aside>
    </div>
  `;

  const statusEl = host.querySelector(".rv-status");
  const noteEl = host.querySelector(".rv-note");
  const copyBtn = host.querySelector(".js-copy-all");

  let dirty = false;

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
      await saveReview(id, { marks, note });
      if (!alive) return;
      dirty = false;
      setStatus("saved");
    } catch (e) {
      setStatus("failed");
    }
  }

  function scheduleSave() {
    dirty = true;
    setStatus("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 600);
  }

  // Pass/Fail toggle: update only the clicked row's two buttons in place so the
  // page never re-renders and the scroll position stays put.
  host.querySelector(".rv-rows").addEventListener("click", (e) => {
    const btn = e.target.closest(".js-mark");
    if (!btn) return;
    const key = btn.dataset.key;
    const val = btn.dataset.val;
    marks[key] = marks[key] === val ? null : val;
    const seg = btn.closest(".rv-seg");
    seg.querySelectorAll(".js-mark").forEach((b) => {
      b.classList.toggle("is-pass", b.dataset.val === "pass" && marks[key] === "pass");
      b.classList.toggle("is-fail", b.dataset.val === "fail" && marks[key] === "fail");
    });
    scheduleSave();
  });

  noteEl.addEventListener("input", () => {
    note = noteEl.value;
    scheduleSave();
  });

  statusEl.addEventListener("click", (e) => {
    if (e.target.closest(".js-retry")) doSave();
  });

  copyBtn.addEventListener("click", async () => {
    const text = serializeReview(run, { marks, note });
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied";
    } catch {
      copyBtn.textContent = "Copy failed";
    }
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyBtn.textContent = "Copy all"; }, 1200);
  });

  // On leave: stop callbacks, cancel timers, drop the back listener, and flush
  // any unsaved edits so nothing is lost.
  cleanup = () => {
    alive = false;
    clearTimeout(saveTimer);
    clearTimeout(copyTimer);
    backBtn.removeEventListener("click", back);
    if (dirty) saveReview(id, { marks, note }).catch(() => {});
  };
}

export function unmount() {
  if (cleanup) cleanup();
  cleanup = null;
}
