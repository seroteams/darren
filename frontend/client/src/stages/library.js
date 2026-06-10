// Library (internal QA tooling). Full-page list of EVERY finished run, newest
// first, with filters + search and a verdict badge per row. From here you open
// a run's Review page or copy its full review block to the clipboard. Read-only:
// no Resume/Delete here — finished runs are for judging, not editing.

import { STAGES, setState } from "../state.js";
import { getFinishedRuns, getRunFull } from "../api.js";
import { libraryBadge, serializeReview } from "../ui/review-serialize.js";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unreviewed", label: "Unreviewed" },
  { key: "keep", label: "Keep" },
  { key: "fix", label: "Fix" },
  { key: "block", label: "Block" },
];

let keyHandler = null;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(ts) {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function matchesFilter(run, filter) {
  if (filter === "all") return true;
  if (filter === "unreviewed") return run.reviewStatus === "none" || !run.reviewStatus;
  // keep / fix / block — only completed reviews carry an overall verdict.
  return run.overall === filter;
}

function matchesSearch(run, q) {
  if (!q) return true;
  const hay = [run.headline, run.ctx?.name, run.ctx?.role, run.ctx?.meetingType, run.id]
    .map((s) => String(s || "").toLowerCase())
    .join(" ");
  return hay.includes(q);
}

// Inbox progress across all loaded runs: how many are fully reviewed, and how
// many are still marked Fix / Block (the open work). Reviewed === complete.
function progressOf(runs) {
  const total = runs.length;
  const reviewed = runs.filter((r) => r.reviewStatus === "complete").length;
  const fix = runs.filter((r) => r.overall === "fix").length;
  const block = runs.filter((r) => r.overall === "block").length;
  const pct = total ? Math.round((reviewed / total) * 100) : 0;
  return { total, reviewed, fix, block, pct };
}

function renderProgress(el, runs) {
  if (!runs.length) { el.innerHTML = ""; return; }
  const p = progressOf(runs);
  const open = [p.fix ? `Fix ${p.fix}` : "", p.block ? `Block ${p.block}` : ""].filter(Boolean).join(" · ");
  el.innerHTML = `
    <div class="lib-progress__row">
      <span class="lib-progress__count">${p.reviewed} of ${p.total} reviewed</span>
      ${open ? `<span class="lib-progress__open text-ink-dim text-sm">${esc(open)}</span>` : ""}
    </div>
    <div class="lib-progress__bar"><i style="width:${p.pct}%"></i></div>
  `;
}

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Library</h1>
          <button class="btn btn--ghost js-back" type="button">Back</button>
        </div>
        <div class="text-ink-dim text-sm">Review past prep runs.</div>
        <div class="lib-progress js-progress"></div>
      </header>

      <div class="lib-controls">
        <div class="lib-filters" role="tablist">
          ${FILTERS.map((f, i) => `<button type="button" class="lib-filter${i === 0 ? " is-active" : ""}" data-filter="${f.key}">${f.label}</button>`).join("")}
        </div>
        <input class="input lib-search" type="search" placeholder="Search name, role, meeting…" autocomplete="off" />
      </div>

      <ul class="lib-list js-list"><li class="text-ink-mute text-sm">Loading…</li></ul>
    </div>
  `;

  const listEl = root.querySelector(".js-list");
  const searchEl = root.querySelector(".lib-search");
  const backBtn = root.querySelector(".js-back");
  const progressEl = root.querySelector(".js-progress");

  let runs = [];
  let filter = "all";
  let query = "";

  function render() {
    const shown = runs.filter((r) => matchesFilter(r, filter) && matchesSearch(r, query));
    if (!runs.length) {
      listEl.innerHTML = `<li class="text-ink-mute text-sm">No finished runs yet.</li>`;
      return;
    }
    if (!shown.length) {
      listEl.innerHTML = `<li class="text-ink-mute text-sm">No runs match this filter.</li>`;
      return;
    }
    listEl.innerHTML = shown
      .map((r) => {
        const badge = libraryBadge(r.reviewStatus, r.overall);
        const sub = [r.ctx?.role, r.ctx?.meetingType].map((s) => String(s || "").trim()).filter(Boolean).join(" · ");
        const fails = r.failedCount > 0 ? ` · ${r.failedCount} failed` : "";
        return `
          <li class="lib-row" data-id="${esc(r.id)}">
            <button class="lib-row__main js-open" data-id="${esc(r.id)}">
              <span class="lib-row__title">${esc(r.ctx?.name || r.headline || r.id)}</span>
              <span class="lib-row__sub text-ink-dim text-sm">${esc(sub)}</span>
            </button>
            <span class="lib-row__right">
              <span class="lib-badge lib-badge--${badge.tone}">${esc(badge.label)}${fails}</span>
              <span class="lib-row__date text-ink-mute text-xs">${esc(r.decided)}/8</span>
              <span class="lib-row__date text-ink-mute text-xs">${esc(fmtDate(r.lastSeenAt))}</span>
              <button class="btn btn--ghost btn--sm js-open" data-id="${esc(r.id)}">Review</button>
              <button class="btn btn--ghost btn--sm js-copy" data-id="${esc(r.id)}">Copy</button>
            </span>
          </li>`;
      })
      .join("");
  }

  async function copyRun(id, btn) {
    const original = btn.textContent;
    btn.textContent = "…";
    try {
      const run = await getRunFull(id);
      await navigator.clipboard.writeText(serializeReview(run, run.review || {}));
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Failed";
    }
    setTimeout(() => { btn.textContent = original; }, 1200);
  }

  function open(id) {
    setState({ reviewRunId: id, stage: STAGES.REVIEW_RUN });
  }

  listEl.addEventListener("click", (e) => {
    const copyBtn = e.target.closest(".js-copy");
    if (copyBtn) { copyRun(copyBtn.dataset.id, copyBtn); return; }
    const openBtn = e.target.closest(".js-open");
    if (openBtn) { open(openBtn.dataset.id); return; }
  });

  root.querySelector(".lib-filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".lib-filter");
    if (!btn) return;
    filter = btn.dataset.filter;
    root.querySelectorAll(".lib-filter").forEach((b) => b.classList.toggle("is-active", b === btn));
    render();
  });

  searchEl.addEventListener("input", () => { query = searchEl.value.trim().toLowerCase(); render(); });

  const back = () => setState({ stage: STAGES.START });
  backBtn.addEventListener("click", back);
  keyHandler = (e) => {
    if (e.key === "Escape" && !/^(input|textarea|select)$/i.test(e.target.tagName)) back();
  };
  window.addEventListener("keydown", keyHandler);

  try {
    const res = await getFinishedRuns();
    runs = res.runs || [];
  } catch (e) {
    runs = [];
    console.warn("[library] getFinishedRuns failed:", e);
  }
  renderProgress(progressEl, runs);
  render();
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}
