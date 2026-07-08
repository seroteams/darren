import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { writePipelineLock } from "./pipeline-lock.ts";
import { LOGS_DIR } from "./paths.mts";
import { queueArtifact, shouldEchoToDisk } from "../db/run-artifacts-store.ts";

const LOGS_ROOT = LOGS_DIR;

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const LONG_MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

interface SessionRef {
  id?: string;
  dir: string;
}

function sessionId(now = new Date()): string {
  // e.g. 2026_May08_21-53-a3f7b2c1d4e5f6079a8b0c1d2e3f4051
  // The timestamp prefix drives run-folder routing (monthFolderFor); the suffix is the
  // security-relevant part — a FULL 128-bit random token (member-nav Phase 2), so a
  // live-session id can't be brute-forced within a time window. Was 32 bits (8 hex).
  const year = now.getFullYear();
  const month = SHORT_MONTHS[now.getMonth()];
  const day = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const suffix = randomUUID().replace(/-/g, "");
  return `${year}_${month}${day}_${hh}-${mm}-${suffix}`;
}

// Given a session id like "2026_May08_21-53-a3f7b2c1", return "may". Returns
// null if the id doesn't carry a recognisable month token.
function monthFolderFor(id: string): string | null {
  const m = /^\d{4}_([A-Z][a-z]{2})\d{2}_/.exec(id);
  if (!m) return null;
  const tok = m[1];
  if (tok === undefined) return null;
  const idx = SHORT_MONTHS.indexOf(tok);
  return idx >= 0 ? (LONG_MONTHS[idx] ?? null) : null;
}

function createSession(): { id: string; dir: string } {
  const now = new Date();
  const id = sessionId(now);
  const month = LONG_MONTHS[now.getMonth()];
  if (!month) throw new Error(`invalid month index: ${now.getMonth()}`); // unreachable: getMonth() is 0-11
  const dir = path.join(LOGS_ROOT, month, id);
  // `dir` is always the run's logical key (logs/<month>/<id>); the folder is only
  // materialised on disk when the file echo is on (off in a live deploy). The
  // pipeline lock stays a disk/dev artifact for now (drives the pipeline-delta view).
  if (shouldEchoToDisk()) {
    fs.mkdirSync(dir, { recursive: true });
    writePipelineLock(dir);
  }
  return { id, dir };
}

// The run id IS the last segment of the run dir (logs/<month>/<id>) — so the DB
// key travels with the SessionRef without threading it through every stage.
function keyOf(session: SessionRef): string {
  return session.id ?? path.basename(session.dir);
}

// Dual-write (postgres-runtime-data Phase 2): every artifact goes to Postgres (when
// configured) AND, when the file echo is on, to disk. The DB write is queued
// (fire-and-forget, ordered per run); the disk write is gated so a live deploy can
// stop touching the filesystem entirely.
function logStage(
  session: SessionRef | null | undefined,
  stageName: string,
  { inputs, prompt, response, final }: { inputs: unknown; prompt: string; response: unknown; final?: unknown },
): void {
  if (!session) return;
  const sessionKey = keyOf(session);
  const responseText = typeof response === "string" ? response : JSON.stringify(response, null, 2);

  queueArtifact({ sessionKey, stage: stageName, name: "inputs.json", kind: "json", content: inputs });
  queueArtifact({ sessionKey, stage: stageName, name: "prompt.md", kind: "text", contentText: prompt });
  queueArtifact({ sessionKey, stage: stageName, name: "response.json", kind: "text", contentText: responseText });
  // `response` is the raw model output; `final` is what shipped after
  // post-processing. Log both so a QA review judges the delivered briefing,
  // not the pre-guard draft.
  if (final !== undefined) {
    const finalText = typeof final === "string" ? final : JSON.stringify(final, null, 2);
    queueArtifact({ sessionKey, stage: stageName, name: "final.json", kind: "text", contentText: finalText });
  }

  if (!shouldEchoToDisk()) return;
  const stageDir = path.join(session.dir, stageName);
  fs.mkdirSync(stageDir, { recursive: true });
  fs.writeFileSync(path.join(stageDir, "inputs.json"), JSON.stringify(inputs, null, 2));
  fs.writeFileSync(path.join(stageDir, "prompt.md"), prompt);
  fs.writeFileSync(path.join(stageDir, "response.json"), responseText);
  if (final !== undefined) {
    fs.writeFileSync(
      path.join(stageDir, "final.json"),
      typeof final === "string" ? final : JSON.stringify(final, null, 2),
    );
  }
}

function logFeedback(session: SessionRef | null | undefined, entry: Record<string, unknown>): void {
  if (!session) return;
  const filePath = path.join(session.dir, "feedback.json");
  let existing: Array<Record<string, unknown>> = [];
  try {
    existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {}
  existing.push({ timestamp: new Date().toISOString(), ...entry });
  // feedback.json is a full-rewrite file (read → push → write), so the DB row holds
  // the whole array each time — no append semantics needed.
  queueArtifact({ sessionKey: keyOf(session), stage: "", name: "feedback.json", kind: "json", content: existing });
  if (shouldEchoToDisk()) fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
}

export { createSession, logStage, logFeedback, sessionId, monthFolderFor, LOGS_ROOT };
