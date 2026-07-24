// Library (internal QA tooling). Full-page list of EVERY finished run, newest
// first, with filters + search and a verdict badge per row. From here you open
// a run's Review page or copy its full review block to the clipboard. You can
// also archive a run (hidden from the default list, viewable via the Archived
// toggle). No Resume/Delete here — finished runs are for judging, not editing.
//
// Design-consolidation P6 (D1): the bespoke row list is now the one um-table
// idiom — shared list toolbar (search + filter chips + count), sortable column
// headers, whole row opens the run, secondary actions in the shared ⋯ row menu.

import { STAGES, setState } from "../state.js";
import { getFinishedRuns, getRunFull, setArchived } from "../../../shared/api.js";
import { libraryBadge, serializeReview } from "../ui/review-serialize.js";
import { escapeHtml as esc } from "../ui/html.js";
import { formatDate } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { MoreHorizontal } from "lucide";
import { listToolbar } from "../ui/list-toolbar.ts";
import { sortableHeader } from "../ui/table-sort.ts";
import { openRowMenu } from "../ui/row-menu.ts";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unreviewed", label: "Unreviewed" },
  { key: "keep", label: "Keep" },
  { key: "fix", label: "Fix" },
  { key: "block", label: "Block" },
];

// Direction a sort uses the first time you pick it. Date newest-first and
// completeness most-judged-first; person and role read A→Z.
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

function fmtDate(ts) {
  // One date format everywhere (DESIGN.md rule 9) — shared, locale-proof.
  return formatDate(Number(ts));
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

function runRow(r) {
  const badge = libraryBadge(r.reviewStatus, r.overall);
  const fails = r.failedCount > 0 ? `<span class="text-ink-dim text-sm"> · ${r.failedCount} failed</span>` : "";
  const name = r.ctx?.name || r.headline || r.id;
  const meeting = String(r.ctx?.meetingType || "").trim();
  return `
    <tr class="um-row js-open" data-id="${esc(r.id)}">
      <td>
        <button type="button" class="um-user__open js-open" data-id="${esc(r.id)}">${esc(name)}</button>
        ${meeting ? `<div class="text-ink-dim text-sm">${esc(meeting)}</div>` : ""}
      </td>
      <td class="text-ink-dim">${esc(String(r.ctx?.role || "").trim() || "–")}</td>
      <td><span class="lib-badge lib-badge--${badge.tone}">${esc(badge.label)}</span>${fails}</td>
      <td class="text-ink-dim">${esc(r.decided)}/8</td>
      <td class="text-ink-dim">${esc(fmtDate(r.lastSeenAt))}</td>
      <td class="um-actions">
        <button type="button" class="row-menu-btn js-more" data-id="${esc(r.id)}" aria-haspopup="menu" aria-label="More actions for this run">${icon(MoreHorizontal, { size: 18 })}</button>
      </td>
    </tr>`;
}

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--6">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Library</h1>
          <div class="flex items-center gap-2">
            <button class="btn btn--ghost js-view" type="button">Archived</button>
          </div>
        </div>
        <div class="text-ink-dim">Review past prep runs.</div>
        <div class="lib-progress js-progress"></div>
      </header>

      ${listToolbar({
        search: { placeholder: "Search name, role, meeting…" },
        filters: FILTERS.map((f, i) => ({ key: f.key, label: f.label, active: i === 0 })),
        count: { n: 0, noun: "run" },
      })}

      <div class="js-table"><p class="text-ink-mute text-sm">Loading…</p></div>
    </div>
  `;

  const tableEl = root.querySelector(".js-table");
  const searchEl = root.querySelector(".js-lt-search");
  const countEl = root.querySelector(".list-toolbar__count");
  const viewBtn = root.querySelector(".js-view");
  const progressEl = root.querySelector(".js-progress");

  let runs = [];
  let filter = "all";
  let query = "";
  let sortKey = "date";
  let sortDir = "desc";
  let view = "active"; // "active" | "archived"

  function render() {
    const archivedCount = runs.filter((r) => r.archived).length;
    viewBtn.textContent = view === "archived" ? "Back to active" : `Archived${archivedCount ? ` (${archivedCount})` : ""}`;

    const inView = runs.filter((r) => Boolean(r.archived) === (view === "archived"));
    renderProgress(progressEl, inView);

    const shown = inView.filter((r) => matchesFilter(r, filter) && matchesSearch(r, query));
    shown.sort((a, b) => (sortDir === "desc" ? -1 : 1) * compareRuns(a, b, sortKey));
    countEl.textContent = `${shown.length} ${shown.length === 1 ? "run" : "runs"}`;

    if (!runs.length) {
      tableEl.innerHTML = `<p class="text-ink-mute">No finished runs yet.</p>`;
      return;
    }
    if (!inView.length) {
      tableEl.innerHTML = `<p class="text-ink-mute">No archived runs.</p>`;
      return;
    }
    if (!shown.length) {
      tableEl.innerHTML = `<p class="text-ink-mute">No runs match this filter.</p>`;
      return;
    }
    const dirOf = (key) => (key === sortKey ? sortDir : undefined);
    tableEl.innerHTML = `
      <div class="um-table-wrap">
        <table class="um-table">
          <thead>
            <tr>
              ${sortableHeader("Person", "name", dirOf("name"))}
              ${sortableHeader("Role", "title", dirOf("title"))}
              <th>Verdict</th>
              ${sortableHeader("Judged", "completeness", dirOf("completeness"))}
              ${sortableHeader("Date", "date", dirOf("date"))}
              <th class="um-actions-th"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>${shown.map(runRow).join("")}</tbody>
        </table>
      </div>`;
  }

  // Menu-item feedback lands on the row's ⋯ button (the menu itself has closed).
  function flashButton(btn, text) {
    const original = btn.innerHTML;
    btn.textContent = text;
    setTimeout(() => { btn.innerHTML = original; }, 1200);
  }

  async function copyRun(id, btn) {
    try {
      const run = await getRunFull(id);
      await navigator.clipboard.writeText(serializeReview(run, run.review || {}));
      flashButton(btn, "Copied");
    } catch {
      flashButton(btn, "Failed");
    }
  }

  function open(id) {
    // No reviewFrom tag: Library is the review screen's default origin.
    setState({ reviewRunId: id, stage: STAGES.REVIEW_RUN });
  }

  async function toggleArchive(id, btn) {
    const next = view !== "archived"; // active view → archive; archived view → restore
    try {
      await setArchived(id, next);
      const run = runs.find((r) => r.id === id);
      if (run) run.archived = next;
      render();
    } catch {
      flashButton(btn, "Failed");
    }
  }

  tableEl.addEventListener("click", (e) => {
    const moreBtn = e.target.closest(".js-more");
    if (moreBtn) {
      e.stopPropagation();
      const id = moreBtn.dataset.id;
      openRowMenu(moreBtn, [
        { label: "Copy review", onSelect: () => { void copyRun(id, moreBtn); } },
        // Archive is reversible (Restore lives on the Archived view), so it skips
        // the confirm dialog — that stays reserved for destructive actions.
        { label: view === "archived" ? "Restore" : "Archive", onSelect: () => { void toggleArchive(id, moreBtn); } },
      ]);
      return;
    }
    const row = e.target.closest(".js-open");
    if (row) open(row.dataset.id);
  });

  tableEl.addEventListener("click", (e) => {
    const sortBtn = e.target.closest(".js-lt-sort");
    if (!sortBtn) return;
    const key = sortBtn.dataset.sort;
    if (key === sortKey) {
      sortDir = sortDir === "desc" ? "asc" : "desc";
    } else {
      sortKey = key;
      sortDir = SORT_DEFAULT_DIR[key] || "desc";
    }
    render();
  });

  viewBtn.addEventListener("click", () => {
    view = view === "archived" ? "active" : "archived";
    render();
  });

  root.querySelectorAll(".js-lt-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.key;
      root.querySelectorAll(".js-lt-filter").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      render();
    });
  });

  searchEl.addEventListener("input", () => { query = searchEl.value.trim().toLowerCase(); render(); });

  // Library is a top-level rail page — no per-screen Back (Breadcrumb Rule, P5);
  // Escape still hops home as a convenience. When a ⋯ menu is open, Escape belongs
  // to the menu: row-menu.ts closes it on the capture phase and preventDefaults,
  // so a consumed Escape must not ALSO leave the page.
  const back = () => setState({ stage: STAGES.START });
  keyHandler = (e) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    back();
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
