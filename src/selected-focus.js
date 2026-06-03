// Resolve the manager's primary focus for a session (first-class, not notes-only).

function normalizeId(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function resolveSelectedFocus(inputs = {}) {
  if (inputs.selectedFocus?.id) {
    return {
      id: normalizeId(inputs.selectedFocus.id),
      label: inputs.selectedFocus.label || inputs.selectedFocus.id,
    };
  }
  if (inputs.primaryFocusId) {
    const id = normalizeId(inputs.primaryFocusId);
    const fp = (inputs.focusPoints || []).find((p) => normalizeId(p.id) === id);
    return { id, label: fp?.label || fp?.type || id };
  }
  const notes = String(inputs.notes || inputs.observedShift || "").trim();
  if (notes) {
    const key = normalizeId(notes);
    for (const fp of inputs.focusPoints || []) {
      const id = normalizeId(fp.id);
      const type = normalizeId(fp.type);
      if (key === id || key === type) {
        return { id, label: fp.label || fp.type || id };
      }
    }
    if (/quality/i.test(notes)) return { id: "quality", label: "Quality" };
    if (/communication/i.test(notes)) return { id: "communication", label: "Communication" };
    if (/growth/i.test(notes)) return { id: "growth", label: "Growth" };
    if (/judgment/i.test(notes)) return { id: "judgment", label: "Judgment" };
  }
  const first = (inputs.focusPoints || [])[0];
  if (first?.id) {
    return { id: normalizeId(first.id), label: first.label || first.type || first.id };
  }
  return null;
}

module.exports = { resolveSelectedFocus, normalizeId };
