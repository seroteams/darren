// Cassette record/replay for callAI (agent-native P1).
//
// SERO_CASSETTE_RECORD=<dir>  — after each live model call, append
//   { label, model, system, user, response } to <dir>/cassette.json. `response`
//   is EXACTLY the raw string callAI returns — the byte-faithful source for replay.
// SERO_CASSETTE_REPLAY=<dir>  — serve recorded responses instead of calling the
//   network: FIFO per label; when a label's entries run out, reuse its last one
//   (live code may ask more often than the recorded run did, e.g. a validation
//   retry); a label the cassette never saw is a hard error, not a guess.
//
// Env is read per call (not at import) so test runners and scripts can flip
// modes without re-importing the engine.
import fs from "node:fs";
import path from "node:path";

interface CassetteEntry {
  label: string;
  model?: string;
  system?: string;
  user?: string;
  response: string;
}

interface ReplayState {
  dir: string;
  queues: Map<string, string[]>;
  last: Map<string, string>;
}

let replay: ReplayState | null = null;

function cassettePath(dir: string): string {
  return path.join(dir, "cassette.json");
}

function readEntries(dir: string): CassetteEntry[] {
  const raw = fs.readFileSync(cassettePath(dir), "utf8");
  const parsed: { entries?: CassetteEntry[] } = JSON.parse(raw);
  if (!Array.isArray(parsed.entries)) {
    throw new Error(`cassette at ${cassettePath(dir)} has no "entries" array`);
  }
  return parsed.entries;
}

function replayDir(): string | undefined {
  return process.env.SERO_CASSETTE_REPLAY || undefined;
}

function recordDir(): string | undefined {
  return process.env.SERO_CASSETTE_RECORD || undefined;
}

function isReplaying(): boolean {
  return replayDir() !== undefined;
}

function replayResponse(label: string): string {
  const dir = replayDir();
  if (!dir) throw new Error("replayResponse called without SERO_CASSETTE_REPLAY set");
  if (!replay || replay.dir !== dir) {
    const queues = new Map<string, string[]>();
    const last = new Map<string, string>();
    for (const e of readEntries(dir)) {
      const q = queues.get(e.label) ?? [];
      q.push(e.response);
      queues.set(e.label, q);
      last.set(e.label, e.response);
    }
    replay = { dir, queues, last };
  }
  const queue = replay.queues.get(label);
  if (!queue) {
    throw new Error(
      `cassette at ${cassettePath(replay.dir)} has no entries for label "${label}" — ` +
        `re-record, or use a run that exercised this stage`,
    );
  }
  const next = queue.shift();
  if (next !== undefined) return next;
  const lastSeen = replay.last.get(label);
  if (lastSeen === undefined) {
    // unreachable: a queue only exists if at least one entry set `last`
    throw new Error(`cassette label "${label}" exhausted with no last entry`);
  }
  return lastSeen;
}

function maybeRecord(entry: CassetteEntry): void {
  const dir = recordDir();
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  let entries: CassetteEntry[] = [];
  try {
    entries = readEntries(dir);
  } catch {
    // first write — start a fresh cassette
  }
  entries.push(entry);
  fs.writeFileSync(cassettePath(dir), `${JSON.stringify({ entries }, null, 2)}\n`);
}

export { isReplaying, replayResponse, maybeRecord };
export type { CassetteEntry };
