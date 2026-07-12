// Escape user-typed text before it goes into innerHTML. The runner restores saved notes
// (manager-typed) into textareas and titles, so this is a real safety boundary, not cosmetic.
export const esc = (s: unknown): string =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
