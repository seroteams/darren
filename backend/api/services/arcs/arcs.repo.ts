// Data access for meeting arcs — the storage seam. Delegates to the type registry
// (the code-default arcs) and the arc-overlay engine (a manager's saved edits in
// data/arc-overlays/<slug>.json). A DB-backed impl can replace `fileArcsRepo`
// without touching the service. Overlays are NEVER written to the canonical types.

import { listTypes, getArc } from "../../../engine/one-on-one-types/index.ts";
import { loadOverlay, writeOverlay, removeOverlay, diffStageIds } from "../../../engine/arc-overlay.ts";
import type { MeetingType, ArcPhase } from "../../../engine/one-on-one-types/_shared/meeting-type.types.ts";

// The merged arc the read path returns (code default + any overlay).
export interface ArcData {
  slug: string;
  tone_register: string;
  arc: ArcPhase[];
  anti_patterns: string[];
}

// How many tagged questions a proposed arc would orphan — drives the confirm dialog.
export interface DiffResult {
  intro: number;
  openers: number;
  total: number;
  removed_ids: unknown[];
}

// The three editable fields an overlay may carry; the engine ignores anything else.
export interface OverlayInput {
  arc?: unknown;
  tone_register?: unknown;
  anti_patterns?: unknown;
}

export interface ArcsRepo {
  listTypes(): MeetingType[];
  getArc(key: string): ArcData; // throws on an unknown type (slug or label)
  hasOverlay(slug: string): boolean;
  writeOverlay(slug: string, data: OverlayInput): void;
  removeOverlay(slug: string): void;
  diffStageIds(slug: string, arc: unknown[], currentStageIds: string[]): DiffResult;
}

export const fileArcsRepo: ArcsRepo = {
  listTypes: () => listTypes(),
  getArc: (key) => getArc(key),
  hasOverlay: (slug) => loadOverlay(slug) !== null,
  writeOverlay: (slug, data) => {
    writeOverlay(slug, data);
  },
  removeOverlay: (slug) => {
    removeOverlay(slug);
  },
  diffStageIds: (slug, arc, currentStageIds) => diffStageIds(slug, arc, { currentStageIds }),
};
