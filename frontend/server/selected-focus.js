const { resolveSelectedFocus } = require("../../src/selected-focus");

function getSessionSelectedFocus(session) {
  const focusPoints = session.focusPointsResult?.focus_points || [];
  const picked = session.selectedFocusPoints;
  if (Array.isArray(picked) && picked.length) {
    const id = typeof picked[0] === "string" ? picked[0] : picked[0]?.id;
    const fp = focusPoints.find((p) => p.id === id);
    if (fp) return { id: fp.id, label: fp.label || fp.type || fp.id };
  }
  return resolveSelectedFocus({
    notes: session.ctx?.notes,
    observedShift: session.ctx?.notes,
    focusPoints,
  });
}

module.exports = { getSessionSelectedFocus };
