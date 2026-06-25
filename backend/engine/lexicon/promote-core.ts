import fs from "node:fs";
import path from "node:path";
import * as YAML from "yaml";
import { LEXICONS_DIR } from "../paths.mts";

const CAND_DIR = path.join(LEXICONS_DIR, "_candidates");
const LEX_DIR = LEXICONS_DIR;

type PromotionKind = "prefer_term" | "prefer_phrase" | "avoid_phrase";

interface PromotionItem {
  kind: PromotionKind;
  value: unknown; // a term/phrase string, or the avoid-phrase object
  valueKey: string;
}

interface ParsedPromotionId {
  roleFamily: string;
  seniority: string;
  meetingType: string;
  kind: string;
  valueKey: string;
}

interface CandidateFile {
  roleFamily: string;
  seniority: string;
  path: string;
}

interface PendingHit {
  file: CandidateFile;
  candDoc: Record<string, unknown>;
  canonDoc: Record<string, unknown>;
  candM: Record<string, unknown>;
  canonM: Record<string, unknown>;
  item: PromotionItem;
  canonPath: string;
}

interface PendingPromotion {
  id: string;
  roleFamily: string;
  seniority: string;
  meetingType: string;
  kind: PromotionKind;
  phrase: string;
  context: string;
  scopeLabel: string;
}

interface TouchedBucket {
  file: CandidateFile;
  candDoc: Record<string, unknown>;
  canonDoc: Record<string, unknown>;
  canonPath: string;
  canonChanged: boolean;
  candChanged: boolean;
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

// Raw `.phrase` of an avoid entry (undefined if not an object) — matches the
// original `x?.phrase`. phraseKey wraps it with `|| ""` for the dedup keys.
function phraseOf(x: unknown): unknown {
  return isObjectRecord(x) ? x.phrase : undefined;
}
function phraseKey(x: unknown): string {
  return String(phraseOf(x) || "");
}

function readYaml(filePath: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = YAML.parse(fs.readFileSync(filePath, "utf8"));
    return isObjectRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeYaml(filePath: string, doc: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(doc));
}

function ensureCanonical(roleFamily: string, seniority: string): Record<string, unknown> {
  return {
    role_family: roleFamily,
    seniority,
    meeting_types: {},
  };
}

// Normalise the target meeting-type entry to have the three arrays, mutating
// `doc` in place via typed locals bound to the same references. Returns the entry.
function ensureMeetingType(doc: Record<string, unknown>, meetingType: string): Record<string, unknown> {
  const meetingTypes: Record<string, unknown> = isObjectRecord(doc.meeting_types) ? doc.meeting_types : {};
  doc.meeting_types = meetingTypes;
  const existing = meetingTypes[meetingType];
  const m: Record<string, unknown> = isObjectRecord(existing)
    ? existing
    : { prefer_terms: [], prefer_phrases: [], avoid_phrases: [] };
  meetingTypes[meetingType] = m;
  if (!Array.isArray(m.prefer_terms)) m.prefer_terms = [];
  if (!Array.isArray(m.prefer_phrases)) m.prefer_phrases = [];
  if (!Array.isArray(m.avoid_phrases)) m.avoid_phrases = [];
  return m;
}

function listCandidateFiles(): CandidateFile[] {
  if (!fs.existsSync(CAND_DIR)) return [];
  const out: CandidateFile[] = [];
  for (const role of fs.readdirSync(CAND_DIR)) {
    const roleDir = path.join(CAND_DIR, role);
    if (!fs.statSync(roleDir).isDirectory()) continue;
    for (const file of fs.readdirSync(roleDir)) {
      if (!file.endsWith(".yaml")) continue;
      const seniority = file.replace(/\.yaml$/, "");
      out.push({ roleFamily: role, seniority, path: path.join(roleDir, file) });
    }
  }
  return out;
}

function netNewForMeeting(candM: Record<string, unknown>, canonM: Record<string, unknown>): PromotionItem[] {
  const canonTerms = Array.isArray(canonM.prefer_terms) ? canonM.prefer_terms : [];
  const canonPhrases = Array.isArray(canonM.prefer_phrases) ? canonM.prefer_phrases : [];
  const canonAvoids = Array.isArray(canonM.avoid_phrases) ? canonM.avoid_phrases : [];
  const seenTerms = new Set(canonTerms.map((x) => String(x).toLowerCase()));
  const seenPhrases = new Set(canonPhrases.map((x) => String(x).toLowerCase()));
  const seenAvoids = new Set(canonAvoids.map((x) => phraseKey(x).toLowerCase()));

  const items: PromotionItem[] = [];
  const candTerms = Array.isArray(candM.prefer_terms) ? candM.prefer_terms : [];
  for (const v of candTerms) {
    if (!seenTerms.has(String(v).toLowerCase())) {
      items.push({ kind: "prefer_term", value: v, valueKey: String(v) });
    }
  }
  const candPhrases = Array.isArray(candM.prefer_phrases) ? candM.prefer_phrases : [];
  for (const v of candPhrases) {
    if (!seenPhrases.has(String(v).toLowerCase())) {
      items.push({ kind: "prefer_phrase", value: v, valueKey: String(v) });
    }
  }
  const candAvoids = Array.isArray(candM.avoid_phrases) ? candM.avoid_phrases : [];
  for (const a of candAvoids) {
    const phrase = phraseKey(a);
    if (!seenAvoids.has(phrase.toLowerCase())) {
      items.push({ kind: "avoid_phrase", value: a, valueKey: phrase });
    }
  }
  return items;
}

function promotionItemId({
  roleFamily,
  seniority,
  meetingType,
  kind,
  valueKey,
}: {
  roleFamily: string;
  seniority: string;
  meetingType: string;
  kind: string;
  valueKey: string;
}): string {
  return [roleFamily, seniority, meetingType, kind, valueKey].join("\u001f");
}

function parsePromotionItemId(id: unknown): ParsedPromotionId | null {
  const parts = String(id || "").split("\u001f");
  if (parts.length < 5) return null;
  const [roleFamily, seniority, meetingType, kind, ...rest] = parts;
  if (
    roleFamily === undefined ||
    seniority === undefined ||
    meetingType === undefined ||
    kind === undefined
  ) {
    return null;
  }
  return { roleFamily, seniority, meetingType, kind, valueKey: rest.join("\u001f") };
}

function describePromotionItem(item: PromotionItem): string {
  if (item.kind === "prefer_term") return `"${String(item.value)}"`;
  if (item.kind === "prefer_phrase") return `"${String(item.value)}"`;
  if (item.kind === "avoid_phrase") {
    const a = isObjectRecord(item.value) ? item.value : {};
    return a.better_as
      ? `Avoid "${String(a.phrase)}" → "${String(a.better_as)}"`
      : `Avoid "${String(a.phrase)}"`;
  }
  return String(item.valueKey || "");
}

function applyKeep(canonM: Record<string, unknown>, item: PromotionItem): void {
  if (item.kind === "prefer_term") {
    if (Array.isArray(canonM.prefer_terms)) canonM.prefer_terms.push(item.value);
  } else if (item.kind === "prefer_phrase") {
    if (Array.isArray(canonM.prefer_phrases)) canonM.prefer_phrases.push(item.value);
  } else if (item.kind === "avoid_phrase") {
    if (Array.isArray(canonM.avoid_phrases)) canonM.avoid_phrases.push(item.value);
  }
}

function removeFromCandidate(candM: Record<string, unknown>, item: PromotionItem): void {
  const eq = (a: unknown, b: unknown): boolean => String(a).toLowerCase() === String(b).toLowerCase();
  if (item.kind === "prefer_term") {
    const arr = Array.isArray(candM.prefer_terms) ? candM.prefer_terms : [];
    candM.prefer_terms = arr.filter((x) => !eq(x, item.value));
  } else if (item.kind === "prefer_phrase") {
    const arr = Array.isArray(candM.prefer_phrases) ? candM.prefer_phrases : [];
    candM.prefer_phrases = arr.filter((x) => !eq(x, item.value));
  } else if (item.kind === "avoid_phrase") {
    const arr = Array.isArray(candM.avoid_phrases) ? candM.avoid_phrases : [];
    candM.avoid_phrases = arr.filter((x) => !eq(phraseOf(x), phraseOf(item.value)));
  }
}

function findPendingItem(parsedId: ParsedPromotionId | null): PendingHit | null {
  if (!parsedId) return null;
  const f = listCandidateFiles().find(
    (x) => x.roleFamily === parsedId.roleFamily && x.seniority === parsedId.seniority,
  );
  if (!f) return null;

  const candDoc = readYaml(f.path);
  if (!candDoc) return null;
  const candMeetingTypes = candDoc.meeting_types;
  if (!isObjectRecord(candMeetingTypes)) return null;
  const candM = candMeetingTypes[parsedId.meetingType];
  if (!isObjectRecord(candM)) return null;

  const canonPath = path.join(LEX_DIR, f.roleFamily, `${f.seniority}.yaml`);
  const canonDoc = readYaml(canonPath) || ensureCanonical(f.roleFamily, f.seniority);
  const canonM = ensureMeetingType(canonDoc, parsedId.meetingType);
  const items = netNewForMeeting(candM, canonM);
  const item = items.find((x) => x.kind === parsedId.kind && x.valueKey === parsedId.valueKey);
  if (!item) return null;

  return { file: f, candDoc, canonDoc, candM, canonM, item, canonPath };
}

function listPendingPromotions(): PendingPromotion[] {
  const pending: PendingPromotion[] = [];
  for (const f of listCandidateFiles()) {
    const candDoc = readYaml(f.path);
    const candMeetingTypes = candDoc ? candDoc.meeting_types : undefined;
    if (!isObjectRecord(candMeetingTypes)) continue;

    const canonPath = path.join(LEX_DIR, f.roleFamily, `${f.seniority}.yaml`);
    const canonDoc = readYaml(canonPath) || ensureCanonical(f.roleFamily, f.seniority);

    for (const meetingType of Object.keys(candMeetingTypes)) {
      const rawCandM = candMeetingTypes[meetingType];
      const candM: Record<string, unknown> = isObjectRecord(rawCandM) ? rawCandM : {};
      const canonM = ensureMeetingType(canonDoc, meetingType);
      for (const item of netNewForMeeting(candM, canonM)) {
        const context =
          item.kind === "avoid_phrase" && isObjectRecord(item.value) && typeof item.value.reason === "string"
            ? item.value.reason
            : "";
        pending.push({
          id: promotionItemId({
            roleFamily: f.roleFamily,
            seniority: f.seniority,
            meetingType,
            kind: item.kind,
            valueKey: item.valueKey,
          }),
          roleFamily: f.roleFamily,
          seniority: f.seniority,
          meetingType,
          kind: item.kind,
          phrase: describePromotionItem(item),
          context,
          scopeLabel: `${f.roleFamily} / ${f.seniority} / ${meetingType}`,
        });
      }
    }
  }
  return pending;
}

function applyPromotionDecisions(
  decisions: Array<{ id?: unknown; keep?: unknown }> | null | undefined,
): { promoted: number; dropped: number; skipped: number; remaining: number } {
  const touched = new Map<string, TouchedBucket>();
  let promoted = 0;
  let dropped = 0;
  let skipped = 0;

  for (const d of decisions || []) {
    const parsed = parsePromotionItemId(d?.id);
    if (!parsed) {
      skipped += 1;
      continue;
    }
    const hit = findPendingItem(parsed);
    if (!hit) {
      skipped += 1;
      continue;
    }

    const key = hit.file.path;
    if (!touched.has(key)) {
      touched.set(key, {
        file: hit.file,
        candDoc: hit.candDoc,
        canonDoc: hit.canonDoc,
        canonPath: hit.canonPath,
        canonChanged: false,
        candChanged: false,
      });
    }
    const bucket = touched.get(key);
    if (!bucket) continue;
    const candMeetingTypes = bucket.candDoc.meeting_types;
    if (!isObjectRecord(candMeetingTypes)) continue;
    const candM = candMeetingTypes[parsed.meetingType];
    if (!isObjectRecord(candM)) continue;
    const canonM = ensureMeetingType(bucket.canonDoc, parsed.meetingType);
    const item = hit.item;

    if (d.keep === true) {
      applyKeep(canonM, item);
      removeFromCandidate(candM, item);
      bucket.canonChanged = true;
      bucket.candChanged = true;
      promoted += 1;
    } else if (d.keep === false) {
      removeFromCandidate(candM, item);
      bucket.candChanged = true;
      dropped += 1;
    } else {
      skipped += 1;
    }
  }

  for (const bucket of touched.values()) {
    if (bucket.canonChanged) writeYaml(bucket.canonPath, bucket.canonDoc);
    if (bucket.candChanged) writeYaml(bucket.file.path, bucket.candDoc);
  }

  return { promoted, dropped, skipped, remaining: listPendingPromotions().length };
}

export {
  listPendingPromotions,
  applyPromotionDecisions,
  promotionItemId,
  parsePromotionItemId,
  listCandidateFiles,
  netNewForMeeting,
  describePromotionItem,
};
