// Focus-point checkbox-card (design-consolidation Phase 3, audit F5). Pure
// string render so the shape is testable: a real toggle with checkbox
// semantics (role="checkbox" + aria-checked) and the visible check mark the
// stage CSS already styles (.focus-point__check in design/stage-extras.css).
// The host (stages/focus-points.js) wires the js-fp-toggle clicks.

import { escapeCopy as escape } from "../ui/html.js";

export type FocusPointLike = {
  id: string;
  label?: string;
  type?: string;
  reason?: string;
  source?: string;
  confidence?: string;
};

// First sentence of the model's reason; the full text rides on the title attr.
export function focusReason(text: unknown): string {
  const trimmed = String(text == null ? "" : text).trim();
  if (!trimmed) return "";
  const first = trimmed.match(/^(.+?[.!?])(?:\s|$)/)?.[1];
  return first || trimmed;
}

// Plain-language evidence tag: where this point came from, so the manager
// knows how much weight to put on it. Quiet text, no badge chrome.
export function evidenceTag(fp: FocusPointLike): string {
  if (!fp || !fp.source) return "";
  const text =
    fp.source === "signal"
      ? fp.confidence === "high"
        ? "from your note, clearly stated"
        : "from your note"
      : "common for this level";
  return `<div class="focus-point__evidence">${text}</div>`;
}

export function focusPointCardHtml(fp: FocusPointLike, index: number): string {
  const reason = fp.reason
    ? `<div class="focus-point__reason">${escape(focusReason(fp.reason))}</div>`
    : "";
  return `
    <div class="js-fp-wrapper">
      <button type="button" class="focus-point focus-point--selectable js-fp-toggle" role="checkbox" aria-checked="false" data-fp-id="${escape(fp.id)}" title="${escape(fp.reason || "")}">
        <div class="focus-point__num">${index + 1}</div>
        <div class="focus-point__body">
          <div class="focus-point__label">${escape(fp.label || fp.type || fp.id)}</div>
          ${reason}
          ${evidenceTag(fp)}
        </div>
        <div class="focus-point__check" aria-hidden="true"></div>
      </button>
    </div>`;
}

// The live "N selected" note beside the footer's primary.
export function selectedNote(count: number): string {
  return `${count} selected`;
}
