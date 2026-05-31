// Fixed right-rail notes panel. Composer model:
//   Enter (or "Save note" button) = save. Shift+Enter = newline.
// Stage is captured at save time, not per line, so a whole paragraph
// gets tagged with one stage. Saved notes are clickable and become an
// inline editable textarea (same shortcuts; Esc cancels; Delete removes).

import { postNote } from "../api.js";
import {
  attachAutoGrow,
  cryptoId,
  HIDDEN_STAGES,
  renderCtxSegments,
} from "./notes-panel-utils.js";
import { createNotesListController, cssEscape, mountEditMode } from "./notes-list.js";

const NARROW_MQ = window.matchMedia("(max-width: 1024px)");

export function createNotesPanel({ store, setState }) {
  const el = document.createElement("aside");
  el.className = "notes-panel is-hidden";
  el.innerHTML = `
    <div class="notes-panel__head">
      <div class="notes-panel__head-row">
        <div class="notes-panel__head-main">
          <div class="notes-panel__ctx"></div>
          <div class="notes-panel__eyebrow eyebrow">Notes</div>
        </div>
        <button type="button" class="notes-panel__close btn btn--ghost btn--sm" aria-label="Close notes">Close</button>
      </div>
      <div class="notes-panel__dev"></div>
    </div>
    <div class="notes-panel__list"></div>
    <div class="notes-panel__compose">
      <textarea rows="4" placeholder="Type a note about this stage…"></textarea>
      <div class="notes-panel__compose-row">
        <span class="notes-panel__hint">Enter to save · Shift+Enter for new line</span>
        <button type="button" class="btn btn--ghost notes-panel__save">Save note</button>
      </div>
    </div>
  `;
  const ctxEl = el.querySelector(".notes-panel__ctx");
  const devSlot = el.querySelector(".notes-panel__dev");
  const list = el.querySelector(".notes-panel__list");
  const ta = el.querySelector(".notes-panel__compose textarea");
  const saveBtn = el.querySelector(".notes-panel__save");
  const closeBtn = el.querySelector(".notes-panel__close");

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "notes-panel__toggle";
  toggleBtn.textContent = "Notes";
  toggleBtn.setAttribute("aria-expanded", "false");
  toggleBtn.setAttribute("aria-controls", "sero-notes-panel");
  toggleBtn.hidden = true;
  document.body.appendChild(toggleBtn);
  el.id = "sero-notes-panel";

  let panelOpen = false;

  const resizeComposer = attachAutoGrow(ta);
  const errorEl = document.createElement("div");
  errorEl.className = "notes-panel__error is-hidden";
  el.querySelector(".notes-panel__compose").appendChild(errorEl);

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("is-hidden");
  }
  function clearError() {
    errorEl.textContent = "";
    errorEl.classList.add("is-hidden");
  }

  function syncLayout(hidden) {
    const narrow = NARROW_MQ.matches;
    if (hidden) {
      toggleBtn.hidden = true;
      el.classList.add("is-hidden");
      el.classList.remove("notes-panel--open");
      document.body.classList.remove("has-notes-panel", "notes-panel-open");
      toggleBtn.setAttribute("aria-expanded", "false");
      panelOpen = false;
      return;
    }

    el.classList.remove("is-hidden");

    if (narrow) {
      toggleBtn.hidden = false;
      el.classList.toggle("notes-panel--open", panelOpen);
      document.body.classList.toggle("notes-panel-open", panelOpen);
      document.body.classList.toggle("has-notes-panel", panelOpen);
      toggleBtn.setAttribute("aria-expanded", panelOpen ? "true" : "false");
    } else {
      toggleBtn.hidden = true;
      panelOpen = false;
      el.classList.add("notes-panel--open");
      document.body.classList.add("has-notes-panel");
      document.body.classList.remove("notes-panel-open");
      toggleBtn.setAttribute("aria-expanded", "true");
    }
  }

  toggleBtn.addEventListener("click", () => {
    panelOpen = !panelOpen;
    syncLayout(false);
    if (panelOpen) ta.focus({ preventScroll: true });
  });

  closeBtn.addEventListener("click", () => {
    panelOpen = false;
    syncLayout(false);
    toggleBtn.focus({ preventScroll: true });
  });

  NARROW_MQ.addEventListener("change", () => {
    if (!el.classList.contains("is-hidden")) syncLayout(false);
  });

  let editingId = null;
  let saving = false;

  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      commitDraft();
    } else if (e.key === "Enter") {
      e.stopPropagation();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      ta.blur();
    }
  });
  saveBtn.addEventListener("click", () => commitDraft());

  async function commitDraft() {
    if (saving) return;
    const text = ta.value.trim();
    if (!text) return;
    const questionAlias = String(store.currentQuestion?.alias || "").trim();
    const questionStem = String(store.currentQuestion?.name || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const note = {
      id: cryptoId(),
      stage: store.stage,
      turn: store.turn || 0,
      ts: Date.now(),
      text,
      question_alias: questionAlias,
      question_stem: questionStem,
    };
    const prevNotes = store.notes || [];
    const next = [...prevNotes, note];
    setState({ notes: next });
    saving = true;
    saveBtn.disabled = true;
    clearError();
    const ok = await persist(note);
    saving = false;
    saveBtn.disabled = false;
    if (ok) {
      ta.value = "";
      resizeComposer();
    } else {
      setState({ notes: prevNotes });
      showError("Save failed. Note kept in box — try again.");
    }
  }

  async function persist(note, opts = {}) {
    if (!store.sessionId) return false;
    try {
      await postNote(store.sessionId, { ...note, deleted: !!opts.deleted });
      return true;
    } catch (e) {
      console.warn("[notes] save failed:", e.message);
      return false;
    }
  }

  const listController = createNotesListController({
    listEl: list,
    onBeginEdit: beginEdit,
  });

  function render(state) {
    const stage = state?.stage;
    const hidden = !state?.sessionId || HIDDEN_STAGES.has(stage);
    syncLayout(hidden);
    if (!hidden) {
      renderCtxSegments(ctxEl, state?.ctx || {});
      listController.renderList(state?.notes || []);
    }
  }

  function beginEdit(id) {
    if (editingId && editingId !== id) cancelEdit(editingId);
    const note = (store.notes || []).find((x) => x.id === id);
    if (!note) return;
    const itemEl = list.querySelector(`[data-note-id="${cssEscape(id)}"]`);
    if (!itemEl) return;
    editingId = id;
    mountEditMode({
      itemEl,
      note,
      onSave: (text) => saveEdit(id, text),
      onDelete: () => deleteNote(id),
      onCancel: () => cancelEdit(id),
    });
  }

  function cancelEdit() {
    editingId = null;
    listController.renderList(store.notes || []);
  }

  async function saveEdit(id, newText) {
    const text = String(newText || "").trim();
    if (!text) return deleteNote(id);
    const prev = store.notes || [];
    const notes = prev.map((n) => (n.id === id ? { ...n, text } : n));
    editingId = null;
    setState({ notes });
    clearError();
    const updated = notes.find((n) => n.id === id);
    const ok = updated ? await persist(updated) : false;
    if (!ok) {
      setState({ notes: prev });
      showError("Edit failed. Reverted — try again.");
    }
  }

  async function deleteNote(id) {
    const prev = store.notes || [];
    const target = prev.find((n) => n.id === id);
    const notes = prev.filter((n) => n.id !== id);
    editingId = null;
    setState({ notes });
    clearError();
    const ok = target ? await persist(target, { deleted: true }) : true;
    if (!ok) {
      setState({ notes: prev });
      showError("Delete failed. Reverted — try again.");
    }
  }

  function mountDevBadge(node) {
    devSlot.appendChild(node);
  }

  return { el, render, mountDevBadge };
}
