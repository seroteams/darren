import {
  attachAutoGrow,
  cssEscape,
  escapeHtml,
  fmtTime,
  groupNotes,
} from "./notes-panel-utils.js";

export { cssEscape };

function noteItemHtml(n) {
  return `
    <div class="notes-panel__item" data-note-id="${escapeHtml(n.id)}">
      <div class="notes-panel__item-head">
        <span class="notes-panel__ts">${fmtTime(n.ts)}</span>
      </div>
      <div class="notes-panel__text">${escapeHtml(n.text)}</div>
    </div>
  `;
}

export function createNotesListController({ listEl, onBeginEdit }) {
  function renderList(notes) {
    if (!notes.length) {
      listEl.innerHTML = `<div class="notes-panel__empty">No notes yet. Write one below — paragraphs welcome.</div>`;
      return;
    }
    const groups = groupNotes(notes);
    listEl.innerHTML = groups
      .map(
        (g) => `
        <div class="notes-panel__group">
          <div class="notes-panel__group-head">${escapeHtml(g.head)}</div>
          ${g.items.map((n) => noteItemHtml(n)).join("")}
        </div>`
      )
      .join("");
    listEl.querySelectorAll("[data-note-id]").forEach((item) => {
      const id = item.dataset.noteId;
      item.addEventListener("click", (e) => {
        if (item.classList.contains("is-editing")) return;
        if (e.target.closest("button, a, textarea")) return;
        onBeginEdit(id);
      });
    });
    listEl.scrollTop = listEl.scrollHeight;
  }

  return { renderList };
}

export function mountEditMode({ itemEl, note, onSave, onDelete, onCancel }) {
  itemEl.classList.add("is-editing");
  itemEl.innerHTML = `
    <div class="notes-panel__item-head">
      <span class="notes-panel__ts">${fmtTime(note.ts)}</span>
      <span class="notes-panel__hint">Enter saves · Shift+Enter for new line · Esc cancels</span>
    </div>
    <textarea class="notes-panel__edit" rows="3">${escapeHtml(note.text)}</textarea>
    <div class="notes-panel__edit-actions">
      <button type="button" class="btn btn--ghost js-save-edit">Save</button>
      <button type="button" class="notes-panel__delete js-delete">Delete</button>
    </div>
  `;
  const editTa = itemEl.querySelector("textarea");
  attachAutoGrow(editTa);
  editTa.focus();
  editTa.setSelectionRange(editTa.value.length, editTa.value.length);

  editTa.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onSave(editTa.value);
    } else if (e.key === "Enter") {
      e.stopPropagation();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  });
  itemEl.querySelector(".js-save-edit").addEventListener("click", () => onSave(editTa.value));
  itemEl.querySelector(".js-delete").addEventListener("click", onDelete);
}
