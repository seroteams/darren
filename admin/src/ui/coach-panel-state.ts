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

const METER_MAX = 3; // planner delta signatures cap at ±3

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

  // The planner writes ONE sentence per turn about the strongest signal it saw
  // (plan-turn.md <assessment_rules>), not one sentence per axis. Copying it under
  // every axis that moved made a note about a delivery date read as the reason
  // Wellbeing fell — which is exactly what the first corridor manager objected to:
  // "I don't think Daryl's wellbeing is impacted, I think it's the team"
  // (machar-fixes P3). It now lands on the axis that actually moved most; the
  // others keep their delta and show no reason, which rowStateFor already renders
  // honestly as a blank rather than filler.
  function attach(note: string): void {
    const owner = moved.reduce<{ id: string; delta: number } | null>(
      (best, m) => (best && Math.abs(best.delta) >= Math.abs(m.delta) ? best : m),
      null,
    );
    for (const m of moved) {
      whys[m.id] = { delta: m.delta, why: m.id === owner?.id ? note : "" };
    }
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

// --- Support hints (coach-panel Phase 2) ----------------------------------------------------

/** One coaching hint shown in the Support view. Mirrors backend QuestionHint. */
export interface Hint {
  kind: "ask" | "listen";
  text: string;
}

/** Validate wire hints from a question → ≤3 clean {kind,text}; drops anything malformed. */
export function cleanHints(raw: unknown): Hint[] {
  if (!Array.isArray(raw)) return [];
  const out: Hint[] = [];
  for (const item of raw) {
    if (out.length >= 3) break;
    const kind = (item as { kind?: unknown })?.kind;
    const text = (item as { text?: unknown })?.text;
    if ((kind === "ask" || kind === "listen") && typeof text === "string" && text.trim()) {
      out.push({ kind, text: text.trim() });
    }
  }
  return out;
}

/**
 * Prep-brief `listenFor` lines → ≤3 listen hints. Used ONLY when a question carries
 * no hints of its own (openers, agenda and seed questions never get generated ones).
 * The panel labels these as brief-level, never passes them off as per-question.
 */
export function cleanBriefCues(raw: unknown): Hint[] {
  if (!Array.isArray(raw)) return [];
  const out: Hint[] = [];
  for (const item of raw) {
    if (out.length >= 3) break;
    if (typeof item === "string" && item.trim()) out.push({ kind: "listen", text: item.trim() });
  }
  return out;
}

// --- The walk-in glance (last-one-to-one Phase 3) -------------------------------------------

/** One agreed item as the wire sends it (backend PriorRecapItem). `owner` is null on a suggestion. */
export interface RecapItem {
  owner: "manager" | "report" | null;
  action: string;
  outcome: "yes" | "partly" | "no" | "changed" | null;
}

/** One axis as the previous meeting finished on it (backend PriorRecapAxis). */
export interface RecapAxis {
  id: string;
  score: number | null;
  read: boolean;
}

/** The previous finished 1:1, projected for the glance (backend PriorRecap). */
export interface PriorRecap {
  sessionId: string;
  when: number;
  meetingType: string;
  headline: string;
  /** That 1:1 finished on a fallback briefing: real agreements and scores, no written read. */
  summaryMissing: boolean;
  agreedSource: "promises" | "suggested";
  agreed: RecapItem[];
  axes: RecapAxis[];
}

const OUTCOMES: ReadonlySet<string> = new Set(["yes", "partly", "no", "changed"]);

/**
 * What the FIRST segment of the panel toggle is called. It is the glance before
 * the meeting starts and coaching once it has, and the two hosts that draw this
 * header (stages/questioning.js and stages/bank.js) are copies of one another, so
 * the label lives here rather than being written out twice.
 */
export function segmentOneLabel(hasRecap: boolean): string {
  return hasRecap ? "Last 1:1" : "Support";
}

/**
 * Wire payload → a recap the panel can draw, or null. Validated here rather than
 * in the DOM half for the same reason cleanHints is: the shapes are the thing
 * worth testing. A recap with no headline has no line to show, so it collapses to
 * null and the panel falls back to today's Support view rather than drawing a
 * half-empty card. Manager's own agreements first, as in every other promise UI.
 */
export function cleanRecap(raw: unknown): PriorRecap | null {
  const r = raw as Partial<PriorRecap> | null | undefined;
  if (!r || typeof r !== "object") return null;
  const headline = typeof r.headline === "string" ? r.headline.trim() : "";
  const summaryMissing = r.summaryMissing === true;
  // No sentence and no reason for its absence is a payload we cannot draw honestly.
  if (!headline && !summaryMissing) return null;

  const agreed: RecapItem[] = [];
  for (const item of Array.isArray(r.agreed) ? r.agreed : []) {
    const owner = (item as RecapItem)?.owner;
    const action = (item as RecapItem)?.action;
    const outcome = (item as RecapItem)?.outcome;
    if (typeof action !== "string" || !action.trim()) continue;
    if (owner !== "manager" && owner !== "report" && owner != null) continue;
    agreed.push({
      owner: owner ?? null,
      action: action.trim(),
      outcome: typeof outcome === "string" && OUTCOMES.has(outcome) ? (outcome as RecapItem["outcome"]) : null,
    });
  }
  agreed.sort((a, b) => Number(a.owner !== "manager") - Number(b.owner !== "manager"));

  const axes: RecapAxis[] = [];
  for (const a of Array.isArray(r.axes) ? r.axes : []) {
    const id = (a as RecapAxis)?.id;
    if (typeof id !== "string" || !id) continue;
    const read = (a as RecapAxis).read === true && typeof (a as RecapAxis).score === "number";
    axes.push({ id, score: read ? ((a as RecapAxis).score as number) : null, read });
  }

  return {
    sessionId: typeof r.sessionId === "string" ? r.sessionId : "",
    when: typeof r.when === "number" ? r.when : 0,
    meetingType: typeof r.meetingType === "string" ? r.meetingType.trim() : "",
    headline,
    summaryMissing,
    agreedSource: r.agreedSource === "suggested" ? "suggested" : "promises",
    agreed,
    axes,
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
