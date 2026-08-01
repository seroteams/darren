// The single paid-engine job slot, shared by every QA tool that spends OpenAI
// money (Test engine personas, Regression reruns).
//
// Why one slot and not one per tool: the slot IS the cost backstop. Two tools
// each holding "only one at a time" can still spend twice at once, which is the
// thing the backstop exists to prevent. It also keeps the machine honest — the
// engine writes run folders and holds a cost tracker per run, and two concurrent
// runs make both harder to read.
//
// Deliberately module-level: the process is the boundary. A second server process
// would get its own slot, which is the same situation as someone running the CLI
// gate from a terminal — out of scope, and always has been.

export interface SlotHolder {
  /** Which tool holds it, in words a person can read in an error message. */
  tool: string;
  startedAt: number;
}

let holder: SlotHolder | null = null;

/** Who holds the slot right now, or null when it's free. */
export function currentHolder(): SlotHolder | null {
  return holder ? { ...holder } : null;
}

/**
 * Take the slot for `tool`. Returns null when free and taken, or the CURRENT
 * holder when busy — the caller turns that into its own worded conflict, so each
 * tool can name the other one ("the Test engine is mid-run").
 */
export function acquire(tool: string, now: () => number = Date.now): SlotHolder | null {
  if (holder) return { ...holder };
  holder = { tool, startedAt: now() };
  return null;
}

/**
 * Release the slot. The `tool` guard means a finished run can never release a
 * slot that a newer run has since taken.
 */
export function release(tool: string): void {
  if (holder?.tool === tool) holder = null;
}

/** Tests only: drop whatever is held so each case starts from a free slot. */
export function resetSlot(): void {
  holder = null;
}
