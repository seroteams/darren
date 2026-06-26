import { resolveSelectedFocus } from "../engine/selected-focus.ts";
import type { Session, FocusPoint } from "../shared/session.types.ts";

interface FocusRef {
  id: string;
  label: string;
}
interface SessionFocus extends FocusRef {
  selected?: FocusRef[];
  fallback?: true;
}

function getSessionSelectedFocus(session: Session): SessionFocus | null {
  const focusPoints = session.focusPointsResult?.focus_points || [];
  const picked = session.selectedFocusPoints;
  if (Array.isArray(picked) && picked.length) {
    // All manager-picked points flow downstream (capped at 3 — more selected
    // masters than that and the question generator serves none of them well).
    // The first stays primary.
    const fps = picked
      .slice(0, 3)
      .map((id) => focusPoints.find((fp) => fp.id === id))
      .filter((fp): fp is FocusPoint => Boolean(fp));
    const first = fps[0];
    if (first) {
      const toRef = (fp: FocusPoint): FocusRef => ({ id: fp.id, label: fp.label || fp.type || fp.id });
      return { ...toRef(first), selected: fps.map(toRef) };
    }
  }
  return resolveSelectedFocus({
    notes: session.ctx?.notes,
    observedShift: session.ctx?.notes,
    focusPoints: focusPoints.map((fp) => ({ id: fp.id, label: fp.label, type: fp.type ?? undefined, source: fp.source })),
  });
}

export { getSessionSelectedFocus };
