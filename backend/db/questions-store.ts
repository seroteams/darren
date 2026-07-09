// The Postgres store + boot-hydrated cache for the engine's invented questions
// (postgres-runtime-data Phase 4). The engine's call sites stay SYNCHRONOUS:
// reads answer from an in-memory cache hydrated once at boot (server, CLI, any
// scenario lane), writes are a cache insert plus a queued DB upsert — the same
// fire-and-forget queue discipline as the run-artifacts store.
//
// Dedup is the point of this store: UNIQUE(alias) + onConflictDoNothing makes
// the database the "never ask the same question twice" gate. The cache mirrors
// that rule (first save of an alias wins), and the alias set is the union of
//   DB aliases (pool AND _runtime run records — both block reuse)
//   ∪ static file aliases (_seed / _intro / _openers.json — git content).
//
// Reading before hydration in a DB-backed process is a hard error on purpose —
// a silently empty pool would break dedup invisibly (FOCUS_ARC_LEAK country).

import { getDb, hasDatabaseUrl } from "./client.ts";
import { generatedQuestions } from "./schema.ts";

export interface QuestionRow {
  alias: string;
  subdir: string;
  doc: Record<string, unknown>;
}

interface HydrateOpts {
  /** Injectable row loader (tests run without a database). */
  loadRows?: () => Promise<QuestionRow[]>;
  /** Injectable static-alias scan (defaults to the questions.ts file scan). */
  staticAliases?: () => Set<string>;
}

let hydrated = false;
const pool = new Map<string, Record<string, unknown>>(); // subdir "" docs, by alias
const aliases = new Set<string>();

async function loadRowsFromDb(): Promise<QuestionRow[]> {
  const rows = await getDb()
    .select({ alias: generatedQuestions.alias, subdir: generatedQuestions.subdir, doc: generatedQuestions.doc })
    .from(generatedQuestions);
  return rows.map((r) => ({ alias: r.alias, subdir: r.subdir, doc: (r.doc ?? {}) as Record<string, unknown> }));
}

// Default static scan lives in questions.ts — imported lazily to avoid a module
// cycle (questions.ts imports this store for its DB branches).
async function defaultStaticAliases(): Promise<Set<string>> {
  const questions = await import("../engine/questions.ts");
  return questions.listStaticAliases();
}

/** Load the question pool + alias set into memory. Awaited at server boot, CLI
 *  start, and any scenario lane before the engine runs. Idempotent. */
export async function hydrateQuestionCache(opts: HydrateOpts = {}): Promise<void> {
  const rows = await (opts.loadRows ?? loadRowsFromDb)();
  const statics = opts.staticAliases ? opts.staticAliases() : await defaultStaticAliases();
  pool.clear();
  aliases.clear();
  for (const r of rows) {
    aliases.add(r.alias);
    if (r.subdir === "") pool.set(r.alias, r.doc);
  }
  for (const a of statics) aliases.add(a);
  hydrated = true;
}

export function isQuestionCacheHydrated(): boolean {
  return hydrated;
}

/** Tests + hot-reload only. */
export function resetQuestionCache(): void {
  hydrated = false;
  pool.clear();
  aliases.clear();
}

/** The loud gate: a DB-backed process must hydrate before the engine reads. */
export function requireHydrated(): void {
  if (!hydrated) {
    throw new Error(
      "question cache not hydrated — await hydrateQuestionCache() at boot before the engine runs (postgres-runtime-data Phase 4)",
    );
  }
}

/** The generated pool (subdir ""), sorted by alias — mirrors the file loadDir sort. */
export function cachePoolDocs(): Array<Record<string, unknown>> {
  requireHydrated();
  return [...pool.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, d]) => d);
}

/** Every alias that must never be reused (pool + _runtime + static files). */
export function cacheAliases(): Set<string> {
  requireHydrated();
  return new Set(aliases);
}

export function cacheGetQuestion(alias: string): Record<string, unknown> | null {
  requireHydrated();
  return pool.get(alias) ?? null;
}

// One promise chain keeps question writes ordered; failures warn and never
// break a live turn (same contract as the artifact queue).
let chain: Promise<unknown> = Promise.resolve();

/** Cache insert + queued DB upsert. First save of an alias wins (the cache
 *  mirror of UNIQUE(alias) + onConflictDoNothing). */
export function cacheSaveQuestion(doc: Record<string, unknown>, subdir = ""): void {
  requireHydrated();
  const alias = String(doc.alias ?? "");
  if (!alias) return;
  if (aliases.has(alias) && (subdir !== "" || pool.has(alias))) {
    console.warn(`[questions-store] duplicate alias ignored (first wins): ${alias}`);
    return;
  }
  aliases.add(alias);
  if (subdir === "") pool.set(alias, doc);

  if (!hasDatabaseUrl()) return;
  chain = chain
    .then(() =>
      getDb()
        .insert(generatedQuestions)
        .values({
          alias,
          subdir,
          source: typeof doc.source === "string" ? doc.source : null,
          label: typeof doc.label === "string" ? doc.label : null,
          stage: typeof doc.stage === "string" ? doc.stage : null,
          doc,
        })
        .onConflictDoNothing(),
    )
    .catch((e) =>
      console.warn(`[questions-store] write failed (${alias}):`, e instanceof Error ? e.message : String(e)),
    );
}

/** Wait for queued question writes to settle (CLI exit + server shutdown). */
export async function flushQuestionWrites(): Promise<void> {
  await chain;
}
