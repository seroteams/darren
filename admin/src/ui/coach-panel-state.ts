// Coach panel state (coach-panel Phase 1) — pure logic, no DOM, no CSS imports,
// so the node:test runner can exercise it directly. The DOM half lives in
// coach-panel.ts. The "why" text handled here is only ever the planner's real
// assessment.note — attached to the axes that moved, never authored here.

export interface AxisRead {
  id: string;
  label: string;
  score: number;
  lastDelta: number;
  historyLen: number;
}

export type WhyMap = Record<string, { delta: number; why: string }>;

export type RowState =
  | { kind: "unrated" }
  | { kind: "rated"; delta: number; why: string };

export const METER_MAX = 3; // planner delta signatures cap at ±3

/** Centre-out meter maths on a −3..+3 scale; off-scale deltas clamp to the rail. */
export function meterFor(delta: number): { pct: number; fillLeft: number; fillWidth: number } {
  const v = Math.max(-METER_MAX, Math.min(METER_MAX, delta));
  const pct = ((v + METER_MAX) / (2 * METER_MAX)) * 100;
  return v >= 0
    ? { pct, fillLeft: 50, fillWidth: pct - 50 }
    : { pct, fillLeft: pct, fillWidth: 50 - pct };
}

/** What a row shows: unrated until the axis first moves; then its last delta + stored why. */
export function rowStateFor(axis: AxisRead, whys: WhyMap): RowState {
  const stored = whys[axis.id];
  if (axis.historyLen === 0 && !stored) return { kind: "unrated" };
  if (stored) return { kind: "rated", delta: stored.delta, why: stored.why };
  // Moved at some point but no note landed (refresh mid-stream) — honest blank, no filler.
  return { kind: "rated", delta: axis.lastDelta, why: "" };
}

/**
 * Attaches each turn's note to the axes that moved that turn. Tolerates either
 * event order (the axes SSE handler is async, so the note can land first).
 */
export function createNoteAttacher(initial: WhyMap = {}) {
  const whys: WhyMap = { ...initial };
  let moved: Array<{ id: string; delta: number }> = [];
  let pendingNote: string | null = null;

  function attach(note: string): void {
    for (const m of moved) whys[m.id] = { delta: m.delta, why: note };
    moved = [];
  }

  return {
    onAxes(axes: AxisRead[]): WhyMap {
      moved = axes.filter((a) => a.lastDelta !== 0).map((a) => ({ id: a.id, delta: a.lastDelta }));
      if (pendingNote !== null && moved.length) {
        attach(pendingNote);
        pendingNote = null;
      }
      return whys;
    },
    onNote(note: string): WhyMap {
      if (moved.length) attach(note);
      else pendingNote = note;
      return whys;
    },
    whys(): WhyMap {
      return whys;
    },
  };
}

/** sessionStorage payload → WhyMap; anything malformed collapses to {}. */
export function parseStoredWhys(raw: string | null): WhyMap {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const out: WhyMap = {};
    for (const [id, v] of Object.entries(data as Record<string, unknown>)) {
      const slot = v as { delta?: unknown; why?: unknown };
      if (typeof slot?.delta !== "number" || typeof slot?.why !== "string") return {};
      out[id] = { delta: slot.delta, why: slot.why };
    }
    return out;
  } catch {
    return {};
  }
}
