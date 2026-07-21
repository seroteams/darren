// Shared HTML-safety + copy-normalization helpers.

// Escape the four HTML-significant characters (& < > ") for safe interpolation
// into markup. Attribute interpolations must use double quotes — ' is not escaped.
export function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Collapse em/en dashes (with any surrounding space) to ", " — enforces the
// no-em-dash copy rule on user-facing strings before they are escaped.
function normalizeDashes(s) {
  return String(s == null ? "" : s).replace(/\s*[—–]\s*/g, ", "); // lint-copy-ignore: this regex must literally match em/en dashes to strip them
}

// Escape user-facing copy: normalize dashes first, then HTML-escape.
export function escapeCopy(s) {
  return escapeHtml(normalizeDashes(s));
}
