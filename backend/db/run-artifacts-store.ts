// The durable Postgres layer for run artifacts — everything that used to be a file
// inside a run dir (stage inputs/prompt/response/final, feedback, …). Pattern-clone
// of db/sessions-store.ts: sync facade over async writes so the hot path (every
// stage, every turn) never awaits a database round-trip.
//
// Ordering + safety (postgres-runtime-data Phase 2):
//   - Writes for ONE run are chained (a per-run promise), so an artifact's upsert
//     can't race another write to the same (stage, name).
//   - A failed write warns and is swallowed — a DB hiccup never breaks a live turn,
//     exactly like the sessions mirror.
//   - No-op when DATABASE_URL is unset (file mode keeps working unchanged).
//   - flushArtifactWrites() lets short-lived processes (the CLI, tests) wait for the
//     queue to drain before exit, so nothing is lost.

import { getDb, hasDatabaseUrl } from "./client.ts";
import { runArtifacts } from "./schema.ts";

export type ArtifactKind = "json" | "text" | "jsonl";

export interface ArtifactWrite {
  sessionKey: string;
  orgId?: string | null;
  /** "" for run-root files (transcript.json, cost.json, …); a stage dir otherwise. */
  stage?: string | null;
  name: string;
  kind: ArtifactKind;
  /** For kind "json": the value (stored as jsonb). */
  content?: unknown;
  /** For kind "text" | "jsonl": the raw text (stored as content_text). */
  contentText?: string;
}

// One promise chain per run id — writes to the same run stay ordered; different
// runs interleave freely.
const chains = new Map<string, Promise<unknown>>();

/** Should run artifacts ALSO be written to disk (the dev file-echo)? On locally so
 *  dev tooling (reviewrun, review-html, the gate readers) keeps seeing files; off in
 *  live so the deployed app writes only to the database. `RUN_FILE_ECHO` overrides. */
export function shouldEchoToDisk(): boolean {
  const flag = process.env.RUN_FILE_ECHO?.trim().toLowerCase();
  if (flag === "0" || flag === "off" || flag === "false") return false;
  if (flag === "1" || flag === "on" || flag === "true") return true;
  return process.env.APP_ENV?.trim().toLowerCase() !== "live";
}

/** Queue an artifact upsert (sync facade). No-op without a database. */
export function queueArtifact(a: ArtifactWrite): void {
  if (!hasDatabaseUrl()) return;
  const prev = chains.get(a.sessionKey) ?? Promise.resolve();
  const next = prev.then(() => upsertArtifact(a)).catch((e) =>
    console.warn(
      `[run-artifacts] write failed (${a.sessionKey}/${a.stage ?? ""}/${a.name}):`,
      e instanceof Error ? e.message : String(e),
    ),
  );
  chains.set(a.sessionKey, next);
}

async function upsertArtifact(a: ArtifactWrite): Promise<void> {
  const stage = a.stage ?? "";
  const isJson = a.kind === "json";
  const content = isJson ? (a.content ?? null) : null;
  const contentText = isJson ? null : (a.contentText ?? null);
  await getDb()
    .insert(runArtifacts)
    .values({ sessionKey: a.sessionKey, orgId: a.orgId ?? null, stage, name: a.name, kind: a.kind, content, contentText })
    .onConflictDoUpdate({
      target: [runArtifacts.sessionKey, runArtifacts.stage, runArtifacts.name],
      set: { kind: a.kind, content, contentText, updatedAt: new Date() },
    });
}

/** Wait for every queued write to settle. Awaited at CLI exit + server shutdown. */
export async function flushArtifactWrites(): Promise<void> {
  await Promise.allSettled([...chains.values()]);
}
