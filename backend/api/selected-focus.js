const { resolveSelectedFocus } = require("../engine/selected-focus.ts");

function getSessionSelectedFocus(session) {
  const focusPoints = session.focusPointsResult?.focus_points || [];
  const picked = session.selectedFocusPoints;
  if (Array.isArray(picked) && picked.length) {
    // All manager-picked points flow downstream (capped at 3 — more selected
    // masters than that and the question generator serves none of them well).
    // The first stays primary.
    const fps = picked
      .slice(0, 3)
      .map((p) => (typeof p === "string" ? p : p?.id))
      .map((id) => focusPoints.find((fp) => fp.id === id))
      .filter(Boolean);
    if (fps.length) {
      const toRef = (fp) => ({ id: fp.id, label: fp.label || fp.type || fp.id });
      return { ...toRef(fps[0]), selected: fps.map(toRef) };
    }
  }
  return resolveSelectedFocus({
    notes: session.ctx?.notes,
    observedShift: session.ctx?.notes,
    focusPoints,
  });
}

module.exports = { getSessionSelectedFocus };
