// Storage seam for the live 1:1 runner — the one interface every sessions service
// depends on for live + on-disk session state. Phase 004 step 3, sub-phase S0: the
// seam is defined here BEFORE any route moves, so S1–S4 convert mechanically against
// a stable boundary. A DB- or Redis-backed store can replace `fileSessionsRepo`
// without touching a service.
//
// Scope: the sessions domain's DATA ACCESS. The session record (read/create/drop/
// persist) plus session-adjacent disk state the routes read or write — the cached
// role-profile vocabulary (S1b role-profile) and the per-session eligibility log
// (S1b question). The pure derivations the handlers also share — snapshot /
// inferStage / summarizeAxes — take a Session and compute a view; they touch no
// storage, so they are NOT on this repo. They live in the co-located pure module
// session-views.ts (relocated there at end-of-sessions cleanup), keeping "repos
// own data access" honest.
//
// S0 moved no routes: this delegates to the existing `sessions.ts` store, which the
// legacy handlers still call directly until their route is converted.

import fs from "node:fs";
import path from "node:path";
import {
  getSession,
  createWebSession,
  dropSession,
  persistSession,
} from "../../sessions.ts";
import { loadRoleProfile } from "../../../engine/role-profile.ts";
import { appendEligibilityLog } from "../../../engine/question-eligibility.ts";
import { commitDecisions } from "../../../engine/lexicon-reviewer.ts";
import { loadPersona } from "../../persona-script.ts";
import type { Persona } from "../../persona-script.ts";
import type { Session, MeetingContext } from "../../../shared/session.types.ts";
import type { Question } from "../../../shared/question.types.ts";
import { asRecord } from "../../../shared/guards.ts";
import { queueSessionUpsert } from "../../../db/sessions-store.ts";
import { hasDatabaseUrl } from "../../../db/client.ts";
import { shouldEchoToDisk } from "../../../db/run-artifacts-store.ts";

// Retire the files (postgres-runtime-data P7): the run-dir writers below are all
// log-only dev-tooling artifacts (diagnostics + a render of session.notes, which
// itself lives in the DB). In live (DB mode, echo off) they write nothing, so a full
// 1:1 leaves zero new files; DB-less dev and echo-on keep them for the local tooling.
const skipDiskLog = (): boolean => hasDatabaseUrl() && !shouldEchoToDisk();

/** The cached role-profile doc (or null when none is cached) — exactly what the
 *  engine's loadRoleProfile returns, named here so services + tests can refer to it. */
export type RoleProfileDoc = ReturnType<typeof loadRoleProfile>;

/** The eligibility-log entry array — what the opener picker collects and the repo
 *  writes (S2 start re-uses this for opener rejections). */
export type EligibilityLogEntries = NonNullable<Parameters<typeof appendEligibilityLog>[1]>;

/** The scripted-lane coverage record persisted alongside a run (S2b answer). */
export type ScriptCoverage = NonNullable<Session["scriptCoverage"]>;

/** One discarded turn appended to amend-log.json on a step-back (S2b back). */
export interface AmendLogEntry {
  discarded_turn: number;
  question_alias: string | null;
  original_answer: string;
}

/** What commitDecisions returns — the lexicon-decisions commit outcome (S2b). */
export type LexiconCommitResult = ReturnType<typeof commitDecisions>;

export interface SessionsRepo {
  /** Live-or-restore-from-disk read; undefined when no such session exists. */
  get(id: string): Session | undefined;
  /** Create a new live session (throws 503 at the concurrency cap, as today).
   *  orgId stamps the owning company (null = unfenced legacy/anonymous). Phase 007/2.
   *  userId stamps the creating member (null = unattributed). member-nav Phase 2.
   *  personId stamps the roster person this 1:1 is ABOUT (null = unlinked). people-roster Phase 2. */
  create(ctx: MeetingContext, introQueue: Question[], orgId?: string | null, userId?: string | null, personId?: string | null): Session;
  /** Evict a session from the live store (on-disk record is left in place). */
  drop(id: string): void;
  /** Write the session's current state to disk. */
  persist(session: Session): void;
  /** Read the cached role-profile vocabulary for a context (role+seniority);
   *  null when nothing is cached (no model call — generated at /start). */
  loadRoleProfile(ctx: MeetingContext): RoleProfileDoc;
  /** Append serve-time eligibility rejections to the session's on-disk log
   *  (log-only; a write failure never breaks a live turn). */
  appendEligibilityLog(dir: string, entries: Parameters<typeof appendEligibilityLog>[1]): void;
  /** The scripted-lane persona for an id (null when none / not scripted) — a read
   *  of the on-disk persona bench (no model call). */
  loadPersona(personaId: string | null): Persona | null;
  /** Persist the scripted-lane coverage record (log-only; a write failure never
   *  breaks the turn). */
  writeScriptCoverage(dir: string, coverage: ScriptCoverage): void;
  /** Append one discarded turn to the session's amend log (log-only; read + write
   *  failures are swallowed, as today). */
  appendAmendLog(dir: string, entry: AmendLogEntry): void;
  /** Write the rendered notes markdown to the session dir (log-only). */
  writeNotesFile(dir: string, markdown: string): void;
  /** Append the full keep/drop decision audit trail (a write failure surfaces, as
   *  today — this one is NOT swallowed). */
  appendLexiconDecisions(dir: string, records: unknown[]): void;
  /** Commit the kept lexicon suggestions into the candidate yaml via the same engine
   *  path the CLI uses; returns the commit outcome. */
  commitLexiconDecisions(session: Session, ctx: MeetingContext, keepIds: string[]): LexiconCommitResult;
}

const ELIGIBILITY_LOG_FILE = "eligibility-log.json";
const SCRIPT_COVERAGE_FILE = "script-coverage.json";
const AMEND_LOG_FILE = "amend-log.json";
const NOTES_FILE = "notes.md";
const LEXICON_DECISIONS_FILE = "lexicon-decisions.jsonl";

export const fileSessionsRepo: SessionsRepo = {
  get: (id) => getSession(id),
  create: (ctx, introQueue, orgId, userId, personId) => createWebSession(ctx, introQueue, orgId ?? null, userId ?? null, personId ?? null),
  drop: (id) => {
    dropSession(id);
  },
  persist: (session) => {
    persistSession(session);
  },
  loadRoleProfile: (ctx) => loadRoleProfile(ctx),
  appendEligibilityLog: (dir, entries) => {
    if (skipDiskLog()) return;
    appendEligibilityLog(path.join(dir, ELIGIBILITY_LOG_FILE), entries);
  },
  loadPersona: (personaId) => loadPersona(personaId),
  writeScriptCoverage: (dir, coverage) => {
    if (skipDiskLog()) return;
    try {
      fs.writeFileSync(path.join(dir, SCRIPT_COVERAGE_FILE), JSON.stringify(coverage, null, 2));
    } catch (e) {
      console.warn("[answer] coverage write failed:", e instanceof Error ? e.message : String(e));
    }
  },
  appendAmendLog: (dir, entry) => {
    if (skipDiskLog()) return;
    const file = path.join(dir, AMEND_LOG_FILE);
    let log: unknown[] = [];
    try {
      if (fs.existsSync(file)) {
        const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
        if (Array.isArray(parsed)) log = parsed;
      }
    } catch (e) {
      console.warn("[back] amend-log read failed:", e instanceof Error ? e.message : String(e));
    }
    log.push(entry);
    try {
      fs.writeFileSync(file, JSON.stringify(log, null, 2));
    } catch (e) {
      console.warn("[back] amend-log write failed:", e instanceof Error ? e.message : String(e));
    }
  },
  writeNotesFile: (dir, markdown) => {
    if (skipDiskLog()) return;
    try {
      fs.writeFileSync(path.join(dir, NOTES_FILE), markdown);
    } catch (e) {
      console.warn("[notes] write failed:", e instanceof Error ? e.message : String(e));
    }
  },
  appendLexiconDecisions: (dir, records) => {
    if (skipDiskLog()) return;
    const line = records.map((r) => JSON.stringify({ ts: Date.now(), ...asRecord(r) })).join("\n") + "\n";
    fs.appendFileSync(path.join(dir, LEXICON_DECISIONS_FILE), line, "utf8");
  },
  commitLexiconDecisions: (session, ctx, keepIds) => commitDecisions({ session, ctx, keepIds }),
};

// Postgres-backed sessions repo. Same interface as fileSessionsRepo — only the
// durable store changes. The live in-memory Map stays the synchronous hot store,
// so get/drop and every disk log-only method delegate unchanged to fileSessionsRepo;
// only create + persist additionally mirror the session into Postgres. The mirror
// goes through the coalescing write queue (db/sessions-store): at most one upsert
// per session in flight, latest state wins, failures logged and swallowed — a DB
// hiccup never breaks a live turn, and rapid persists can't starve the pool. A
// boot-restore (db/sessions-store loadSessionsFromDb) reloads the Map from
// Postgres so a session can survive a server restart.
export const pgSessionsRepo: SessionsRepo = {
  ...fileSessionsRepo,
  create: (ctx, introQueue, orgId, userId, personId) => {
    const session = fileSessionsRepo.create(ctx, introQueue, orgId, userId, personId);
    queueSessionUpsert(session);
    return session;
  },
  persist: (session) => {
    fileSessionsRepo.persist(session);
    queueSessionUpsert(session);
  },
};

