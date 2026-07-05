// Tasks page (internal) — a simple planner (kanban) YOU own: add cards, drag them
// between columns, edit or delete. Saved in this browser under its own key. Seeded
// once with what's on the go right now so the board reflects reality from the first
// open; after that it's yours to shape.
//
// (The old "Build phases" board lived here too — the prototype→production checklist
// with build-status chips, your verdict ticks and the copy-continue/verify prompts.
// It was removed once every phase was built; the git history keeps it if it's ever
// wanted back.)

import { STAGES, setState } from "../state.js";
import { escapeHtml as esc } from "../ui/html.js";

let keyHandler = null;

// ── Planner (kanban) ─────────────────────────────────────────────────────────
// A simple board YOU own: add cards, drag them between columns, edit or delete.
// Saved in this browser under its OWN key.
const KB_KEY = "sero-tasks-kanban-v1";
const KB_COLS = [
  { id: "ideas", label: "Ideas", emoji: "💡" },
  { id: "todo", label: "To do", emoji: "📋" },
  { id: "doing", label: "Doing", emoji: "🔨" },
  { id: "done", label: "Done", emoji: "✅" },
];
// A lane is just a coloured tag. Any text works; the colour is picked stably from
// this palette by hashing the lane name, so "Design" is always the same colour.
const KB_LANE_COLORS = ["#7C3AED", "#2563EB", "#D97706", "#0D9488", "#DB2777", "#059669", "#DC2626", "#4B5563"];
function laneColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return KB_LANE_COLORS[h % KB_LANE_COLORS.length];
}

// First-open seed — a snapshot of everything on the go on 2026-07-05. Edit freely;
// "Reset to current state" restores exactly this.
const KB_SEED = [
  { col: "doing", lane: "Product", title: "Manager-ready rail", note: "Phase 1 built — customers get Home · New 1:1 · Team · Past 1:1s; internal tools hidden. Awaiting your walk. Phase 2 (Bricolage/4px/date) next." },
  { col: "doing", lane: "Live data", title: "Live-data cleanup", note: "Phases 1–2 done — every screen on /api/v1. Phase 3 next: delete ~54 dead legacy routes." },
  { col: "doing", lane: "Logs", title: "Error log screen", note: "Superadmin Error log (Local/Live), one Neon. Phase 2 built — awaiting walk. Next: Phase 3 browser crashes." },
  { col: "doing", lane: "Users", title: "User management P3", note: "Deactivate / reactivate a user; live session killed immediately. Phase 2 (change role) closed." },
  { col: "doing", lane: "Live data", title: "Page heartbeat", note: "Real UPDATE buttons. Phase 1 ✅ (Guide). Next: Phase 2 Universe ring · Phase 3 Tasks-board reality check." },
  { col: "todo", lane: "Design", title: "Design cleanups", note: "Inline-hex cleanup (8 files), dropdown/progress/error consolidation, ⭐ states batch on the sheet." },
  { col: "todo", lane: "Engine", title: "Run QA fixes (prompt)", note: "Phases 2–4 — prompt changes, need a paid walk." },
  { col: "ideas", lane: "Engine", title: "Planner grounding", note: "Parked — awaiting scope pick (A/B/C/all)." },
  { col: "ideas", lane: "Product", title: "Briefing readability", note: "Parked idea." },
  { col: "done", lane: "Design", title: "Design system (Sero × Flowbite)", note: "Closed 2026-07-05 — Flowbite 2.5.2 + Carl's colours, component sheet + DESIGN.md is law." },
  { col: "done", lane: "Product", title: "Mobile responsive", note: "Closed 2026-07-05 — all 38 screens work at phone width, desktop untouched." },
  { col: "done", lane: "Engine", title: "Test engine hub", note: "Closed 2026-07-05 — Personas/Regression/Compare merged into one page." },
  { col: "done", lane: "Users", title: "Roles: admin/manager/member", note: "Renamed + migrated live on Neon." },
  { col: "done", lane: "Product", title: "Pre-go-live PG1–PG8", note: "Team, Past 1:1s, ratings, and a superadmin window on the alpha." },
];

let kb = { cards: [] };
let kbEditing = null;
function loadKb() {
  try {
    const raw = localStorage.getItem(KB_KEY);
    if (raw) { kb = JSON.parse(raw); return; }
  } catch { /* fall through to seed */ }
  kb = { cards: KB_SEED.map((c, i) => ({ id: "seed" + i, ...c })) };
  saveKb();
}
function saveKb() { try { localStorage.setItem(KB_KEY, JSON.stringify(kb)); } catch {} }

// Move a card to a column and drop it at the end of that column.
function kbMove(id, col) {
  const i = kb.cards.findIndex((c) => c.id === id);
  if (i < 0) return;
  const [c] = kb.cards.splice(i, 1);
  c.col = col;
  kb.cards.push(c);
  saveKb();
}

function kbCardHtml(c) {
  const lane = c.lane
    ? `<span class="kb-lane" style="--kb-lane:${laneColor(c.lane)}">${esc(c.lane)}</span>`
    : "";
  const note = c.note ? `<div class="kb-card__note">${esc(c.note)}</div>` : "";
  const ci = KB_COLS.findIndex((k) => k.id === c.col);
  const left = ci > 0 ? `<button type="button" class="kb-mv" data-mv="prev" data-id="${c.id}" aria-label="Move left">◀</button>` : "";
  const right = ci < KB_COLS.length - 1 ? `<button type="button" class="kb-mv" data-mv="next" data-id="${c.id}" aria-label="Move right">▶</button>` : "";
  return `<article class="kb-card" draggable="true" data-id="${c.id}">
    <div class="kb-card__top">${lane}
      <span class="kb-card__tools">
        <button type="button" class="kb-ic js-kb-edit" data-id="${c.id}" aria-label="Edit card">✎</button>
        <button type="button" class="kb-ic js-kb-del" data-id="${c.id}" aria-label="Delete card">✕</button>
      </span>
    </div>
    <div class="kb-card__title">${esc(c.title)}</div>
    ${note}
    <div class="kb-card__mv">${left}${right}</div>
  </article>`;
}

function kbEditHtml(c) {
  return `<form class="kb-edit" data-id="${c.id}">
    <input class="kb-edit__title" value="${esc(c.title)}" placeholder="Title" aria-label="Card title" />
    <input class="kb-edit__lane" value="${esc(c.lane || "")}" placeholder="Lane (e.g. Design)" aria-label="Lane" />
    <textarea class="kb-edit__note" placeholder="Note (optional)" rows="2" aria-label="Note">${esc(c.note || "")}</textarea>
    <div class="kb-edit__row">
      <button type="submit" class="btn btn--sm">Save</button>
      <button type="button" class="btn btn--sm btn--ghost js-kb-cancel">Cancel</button>
    </div>
  </form>`;
}

function kbColHtml(col) {
  const cards = kb.cards.filter((c) => c.col === col.id);
  const list = cards.map((c) => (c.id === kbEditing ? kbEditHtml(c) : kbCardHtml(c))).join("");
  return `<section class="kb-col" data-col="${col.id}">
    <header class="kb-col__head"><span>${col.emoji} ${col.label}</span><span class="kb-count">${cards.length}</span></header>
    <div class="kb-col__list">${list}</div>
    <form class="kb-add" data-col="${col.id}">
      <input class="kb-add__in" type="text" placeholder="+ Add a card" aria-label="Add a card to ${col.label}" />
    </form>
  </section>`;
}

// Re-render the whole board and re-wire its events. Cheap at this size and keeps
// the DOM a pure function of `kb` — no fiddly in-place surgery.
let kbDragId = null;
function renderKb(root) {
  const board = root.querySelector(".kb-board");
  if (!board) return;
  board.innerHTML = KB_COLS.map(kbColHtml).join("");

  board.querySelectorAll(".kb-card").forEach((el) => {
    el.addEventListener("dragstart", () => { kbDragId = el.dataset.id; el.classList.add("is-drag"); });
    el.addEventListener("dragend", () => { kbDragId = null; el.classList.remove("is-drag"); });
  });
  board.querySelectorAll(".kb-col").forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("is-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("is-over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("is-over");
      if (kbDragId) { kbMove(kbDragId, col.dataset.col); renderKb(root); }
    });
  });
  board.querySelectorAll(".kb-mv").forEach((b) => b.addEventListener("click", () => {
    const c = kb.cards.find((x) => x.id === b.dataset.id);
    if (!c) return;
    const ci = KB_COLS.findIndex((k) => k.id === c.col);
    const ni = b.dataset.mv === "next" ? ci + 1 : ci - 1;
    if (ni >= 0 && ni < KB_COLS.length) { kbMove(c.id, KB_COLS[ni].id); renderKb(root); }
  }));
  board.querySelectorAll(".js-kb-del").forEach((b) => b.addEventListener("click", () => {
    kb.cards = kb.cards.filter((c) => c.id !== b.dataset.id);
    saveKb();
    renderKb(root);
  }));
  board.querySelectorAll(".js-kb-edit").forEach((b) => b.addEventListener("click", () => {
    kbEditing = b.dataset.id;
    renderKb(root);
    root.querySelector(".kb-edit__title")?.focus();
  }));
  board.querySelectorAll(".js-kb-cancel").forEach((b) => b.addEventListener("click", () => {
    kbEditing = null;
    renderKb(root);
  }));
  board.querySelectorAll(".kb-edit").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const c = kb.cards.find((x) => x.id === f.dataset.id);
    if (!c) return;
    c.title = f.querySelector(".kb-edit__title").value.trim() || c.title;
    c.lane = f.querySelector(".kb-edit__lane").value.trim();
    c.note = f.querySelector(".kb-edit__note").value.trim();
    kbEditing = null;
    saveKb();
    renderKb(root);
  }));
  board.querySelectorAll(".kb-add").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = f.querySelector(".kb-add__in");
    const t = inp.value.trim();
    if (!t) return;
    kb.cards.push({ id: "c" + Date.now() + Math.floor(Math.random() * 1000), col: f.dataset.col, lane: "", title: t, note: "" });
    saveKb();
    renderKb(root);
    root.querySelector(`.kb-add[data-col="${f.dataset.col}"] .kb-add__in`)?.focus();
  }));
}

export function mount(root) {
  loadKb();

  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8 tasks">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Tasks</h1>
          <button class="btn btn--ghost js-back" type="button">Back</button>
        </div>
        <div class="page-header__lede"><b>Your planner</b> — a board you own: add a card in any column, drag it across as it moves, click ✎ to add a lane or a note. Saved in this browser.</div>
      </header>

      <section class="kb">
        <div class="kb-head">
          <div>
            <h2 class="h2 kb-title">Your planner</h2>
            <div class="kb-lede">Everything on the go right now, plus room for whatever you want to plan next. Add a card in any column, drag it across as it moves, click ✎ to add a lane or a note. Yours to shape — saved in this browser.</div>
          </div>
          <button class="btn btn--sm btn--ghost js-kb-reset" type="button">Reset to current state</button>
        </div>
        <div class="kb-board"></div>
      </section>
    </div>
  `;

  renderKb(root);
  root.querySelector(".js-kb-reset").addEventListener("click", () => {
    if (!window.confirm("Reset the board to the current-state cards? Any cards you added will be lost.")) return;
    try { localStorage.removeItem(KB_KEY); } catch {}
    kbEditing = null;
    loadKb();
    renderKb(root);
  });

  const back = () => setState({ stage: STAGES.START });
  root.querySelector(".js-back").addEventListener("click", back);
  keyHandler = (e) => {
    if (e.key === "Escape" && !/^(input|textarea|select)$/i.test(e.target.tagName)) back();
  };
  window.addEventListener("keydown", keyHandler);
}

export function unmount() {
  kbEditing = null;
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}
