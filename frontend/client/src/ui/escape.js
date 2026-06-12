// HTML-escaping helpers for building innerHTML safely.
//
// escapeText(s) — escapes HTML and collapses em/en-dashes to ", " (used for
//                 prose copy where stray dashes read awkwardly).
// escapeHtml(s) — plain HTML escape, leaves dashes intact.

export function escapeText(s) {
  return String(s == null ? "" : s)
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
