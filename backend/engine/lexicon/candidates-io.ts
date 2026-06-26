import fs from "node:fs";
import path from "node:path";
import * as YAML from "yaml";
import { LEXICONS_DIR } from "../paths.mts";

const SUGGESTED_DIR = path.join(LEXICONS_DIR, "_suggested");

// A candidate lexicon doc is loosely shaped (hand-editable YAML); we only ever
// normalise the three arrays of the target meeting-type entry and leave the rest
// of the document untouched. Kept as a record so existing fields/key-order survive.
type CandidateDoc = Record<string, unknown>;

interface CandidateScope {
  roleFamily: string | null;
  seniority: string | null;
  meetingType: string;
}

interface AcceptedSuggestion {
  type: string;
  value?: string;
  reason?: string;
  better_as?: string | null;
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function ensureCandidateDoc(filePath: string, scope: CandidateScope): CandidateDoc {
  let parsed: unknown = null;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    parsed = YAML.parse(raw);
  } catch {}

  const doc: CandidateDoc = isObjectRecord(parsed)
    ? parsed
    : { role_family: scope.roleFamily, seniority: scope.seniority, meeting_types: {} };

  // Bind to typed locals that ARE the same object references, then mutate
  // through them — preserves identity, untouched fields, and key order.
  const meetingTypes: Record<string, unknown> = isObjectRecord(doc.meeting_types) ? doc.meeting_types : {};
  doc.meeting_types = meetingTypes;

  const existingEntry = meetingTypes[scope.meetingType];
  const entry: Record<string, unknown> = isObjectRecord(existingEntry)
    ? existingEntry
    : { prefer_terms: [], prefer_phrases: [], avoid_phrases: [] };
  meetingTypes[scope.meetingType] = entry;

  if (!Array.isArray(entry.prefer_terms)) entry.prefer_terms = [];
  if (!Array.isArray(entry.prefer_phrases)) entry.prefer_phrases = [];
  if (!Array.isArray(entry.avoid_phrases)) entry.avoid_phrases = [];
  return doc;
}

function appendCandidates(filePath: string, scope: CandidateScope, accepted: AcceptedSuggestion[]): boolean {
  if (!accepted.length) return false;
  const doc = ensureCandidateDoc(filePath, scope);
  const meetingTypes = doc.meeting_types;
  if (!isObjectRecord(meetingTypes)) return false;
  const entry = meetingTypes[scope.meetingType];
  if (!isObjectRecord(entry)) return false;

  // ensureCandidateDoc guarantees these are arrays; the `: []` fallbacks are
  // unreachable. Each local is the same reference as the entry's array, so
  // pushing through it mutates the doc that gets written back.
  const preferTerms = Array.isArray(entry.prefer_terms) ? entry.prefer_terms : [];
  const preferPhrases = Array.isArray(entry.prefer_phrases) ? entry.prefer_phrases : [];
  const avoidPhrases = Array.isArray(entry.avoid_phrases) ? entry.avoid_phrases : [];

  const seenTerms = new Set(preferTerms.map((x) => String(x).toLowerCase()));
  const seenPhrases = new Set(preferPhrases.map((x) => String(x).toLowerCase()));
  const seenAvoids = new Set(
    avoidPhrases.map((x): string =>
      (isObjectRecord(x) && typeof x.phrase === "string" ? x.phrase : "").toLowerCase(),
    ),
  );

  let changed = false;
  for (const s of accepted) {
    const v = (s.value || "").trim();
    if (!v) continue;
    if (s.type === "prefer_term") {
      const k = v.toLowerCase();
      if (!seenTerms.has(k)) {
        preferTerms.push(v);
        seenTerms.add(k);
        changed = true;
      }
    } else if (s.type === "prefer_phrase") {
      const k = v.toLowerCase();
      if (!seenPhrases.has(k)) {
        preferPhrases.push(v);
        seenPhrases.add(k);
        changed = true;
      }
    } else if (s.type === "avoid_phrase") {
      const k = v.toLowerCase();
      if (!seenAvoids.has(k)) {
        avoidPhrases.push({
          phrase: v,
          reason: s.reason || "",
          better_as: s.better_as || "",
        });
        seenAvoids.add(k);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, YAML.stringify(doc));
  }
  return changed;
}

function writeTrace({
  sessionId,
  scope,
  allSuggestions,
  accepted,
  rejected,
  userInput,
}: {
  sessionId: string;
  scope: CandidateScope;
  allSuggestions: unknown;
  accepted: unknown;
  rejected: unknown;
  userInput: unknown;
}): string {
  fs.mkdirSync(SUGGESTED_DIR, { recursive: true });
  const tracePath = path.join(SUGGESTED_DIR, `${sessionId}.json`);
  const trace = {
    sessionId,
    timestamp: new Date().toISOString(),
    roleFamily: scope.roleFamily,
    seniority: scope.seniority,
    meetingType: scope.meetingType,
    allSuggestions,
    acceptedAsCandidates: accepted,
    rejected,
    userInput,
  };
  fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));
  return tracePath;
}

function tracePathFor(sessionId: string): string {
  return path.join(SUGGESTED_DIR, `${sessionId}.json`);
}

function readTrace(sessionId: string): unknown {
  try {
    const trace: unknown = JSON.parse(fs.readFileSync(tracePathFor(sessionId), "utf8"));
    return trace;
  } catch {
    return null;
  }
}

export {
  appendCandidates,
  ensureCandidateDoc,
  writeTrace,
  readTrace,
  tracePathFor,
  SUGGESTED_DIR,
};
