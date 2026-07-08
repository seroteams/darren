// Tasks page (internal) — a simple planner (kanban) YOU own: add cards, drag them
// between columns, edit or delete. Saved in this browser under its own key. On open
// it reads the LIVE plan folders (docs/plans/doing + done, via the heartbeat API) and
// fills in one "Docs" card per unfinished plan — so the board reflects what's actually
// on disk right now, not a hand-typed snapshot. Your own cards sit alongside, untouched.
//
// (The old "Build phases" board lived here too — the prototype→production checklist
// with build-status chips, your verdict ticks and the copy-continue/verify prompts.
// It was removed once every phase was built; the git history keeps it if it's ever
// wanted back.)

import { STAGES, setState } from "../state.js";
import { escapeHtml as esc } from "../ui/html.js";
import { getHeartbeat } from "../../../shared/api.js";
import { icon } from "../ui/icon.js";
import {
  Lightbulb, ClipboardList, Hammer, CircleCheck, ChevronLeft, ChevronRight, Pencil, X,
  Banknote, Pause, Target, CircleParking, Gauge, NotebookPen, Play, Check, Plus, Trash2, RefreshCw,
} from "lucide";

let keyHandler = null;

// ── Planner (kanban) ─────────────────────────────────────────────────────────
// A simple board YOU own: add cards, drag them between columns, edit or delete.
// Saved in this browser under its OWN key.
const KB_KEY = "sero-tasks-kanban-v1";
const KB_COLS = [
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "todo", label: "To do", icon: ClipboardList },
  { id: "doing", label: "Doing", icon: Hammer },
  { id: "done", label: "Done", icon: CircleCheck },
];
// A lane is just a coloured tag. Any text works; the colour is picked stably from
// this palette by hashing the lane name, so "Design" is always the same colour.
const KB_LANE_COLORS = ["#7C3AED", "#2563EB", "#D97706", "#0D9488", "#DB2777", "#059669", "#DC2626", "#4B5563"];
function laneColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return KB_LANE_COLORS[h % KB_LANE_COLORS.length];
}

let kb = { cards: [] };
let kbEditing = null;
let kbSelected = null; // card id shown in the right-side detail panel
function loadKb() {
  try {
    const raw = localStorage.getItem(KB_KEY);
    if (raw) { kb = JSON.parse(raw); return; }
  } catch { /* fall through to an empty board */ }
  kb = { cards: [] }; // no hardcoded seed — syncDocsOnOpen() fills the board from live folders
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
  const left = ci > 0 ? `<button type="button" class="kb-mv" data-mv="prev" data-id="${c.id}" aria-label="Move left">${icon(ChevronLeft, { size: 16 })}</button>` : "";
  const right = ci < KB_COLS.length - 1 ? `<button type="button" class="kb-mv" data-mv="next" data-id="${c.id}" aria-label="Move right">${icon(ChevronRight, { size: 16 })}</button>` : "";
  return `<article class="kb-card${c.id === kbSelected ? " is-selected" : ""}" draggable="true" data-id="${c.id}">
    <div class="kb-card__top">${lane}
      <span class="kb-card__tools">
        <button type="button" class="kb-ic js-kb-edit" data-id="${c.id}" aria-label="Edit card">${icon(Pencil, { size: 15 })}</button>
        <button type="button" class="kb-ic js-kb-del" data-id="${c.id}" aria-label="Delete card">${icon(X, { size: 15 })}</button>
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
    <header class="kb-col__head"><span>${icon(col.icon, { size: 16 })} ${col.label}</span><span class="kb-count">${cards.length}</span></header>
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
    el.addEventListener("click", (e) => {
      if (e.target.closest(".kb-ic, .kb-mv")) return; // edit/delete/move buttons keep their own jobs
      kbSelected = el.dataset.id;
      renderKb(root);
    });
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

  renderPanel(root); // keep the detail panel in step with whatever just changed
}

// ── Card detail panel ────────────────────────────────────────────────────────
// Click a card → a Trello-style panel slides in on the right: edit the card,
// keep dated notes on it, copy a "pick this up" prompt for a fresh Claude
// session, and see my drift read (the GUARDRAILS.md rules applied to the card).

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// My rules, applied to this card's text. Mirrors docs/reference/guardrails.md — warn,
// never block. Keyword checks, so treat it as a nudge, not a verdict.
function kbGuardrails(c) {
  const txt = [c.title, c.note, ...(c.log || []).map((n) => n.text)].join(" ").toLowerCase();
  const out = [];
  if (/\b(gate|smoke|eval|paid|persona|replay|openai)\b/.test(txt))
    out.push({ icon: icon(Banknote, { size: 16 }), head: "Money", body: "This touches paid runs (OpenAI). Rough cost gets stated first (~$0.35 a run, ~$3 the full gate), you say yes per run, and we run the smallest thing that proves the point." });
  if (/awaiting|await |your walk|sign-?off|green.?light|needs qa/.test(txt))
    out.push({ icon: icon(Pause, { size: 16 }), head: "Pace", body: "Something here is built and waiting on YOUR walk. Building the next bit before that sign-off is pace drift — walk what's waiting first." });
  if (/polish|nicer|prettier|readability|restyle|animation|look better/.test(txt))
    out.push({ icon: icon(Target, { size: 16 }), head: "Goal", body: "Reads like polish. Check it serves the real win — a manager getting insight worth paying for — not just a nicer demo." });
  if (/\bparked?\b/.test(txt))
    out.push({ icon: icon(CircleParking, { size: 16 }), head: "Scope", body: "This was parked on purpose. Picking it up is fine — as its own step, deliberately, not bolted onto whatever's mid-flight." });
  const doing = kb.cards.filter((x) => x.col === "doing").length;
  if ((c.col === "ideas" || c.col === "todo") && doing >= 4)
    out.push({ icon: icon(Gauge, { size: 16 }), head: "Pace", body: `${doing} cards are already in Doing. One phase at a time — consider landing one before picking this up.` });
  if (!out.length)
    out.push({ icon: icon(CircleCheck, { size: 16 }), head: "On track", body: "No drift flags on this card. Standing rules still apply: one phase at a time, you test before anything's called done, no paid runs without your yes." });
  return out;
}

// The self-contained prompt Carl pastes into a fresh Claude session.
function kbPickupPrompt(c) {
  const col = KB_COLS.find((k) => k.id === c.col);
  const notes = (c.log || []).map((n) => `- [${n.at}] ${n.text}`).join("\n");
  return `Pick up this card from my Tasks planner board:

CARD: ${c.title}
LANE: ${c.lane || "—"} · COLUMN: ${col ? col.label : c.col}
DETAILS: ${c.note || "—"}${notes ? `\nMY NOTES:\n${notes}` : ""}

How to start:
1. Read STATUS.md and SERO_BOARD.md to see where this fits, and check docs/plans/doing/ for an existing plan folder.
2. Give me the current picture in plain words, then propose the next step — and wait for my green light before building (Darren Method, one phase at a time).
3. Free checks only — nothing that hits the OpenAI API without asking me first.`;
}

function kbPanelHtml(c) {
  const lane = c.lane
    ? `<span class="kb-lane" style="--kb-lane:${laneColor(c.lane)}">${esc(c.lane)}</span>`
    : `<span class="kbp__nolane">no lane</span>`;
  const colOpts = KB_COLS.map((k) => `<option value="${k.id}"${k.id === c.col ? " selected" : ""}>${k.label}</option>`).join("");
  const guards = kbGuardrails(c)
    .map((g) => `<li class="kbp-guard"><span class="kbp-guard__ic">${g.icon}</span><div class="kbp-guard__body"><b>${g.head}.</b> ${esc(g.body)}</div></li>`)
    .join("");
  const log = c.log || [];
  const notes = log.length
    ? log.map((n, i) => ({ n, i })).reverse().map(({ n, i }) =>
        `<li class="kbp-note">
          <div class="kbp-note__head"><span>${esc(n.at)}</span><button type="button" class="kb-ic js-kbp-delnote" data-i="${i}" aria-label="Delete note">${icon(X, { size: 15 })}</button></div>
          <div class="kbp-note__text">${esc(n.text)}</div>
        </li>`).join("")
    : `<li class="kbp-note kbp-note--empty">No notes yet — jot the first one above.</li>`;
  return `<aside class="kbp" role="dialog" aria-label="Card details">
    <div class="kbp__head">${lane}<button type="button" class="kb-ic kbp__close js-kbp-close" aria-label="Close panel">${icon(X, { size: 16 })}</button></div>
    <input class="kbp__title js-kbp-title" value="${esc(c.title)}" aria-label="Card title" />
    <div class="kbp__meta">
      <label class="kbp__field">Lane <input class="js-kbp-lane" value="${esc(c.lane || "")}" placeholder="e.g. Design" aria-label="Lane" /></label>
      <label class="kbp__field">Column <select class="js-kbp-col" aria-label="Column">${colOpts}</select></label>
    </div>
    <label class="kbp__field">Details
      <textarea class="js-kbp-note" rows="4" placeholder="What this card is about" aria-label="Details">${esc(c.note || "")}</textarea>
    </label>
    <div class="kbp__hint">Edits save when you click away.</div>

    <section class="kbp__sec">
      <h3 class="kbp__h">${icon(Gauge, { size: 18 })} Claude's read</h3>
      <ul class="kbp-guards">${guards}</ul>
    </section>

    <section class="kbp__sec">
      <h3 class="kbp__h">${icon(NotebookPen, { size: 18 })} Notes</h3>
      <form class="kbp-addnote js-kbp-addnote">
        <input type="text" placeholder="Add a note…" aria-label="Add a note" />
        <button type="submit" class="btn btn--sm">Add</button>
      </form>
      <ul class="kbp-notes">${notes}</ul>
    </section>

    <section class="kbp__sec">
      <h3 class="kbp__h">${icon(Play, { size: 18 })} Pick this up</h3>
      <div class="kbp__hint">Copy this into a fresh Claude session to start work on this card.</div>
      <textarea class="kbp__prompt js-kbp-prompt" rows="12" readonly aria-label="Pick-this-up prompt">${esc(kbPickupPrompt(c))}</textarea>
      <button type="button" class="btn btn--sm js-kbp-copy">${icon(ClipboardList, { size: 16 })} Copy prompt</button>
    </section>
  </aside>`;
}

// The panel host lives on <body>, not inside the stage — the stage wrapper
// animates in with a transform, which would trap position:fixed inside it.
let kbpHost = null;
function renderPanel(root) {
  if (!kbpHost) {
    kbpHost = document.createElement("div");
    kbpHost.className = "kbp-host";
    document.body.appendChild(kbpHost);
  }
  const host = kbpHost;
  const c = kb.cards.find((x) => x.id === kbSelected);
  if (!c) { kbSelected = null; host.innerHTML = ""; return; }
  host.innerHTML = kbPanelHtml(c);

  const close = () => { kbSelected = null; renderKb(root); };
  host.querySelector(".js-kbp-close").addEventListener("click", close);

  // Edits save on change (blur), then the board re-renders to match.
  const save = () => { saveKb(); renderKb(root); };
  host.querySelector(".js-kbp-title").addEventListener("change", (e) => { c.title = e.target.value.trim() || c.title; save(); });
  host.querySelector(".js-kbp-lane").addEventListener("change", (e) => { c.lane = e.target.value.trim(); save(); });
  host.querySelector(".js-kbp-note").addEventListener("change", (e) => { c.note = e.target.value.trim(); save(); });
  host.querySelector(".js-kbp-col").addEventListener("change", (e) => { kbMove(c.id, e.target.value); renderKb(root); });

  host.querySelector(".js-kbp-addnote").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = e.target.querySelector("input");
    const t = inp.value.trim();
    if (!t) return;
    c.log = c.log || [];
    c.log.push({ at: nowStamp(), text: t });
    save();
    host.querySelector(".kbp-addnote input")?.focus();
  });
  host.querySelectorAll(".js-kbp-delnote").forEach((b) => b.addEventListener("click", () => {
    c.log.splice(Number(b.dataset.i), 1);
    save();
  }));

  host.querySelector(".js-kbp-copy").addEventListener("click", async (e) => {
    const text = kbPickupPrompt(c);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = host.querySelector(".js-kbp-prompt");
      ta.focus(); ta.select();
      document.execCommand("copy");
    }
    e.target.innerHTML = `${icon(Check, { size: 16 })} Copied`;
    setTimeout(() => { if (e.target.isConnected) e.target.innerHTML = `${icon(ClipboardList, { size: 16 })} Copy prompt`; }, 1400);
  });
}

// ── Update from docs ─────────────────────────────────────────────────────────
// "Update" reads docs/plans/doing/ live (via GET /api/v1/heartbeat — the server re-reads
// the repo per request) and syncs a set of auto-managed "Docs" cards: one per plan
// folder that isn't finished. It shows every place it checks, ticks them off, then
// animates adding / updating / removing ONLY those Docs cards. Cards you added by
// hand (anything without src:"docs") are never touched.

const DOC_LANE = "Docs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Which column an active plan sits in, from its phase tallies.
function docCol(p) {
  return p.done > 0 || p.inProgress > 0 ? "doing" : "todo";
}
function docNote(p) {
  const phases = p.total ? `${p.done}/${p.total} phases done` : "phases not tracked in a table";
  const ready = p.total > 0 && p.done >= p.total ? " · all phases done — ready to close out" : "";
  const state = p.state ? ` · ${p.state}` : "";
  return `${phases}${ready}${state}`;
}

// Tick a list of <li> checks green one after another, for the "checking…" feel.
function tickThrough(items, alive) {
  return new Promise((resolve) => {
    let i = 0;
    const step = () => {
      if (!alive() || i >= items.length) return resolve();
      const li = items[i++];
      li.classList.add("is-checked");
      const dot = li.querySelector(".tk-sync__dot");
      if (dot) dot.innerHTML = icon(Check, { size: 12 });
      setTimeout(step, 70);
    };
    setTimeout(step, 120);
  });
}

function syncSummaryHtml(ch) {
  const parts = [];
  if (ch.added) parts.push(`<li>${icon(Plus, { size: 15 })} Added ${ch.added} ${ch.added === 1 ? "card" : "cards"} for active plans</li>`);
  if (ch.updated) parts.push(`<li>${icon(Pencil, { size: 15 })} Updated ${ch.updated} ${ch.updated === 1 ? "card" : "cards"} — status moved on</li>`);
  if (ch.completed) parts.push(`<li>${icon(CircleCheck, { size: 15 })} Moved ${ch.completed} to Done — plan closed out</li>`);
  if (ch.removed) parts.push(`<li>${icon(Trash2, { size: 15 })} Removed ${ch.removed} — plan no longer there</li>`);
  if (!parts.length) return `<div class="tk-sync__ok">Everything's up to date — nothing to add, change or remove.</div>`;
  return `<div class="tk-sync__stitle">Since your last check:</div>
    <ul class="tk-sync__changes">${parts.join("")}</ul>
    <div class="tk-sync__hint">These <b>Docs</b> cards are kept in sync by Update — your own cards are never touched.</div>`;
}

// Add / update / move / remove the Docs cards to match the live plan folders, with
// a fade-out for leavers and a slide-in / pulse for the fresh ones.
async function reconcileDocs(root, active, doneSlugs) {
  const desired = new Map(
    active.map((p) => [
      `doc:${p.slug}`,
      { id: `doc:${p.slug}`, slug: p.slug, col: docCol(p), title: p.title, note: docNote(p) },
    ])
  );
  const current = kb.cards.filter((c) => c.src === "docs");
  const currentById = new Map(current.map((c) => [c.id, c]));

  const added = [];
  const updated = [];
  const completed = [];
  const removed = [];
  for (const [id, d] of desired) {
    const cur = currentById.get(id);
    if (!cur) added.push(d);
    else if (cur.col !== d.col || cur.title !== d.title || cur.note !== d.note) updated.push(d);
  }
  for (const c of current) {
    if (desired.has(c.id)) continue;
    if (doneSlugs.includes(c.slug)) {
      if (c.col === "done") continue; // already parked in Done — don't re-animate / re-report it every sync
      completed.push(c);
    } else {
      removed.push(c);
    }
  }

  // Phase A — fade the cards that are leaving their spot.
  const leaving = [...removed, ...completed];
  for (const c of leaving) root.querySelector(`.kb-card[data-id="${c.id}"]`)?.classList.add("tk-leave");
  if (leaving.length) await wait(320);

  // Phase B — apply the changes and re-render.
  for (const d of added) kb.cards.push({ id: d.id, src: "docs", slug: d.slug, col: d.col, lane: DOC_LANE, title: d.title, note: d.note });
  for (const d of updated) {
    const c = kb.cards.find((x) => x.id === d.id);
    if (c) { c.col = d.col; c.title = d.title; c.note = d.note; }
  }
  for (const c of completed) {
    const card = kb.cards.find((x) => x.id === c.id);
    if (card) { card.col = "done"; card.note = "done — moved to docs/plans/done/"; }
  }
  if (removed.length) {
    const gone = new Set(removed.map((c) => c.id));
    kb.cards = kb.cards.filter((c) => !gone.has(c.id));
  }
  saveKb();
  renderKb(root);

  // Phase C — highlight what just changed.
  for (const d of added) root.querySelector(`.kb-card[data-id="${d.id}"]`)?.classList.add("tk-enter");
  for (const c of completed) root.querySelector(`.kb-card[data-id="${c.id}"]`)?.classList.add("tk-enter");
  for (const d of updated) root.querySelector(`.kb-card[data-id="${d.id}"]`)?.classList.add("tk-pulse");

  return { added: added.length, updated: updated.length, completed: completed.length, removed: removed.length };
}

let syncing = false;
async function runUpdate(root) {
  if (syncing) return;
  syncing = true;
  const btn = root.querySelector(".js-kb-update");
  if (btn) { btn.disabled = true; btn.classList.add("is-busy"); }

  const overlay = document.createElement("div");
  overlay.className = "tk-sync";
  overlay.innerHTML = `<div class="tk-sync__panel" role="dialog" aria-label="Update from docs">
      <div class="tk-sync__head">${icon(RefreshCw, { size: 16 })} Checking docs for unfinished work…</div>
      <ul class="tk-sync__list"><li class="is-checked"><span class="tk-sync__dot">${icon(Check, { size: 12 })}</span> reaching the server…</li></ul>
      <div class="tk-sync__summary" hidden></div>
      <div class="tk-sync__actions" hidden><button type="button" class="btn btn--sm js-sync-close">Done</button></div>
    </div>`;
  root.appendChild(overlay);
  const alive = () => overlay.isConnected;
  const finish = () => { syncing = false; if (btn) { btn.disabled = false; btn.classList.remove("is-busy"); } };
  const close = () => { overlay.remove(); finish(); };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector(".js-sync-close").addEventListener("click", close);

  // Be honest about WHY a check fails — don't collapse every failure into
  // "couldn't reach the server". A 200 with no `todos` means the API is up but
  // running an older build; a 401/403 means the session isn't an admin; only a
  // genuine fetch error means the server is actually unreachable.
  let todos = null;
  let failReason = null;
  try {
    const hb = await getHeartbeat();
    if (hb && hb.todos) todos = hb.todos;
    else failReason = "Reached the API on :3001, but it's running an older build with no docs snapshot. Restart the API (stop it and re-run npm run dev), then try again.";
  } catch (e) {
    if (e && (e.status === 401 || e.status === 403)) failReason = "You're not signed in as an admin, or the session expired. Sign in again, then try again.";
    else if (e && e.status) failReason = `The API on :3001 returned an error (HTTP ${e.status}). Nothing on your board changed.`;
    else failReason = "Couldn't reach the server — the docs check needs the API running on :3001.";
  }
  if (!alive()) { finish(); return; }

  const list = overlay.querySelector(".tk-sync__list");
  const summary = overlay.querySelector(".tk-sync__summary");
  const actions = overlay.querySelector(".tk-sync__actions");

  if (!todos) {
    list.innerHTML = "";
    summary.hidden = false;
    summary.innerHTML = `<div class="tk-sync__err">${esc(failReason)} Nothing on your board changed.</div>`;
    actions.hidden = false;
    return;
  }

  const active = Array.isArray(todos.active) ? todos.active : [];
  const doneSlugs = Array.isArray(todos.done) ? todos.done : [];

  list.innerHTML =
    active.map((p) => `<li><span class="tk-sync__dot"></span> docs/plans/doing/${esc(p.slug)}</li>`).join("") +
    `<li><span class="tk-sync__dot"></span> docs/plans/done/ · ${doneSlugs.length} closed</li>`;
  await tickThrough(Array.from(list.querySelectorAll("li")), alive);
  if (!alive()) { finish(); return; }

  const changes = await reconcileDocs(root, active, doneSlugs);
  if (!alive()) { finish(); return; }

  overlay.querySelector(".tk-sync__head").innerHTML = `${icon(Check, { size: 16 })} Done checking`;
  summary.hidden = false;
  summary.innerHTML = syncSummaryHtml(changes);
  actions.hidden = false;
  overlay.querySelector(".js-sync-close").focus();
}

// Scoped styles for the Update button, the checking overlay, and the card
// add/change/leave animations (kept inline like guide.js's ARC_STYLE).
const TASKS_STYLE = `<style>
  .kb-head__actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .js-kb-update.is-busy { opacity:.7; }
  .kb-card.tk-enter { animation: tk-enter .34s ease both; }
  .kb-card.tk-pulse { animation: tk-pulse 1.2s ease; }
  .kb-card.tk-leave { opacity:0; transform:scale(.96); transition:opacity .3s ease, transform .3s ease; }
  @keyframes tk-enter { from { opacity:0; transform:translateY(-7px) scale(.98); } to { opacity:1; transform:none; } }
  @keyframes tk-pulse { 0% { box-shadow:0 0 0 2px var(--sero-gold-400, #e0b34d); } 100% { box-shadow:0 0 0 0 transparent; } }
  .tk-sync { position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; background:rgba(15,23,42,.35); padding:16px; }
  .tk-sync__panel { background:var(--color-surface, #fff); border:1px solid var(--color-border, #e2e8f0); border-radius:14px; padding:20px 22px; width:min(460px, 94vw); max-height:82vh; overflow:auto; box-shadow:0 24px 60px rgba(2,6,23,.28); }
  .tk-sync__head { font-weight:600; font-size:15px; margin-bottom:12px; color:var(--color-ink, #0f172a); }
  .tk-sync__list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
  .tk-sync__list li { display:flex; align-items:center; gap:9px; font-size:14px; opacity:.5; color:var(--color-ink-dim, #475569); transition:opacity .2s ease, color .2s ease; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
  .tk-sync__list li.is-checked { opacity:1; color:var(--color-ink, #0f172a); }
  .tk-sync__dot { width:17px; height:17px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; font-size:11px; color:#fff; border:2px solid var(--color-border-strong, #cbd5e1); }
  .tk-sync__list li.is-checked .tk-sync__dot { background:var(--sero-emerald-500, #10b981); border-color:var(--sero-emerald-500, #10b981); }
  .tk-sync__summary { margin-top:14px; font-size:14px; color:var(--color-ink, #0f172a); }
  .tk-sync__stitle { font-weight:600; margin-bottom:6px; }
  .tk-sync__changes { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:5px; }
  .tk-sync__changes li { font-size:14px; }
  .tk-sync__hint { margin-top:10px; font-size:14px; color:var(--color-ink-dim, #475569); }
  .tk-sync__ok { font-size:14px; color:var(--color-ink, #0f172a); }
  .tk-sync__err { font-size:14px; color:var(--sero-rose-700, #b4232a); }
  .tk-sync__actions { margin-top:16px; text-align:right; }
</style>`;

// Quiet version of Update, run once when the page opens: pull the live plan folders
// in as Docs cards with no modal — just the same slide-in / pulse on the board. If the
// API isn't reachable, leave the board exactly as it is (your own cards still show).
async function syncDocsOnOpen(root) {
  let todos = null;
  try {
    const hb = await getHeartbeat();
    if (hb && hb.todos) todos = hb.todos;
  } catch { /* offline — nothing to sync, board stays as-is */ }
  if (!todos) return;
  const active = Array.isArray(todos.active) ? todos.active : [];
  const doneSlugs = Array.isArray(todos.done) ? todos.done : [];
  await reconcileDocs(root, active, doneSlugs);
}

export function mount(root) {
  loadKb();

  root.innerHTML = `
    ${TASKS_STYLE}
    <div class="stage-medium l-stack l-stack--8 tasks">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Tasks</h1>
          <button class="btn btn--ghost js-back" type="button">Back</button>
        </div>
        <div class="page-header__lede"><b>Your planner</b> — a board you own: add a card in any column, drag it across as it moves, click ${icon(Pencil, { size: 14 })} to add a lane or a note. It fills itself from the live plan folders on open; hit <b>Update from docs</b> to re-check. Saved in this browser.</div>
      </header>

      <section class="kb">
        <div class="kb-head">
          <div>
            <h2 class="h2 kb-title">Your planner</h2>
            <div class="kb-lede">Everything on the go right now, plus room for whatever you want to plan next. Add a card in any column, drag it across as it moves, <b>click a card to open it</b> — details, notes, a copy-paste "pick this up" prompt and my drift read. Yours to shape — saved in this browser.</div>
          </div>
          <div class="kb-head__actions">
            <button class="btn btn--sm js-kb-update" type="button">${icon(RefreshCw, { size: 16 })} Update from docs</button>
            <button class="btn btn--sm btn--ghost js-kb-reset" type="button">Reset from docs</button>
          </div>
        </div>
        <div class="kb-board"></div>
      </section>
    </div>
  `;

  renderKb(root);
  syncDocsOnOpen(root); // fill the board from the live plan folders on open
  root.querySelector(".js-kb-update").addEventListener("click", () => runUpdate(root));
  root.querySelector(".js-kb-reset").addEventListener("click", () => {
    if (!window.confirm("Clear the board and rebuild it from the live plan folders? Any cards you added by hand will be lost.")) return;
    try { localStorage.removeItem(KB_KEY); } catch {}
    kbEditing = null;
    loadKb();
    renderKb(root);
    syncDocsOnOpen(root);
  });

  const back = () => setState({ stage: STAGES.START });
  root.querySelector(".js-back").addEventListener("click", back);
  keyHandler = (e) => {
    if (e.key !== "Escape" || /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (kbSelected) { kbSelected = null; renderKb(root); return; } // Esc closes the panel first
    back();
  };
  window.addEventListener("keydown", keyHandler);
}

export function unmount() {
  kbEditing = null;
  kbSelected = null;
  if (kbpHost) { kbpHost.remove(); kbpHost = null; }
  syncing = false;
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}
