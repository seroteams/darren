// Resolve the manager's primary focus for a session (first-class, not notes-only).

interface FocusInput {
  id?: string;
  label?: string;
  type?: string | null;
  source?: string;
}

interface SelectedFocusInputs {
  selectedFocus?: { id?: string; label?: string };
  primaryFocusId?: string;
  focusPoints?: FocusInput[];
  notes?: string;
  observedShift?: string;
}

interface ResolvedFocus {
  id: string;
  label: string;
  fallback?: true;
}

function normalizeId(s: string | null | undefined): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function resolveSelectedFocus(inputs: SelectedFocusInputs = {}): ResolvedFocus | null {
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
  }
  // No explicit selection and no exact match: fall back honestly — prefer a
  // note-driven (source: "signal") focus point over the first listed one, and
  // tag the result so downstream consumers can see it was a fallback. Never
  // guess a focus from keywords in the notes (a note about "growth of the
  // codebase" is not a Growth focus).
  const points = inputs.focusPoints || [];
  const first = points.find((fp) => fp.source === "signal") || points[0];
  if (first?.id) {
    const id = normalizeId(first.id);
    console.warn(`[selected-focus] no explicit selection — fell back to ${id}`);
    return { id, label: first.label || first.type || first.id, fallback: true };
  }
  return null;
}

export { normalizeId };
