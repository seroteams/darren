// Library (internal QA tooling). Full-page list of EVERY finished run, newest
// first, with filters + search and a verdict badge per row. From here you open
// a run's Review page or copy its full review block to the clipboard. You can
// also archive a run (hidden from the default list, viewable via the Archived
// toggle). No Resume/Delete here — finished runs are for judging, not editing.

import { STAGES, setState } from "../state.js";
import { getFinishedRuns, getRunFull, setArchived } from "../../../shared/api.js";
import { libraryBadge, serializeReview } from "../ui/review-serialize.js";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unreviewed", label: "Unreviewed" },
  { key: "keep", label: "Keep" },
  { key: "fix", label: "Fix" },
  { key: "block", label: "Block" },
];

const SORTS = [
  { key: "date", label: "Date" },
  { key: "name", label: "Name" },
  { key: "title", label: "Title" },
  { key: "completeness", label: "Done" },
];

// Direction a sort uses the first time you pick it. Date newest-first and
// completeness most-done-first; name and title read A→Z.
const SORT_DEFAULT_DIR = { date: "desc", name: "asc", title: "asc", completeness: "desc" };

const STATUS_RANK = { complete: 2, partial: 1, none: 0 };

// Ascending comparison between two runs for the given sort key. The render()
// caller flips the sign for descending.
function compareRuns(a, b, key) {
  if (key === "name") {
    const an = a.ctx?.name || a.headline || a.id || "";
    const bn = b.ctx?.name || b.headline || b.id || "";
    return an.localeCompare(bn, undefined, { sensitivity: "base" });
  }
  if (key === "title") {
    const at = a.ctx?.role || "";
    const bt = b.ctx?.role || "";
    return at.localeCompare(bt, undefined, { sensitivity: "base" });
  }
  if (key === "completeness") {
    const byDecided = (a.decided || 0) - (b.decided || 0);
    if (byDecided) return byDecided;
    const byStatus = (STATUS_RANK[a.reviewStatus] || 0) - (STATUS_RANK[b.reviewStatus] || 0);
    if (byStatus) return byStatus;
    return (a.lastSeenAt || 0) - (b.lastSeenAt || 0);
  }
  // date
  return (a.lastSeenAt || 0) - (b.lastSeenAt || 0);
}

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

// Job title → group heading, lightly pluralised ("Content Designer" →
// "Content Designers"). Good enough for the common roles; not a grammar engine.
function pluralize(role) {
  const r = String(role || "").trim();
  if (!r) return "No title";
  if (/s$/i.test(r)) return r;
  if (/[^aeiou]y$/i.test(r)) return r.replace(/y$/i, "ies");
  return r + "s";
}

// The category heading a run falls under for the active sort. Runs sit grouped
// because the list is already sorted by the same key.
function groupLabel(r, key) {
  if (key === "name") {
    const c = String(r.ctx?.name || r.headline || r.id || "").trim().charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : "#";
  }
  if (key === "title") return pluralize(r.ctx?.role);
  if (key === "completeness") {
    if (r.reviewStatus === "complete") return "Reviewed";
    if (r.reviewStatus === "partial") return "In progress";
    return "Not started";
  }
  return fmtDate(r.lastSeenAt) || "No date";
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
          <div class="flex items-center gap-2">
            <button class="btn btn--ghost js-view" type="button">Archived</button>
            <button class="btn btn--ghost js-back" type="button">Back</button>
          </div>
        </div>
        <div class="text-ink-dim text-sm">Review past prep runs.</div>
        <div class="lib-progress js-progress"></div>
      </header>

      <div class="lib-controls">
        <div class="lib-filters" role="tablist">
          ${FILTERS.map((f, i) => `<button type="button" class="lib-filter${i === 0 ? " is-active" : ""}" data-filter="${f.key}">${f.label}</button>`).join("")}
        </div>
        <div class="lib-sort">
          ${SORTS.map((s) => `<button type="button" class="lib-filter" data-sort="${s.key}">${s.label}</button>`).join("")}
        </div>
        <input class="input lib-search" type="search" placeholder="Search name, role, meeting…" autocomplete="off" />
      </div>

      <ul class="lib-list js-list"><li class="text-ink-mute text-sm">Loading…</li></ul>
    </div>
  `;

  const listEl = root.querySelector(".js-list");
  const searchEl = root.querySelector(".lib-search");
  const backBtn = root.querySelector(".js-back");
  const viewBtn = root.querySelector(".js-view");
  const progressEl = root.querySelector(".js-progress");

  const sortEl = root.querySelector(".lib-sort");

  let runs = [];
  let filter = "all";
  let query = "";
  let sortKey = "date";
  let sortDir = "desc";
  let view = "active"; // "active" | "archived"

  function renderSortButtons() {
    sortEl.querySelectorAll(".lib-filter").forEach((b) => {
      const active = b.dataset.sort === sortKey;
      b.classList.toggle("is-active", active);
      const base = SORTS.find((s) => s.key === b.dataset.sort)?.label || "";
      b.textContent = active ? `${base} ${sortDir === "desc" ? "▼" : "▲"}` : base;
    });
  }

  function render() {
    const archivedCount = runs.filter((r) => r.archived).length;
    viewBtn.textContent = view === "archived" ? "Back to active" : `Archived${archivedCount ? ` (${archivedCount})` : ""}`;

    const inView = runs.filter((r) => Boolean(r.archived) === (view === "archived"));
    renderProgress(progressEl, inView);

    const shown = inView.filter((r) => matchesFilter(r, filter) && matchesSearch(r, query));
    shown.sort((a, b) => (sortDir === "desc" ? -1 : 1) * compareRuns(a, b, sortKey));
    renderSortButtons();
    if (!runs.length) {
      listEl.innerHTML = `<li class="text-ink-mute text-sm">No finished runs yet.</li>`;
      return;
    }
    if (!inView.length) {
      listEl.innerHTML = `<li class="text-ink-mute text-sm">No archived runs.</li>`;
      return;
    }
    if (!shown.length) {
      listEl.innerHTML = `<li class="text-ink-mute text-sm">No runs match this filter.</li>`;
      return;
    }
    // Rows are already sorted by the active key, so same-category runs sit
    // together — slot a heading above each new group.
    let lastGroup = null;
    listEl.innerHTML = shown
      .map((r) => {
        const badge = libraryBadge(r.reviewStatus, r.overall);
        const sub = [r.ctx?.role, r.ctx?.meetingType].map((s) => String(s || "").trim()).filter(Boolean).join(" · ");
        const fails = r.failedCount > 0 ? ` · ${r.failedCount} failed` : "";
        const g = groupLabel(r, sortKey);
        let head = "";
        if (g !== lastGroup) { lastGroup = g; head = `<li class="lib-group">${esc(g)}</li>`; }
        return head + `
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
              <button class="btn btn--ghost btn--sm js-archive" data-id="${esc(r.id)}">${view === "archived" ? "Restore" : "Archive"}</button>
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

  async function toggleArchive(id, btn) {
    const next = view !== "archived"; // active view → archive; archived view → restore
    btn.disabled = true;
    try {
      await setArchived(id, next);
      const run = runs.find((r) => r.id === id);
      if (run) run.archived = next;
      render();
    } catch {
      btn.disabled = false;
      btn.textContent = "Failed";
    }
  }

  listEl.addEventListener("click", (e) => {
    const archiveBtn = e.target.closest(".js-archive");
    if (archiveBtn) { toggleArchive(archiveBtn.dataset.id, archiveBtn); return; }
    const copyBtn = e.target.closest(".js-copy");
    if (copyBtn) { copyRun(copyBtn.dataset.id, copyBtn); return; }
    const openBtn = e.target.closest(".js-open");
    if (openBtn) { open(openBtn.dataset.id); return; }
  });

  viewBtn.addEventListener("click", () => {
    view = view === "archived" ? "active" : "archived";
    render();
  });

  root.querySelector(".lib-filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".lib-filter");
    if (!btn) return;
    filter = btn.dataset.filter;
    root.querySelectorAll(".lib-filters .lib-filter").forEach((b) => b.classList.toggle("is-active", b === btn));
    render();
  });

  sortEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".lib-filter");
    if (!btn) return;
    const key = btn.dataset.sort;
    if (key === sortKey) {
      sortDir = sortDir === "desc" ? "asc" : "desc";
    } else {
      sortKey = key;
      sortDir = SORT_DEFAULT_DIR[key] || "desc";
    }
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
  render();
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}
