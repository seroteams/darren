// Shared autosave indicator — the quiet "Saved / Saving…" pip (design-consolidation P5).
// A pure DOM factory: the host owns WHEN to flip state (its own debounce/flush logic lives
// with the host); this owns only the markup and label. Styles live in
// admin/src/styles/design/save-pip.css (class namespace `save-pip`).

export type SavePipState = "idle" | "saving";

/** The pip's visible label per state — exported for tests and string renderers. */
export function savePipLabel(state: SavePipState): string {
  return state === "saving" ? "Saving…" : "Saved";
}

export interface SavePip {
  el: HTMLElement;
  set(state: SavePipState): void;
}

export function createSavePip(): SavePip {
  const el = document.createElement("span");
  el.className = "save-pip";
  el.dataset.state = "idle";
  // role=status: screen readers announce the flip without it stealing focus.
  el.setAttribute("role", "status");
  el.innerHTML = `<span class="save-pip__dot" aria-hidden="true"></span><span class="save-pip__label">${savePipLabel("idle")}</span>`;
  const set = (state: SavePipState): void => {
    el.dataset.state = state;
    const label = el.querySelector<HTMLElement>(".save-pip__label");
    if (label) label.textContent = savePipLabel(state);
  };
  return { el, set };
}
