// Fixed right-rail panel with three tabs:
//   Notes  — QA notes about this run (Enter/"Save note" = save, Shift+Enter =
//            newline; saved notes are click-to-edit; Esc cancels; Delete removes).
//   Sent   — what the AI was given for the current stage + the exact prompt.
//   Reply  — what the AI sent back for the current stage.
// Notes behaviour is unchanged from before tabs existed; Sent/Reply are rendered
// by stage-data-tab.js from the run's logged stage I/O.

import { postNote } from "../../../shared/api.js";
import { STAGES } from "../state.js";
import { isFlowStage } from "../router.js";
import {
  attachAutoGrow,
  cryptoId,
  renderCtxSegments,
} from "./notes-panel-utils.js";
import { createNotesListController, cssEscape, mountEditMode } from "./notes-list.js";
import { createStageDataController } from "./stage-data-tab.js";

const NARROW_MQ = window.matchMedia("(max-width: 1024px)");

export function createNotesPanel({ store, setState }) {
  const el = document.createElement("aside");
  el.className = "notes-panel is-hidden";
  el.innerHTML = `
    <div class="notes-panel__head">
      <div class="notes-panel__head-row">
        <div class="notes-panel__head-main">
          <div class="notes-panel__ctx ctx-segments"></div>
        </div>
        <button type="button" class="notes-panel__close btn btn--ghost btn--sm" aria-label="Close panel">Close</button>
      </div>
      <div class="notes-panel__tabs" role="tablist">
        <button type="button" class="notes-panel__tab is-active" data-tab="notes" role="tab" aria-selected="true">Notes</button>
        <button type="button" class="notes-panel__tab" data-tab="sent" role="tab" aria-selected="false">Sending</button>
        <button type="button" class="notes-panel__tab" data-tab="reply" role="tab" aria-selected="false">Received</button>
      </div>
    </div>

    <div class="notes-panel__tabpane" data-pane="notes">
      <div class="notes-panel__notes-head">
        <div class="notes-panel__eyebrow eyebrow">Test notes</div>
        <p class="notes-panel__helper text-ink-dim text-xs">Your QA notes about this run. Manager context is shown in the main flow.</p>
        <div class="notes-panel__dev"></div>
      </div>
      <div class="notes-panel__list"></div>
      <div class="notes-panel__compose">
        <textarea rows="4" placeholder="Type a test note about this stage…"></textarea>
        <div class="notes-panel__compose-row">
          <button type="button" class="btn btn--ghost notes-panel__save">Save note</button>
        </div>
      </div>
    </div>

    <div class="notes-panel__tabpane is-hidden" data-pane="sent"></div>
    <div class="notes-panel__tabpane is-hidden" data-pane="reply"></div>
  `;
  const ctxEl = el.querySelector(".notes-panel__ctx");
  const devSlot = el.querySelector(".notes-panel__dev");
  const list = el.querySelector(".notes-panel__list");
  const ta = el.querySelector(".notes-panel__compose textarea");
  const saveBtn = el.querySelector(".notes-panel__save");
  const closeBtn = el.querySelector(".notes-panel__close");
  const tabsEl = el.querySelector(".notes-panel__tabs");
  const panes = {
    notes: el.querySelector('[data-pane="notes"]'),
    sent: el.querySelector('[data-pane="sent"]'),
    reply: el.querySelector('[data-pane="reply"]'),
  };

  // Sent/Reply content is owned by the stage-data controller; mount its two
  // root nodes into the matching panes.
  const stageData = createStageDataController();
  panes.sent.appendChild(stageData.sentEl);
  panes.reply.appendChild(stageData.replyEl);

  // Which tab is showing — remembered across open/close while the rail lives.
  let activeTab = "notes";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "notes-panel__toggle";
  toggleBtn.textContent = "Run panel";
  toggleBtn.setAttribute("aria-expanded", "false");
  toggleBtn.setAttribute("aria-controls", "sero-notes-panel");
  toggleBtn.hidden = true;
  document.body.appendChild(toggleBtn);
  el.id = "sero-notes-panel";

  let panelOpen = false;
  // On the briefing (the manager-facing payoff), the QA rail starts collapsed
  // at any width so the briefing reads clean; the toggle keeps it one click away.
  let railCollapsed = false;

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

  function switchTab(tab) {
    if (!panes[tab]) return;
    activeTab = tab;
    for (const [name, pane] of Object.entries(panes)) {
      pane.classList.toggle("is-hidden", name !== tab);
    }
    tabsEl.querySelectorAll(".notes-panel__tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (tab === "notes") ta.focus({ preventScroll: true });
    else stageData.render(store, activeTab);
  }

  tabsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".notes-panel__tab");
    if (btn) switchTab(btn.dataset.tab);
  });

  function syncLayout(hidden) {
    // A collapsed rail behaves like the narrow (toggle-driven) layout at any width.
    const narrow = NARROW_MQ.matches || railCollapsed;
    document.body.classList.toggle("notes-rail-collapsed", !hidden && railCollapsed);
    if (hidden) {
      toggleBtn.hidden = true;
      el.classList.add("is-hidden");
      el.classList.remove("notes-panel--open");
      document.body.classList.remove("has-notes-panel", "notes-panel-open", "notes-rail-collapsed");
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
    if (panelOpen) {
      if (activeTab === "notes") ta.focus({ preventScroll: true });
      else stageData.render(store, activeTab);
    }
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
    // Test-notes rail is a run-only tool: show it only while an admin is actually
    // doing a run (the flow stages), never on other admin pages like Universe/Tasks
    // where a lingering sessionId used to leak it in.
    const hidden = !state?.sessionId || !isFlowStage(stage);
    railCollapsed = stage === STAGES.BRIEFING;
    syncLayout(hidden);
    if (!hidden) {
      if (stage === STAGES.QUESTIONING) {
        ctxEl.innerHTML = "";
        ctxEl.classList.add("is-empty");
      } else {
        renderCtxSegments(ctxEl, state?.ctx || {});
      }
      listController.renderList(state?.notes || []);
      // Keep the visible AI tab in sync with the current stage.
      if (activeTab !== "notes") stageData.render(state, activeTab);
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
