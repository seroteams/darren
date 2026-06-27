// Type declarations for run-debrief.mjs — a JavaScript ESM module shared with
// the Vite browser build, so it stays .mjs (not converted). cli.ts is its only
// TypeScript importer; allowJs:false means the .mjs carries no inferred types,
// hence this hand-written companion. It mirrors the module's real exports and
// stays loose exactly where the JS is intentionally permissive (notes/cost).

export type RunSurface = "web" | "cli";

export interface DebriefNote {
  time: string;
  stageLabel: string;
  text: string;
  title: string;
}

export interface DurationInfo {
  ms: number | null;
  label: string;
  callCount?: number;
}

export interface FolderTreeLine {
  prefix: string;
  text: string;
  isStage: boolean;
}

export interface FolderTree {
  root: string;
  lines: FolderTreeLine[];
}

export interface RunDebriefPayload {
  sessionId: string;
  logDir: string;
  logDirCopy: string;
  smokeScenario: string;
  smokeNpm: string;
  smokeNode: string;
  smokeCommandBlock: string;
  tree: FolderTree;
  notes: DebriefNote[];
  noteCount: number;
  apiDuration: DurationInfo;
  wallDuration: DurationInfo;
  hasWallClock: boolean;
  reviewrunTip: string;
  notesMdPath: string;
  surface: RunSurface | string;
  cost: unknown;
}

// `notes` is intentionally unknown: the CLI passes the raw notes STRING and the
// module's formatDebriefNotes treats any non-array as [] by design. `cost` is
// the cost tracker's summary object, consumed only inside the module.
export interface BuildRunDebriefPayloadArgs {
  sessionId?: string;
  sessionDir?: string;
  notes?: unknown;
  cost?: unknown;
  createdAt?: number;
  completedAt?: number | null;
  meetingType?: string;
  surface?: RunSurface | string;
}

export interface DebriefUi {
  dim: (s: string) => string;
  cyan: (s: string) => string;
  HR?: string;
}

export const STAGE_LABEL: Record<string, string>;
export function durationFromCost(cost: unknown): DurationInfo;
export function wallDuration(createdAt: number, completedAt: number): DurationInfo;
export function relativeLogDir(sessionDir: string, sessionId?: string): string;
export function suggestSmokeScenario(meetingType: string): string;
export function folderTreeLines(relDir: string, surface?: RunSurface | string): FolderTree;
export function formatDebriefNotes(notes: unknown): DebriefNote[];
export function buildRunDebriefPayload(args: BuildRunDebriefPayloadArgs): RunDebriefPayload;
export function buildQaReviewPrompt(args: { ctx?: unknown; payload: RunDebriefPayload; sessionDir?: string }): string;
export function printRunDebrief(payload: RunDebriefPayload, ui: DebriefUi): void;
