import fs from "node:fs";
import path from "node:path";
import * as YAML from "yaml";
import { LEXICONS_DIR } from "./paths.mts";

const CANDIDATES_DIR = path.join(LEXICONS_DIR, "_candidates");

interface AvoidPhrase {
  phrase: string;
  reason: string;
  better_as: string;
}

interface Lexicon {
  preferTerms: string[];
  preferPhrases: string[];
  avoidPhrases: AvoidPhrase[];
}

interface LexiconScope {
  roleFamily: string | null;
  seniority: string | null;
  meetingType: string | null;
}

interface ResolvedLexiconScope extends LexiconScope {
  sourceSeniority?: string;
}

interface LexiconCtx {
  meetingType?: string | null;
  role?: string | null;
  seniority?: string | null;
}

const EMPTY: Lexicon = { preferTerms: [], preferPhrases: [], avoidPhrases: [] };

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function roleFamilyOf(role: string | null | undefined): string | null {
  if (!role || typeof role !== "string") return null;
  const r = role.toLowerCase();
  if (
    r.includes("designer") ||
    r.includes("design") ||
    r.includes("ux")
  ) {
    return "design";
  }
  if (
    r.includes("engineer") ||
    r.includes("developer") ||
    r.includes("backend") ||
    r.includes("frontend") ||
    r.includes("fullstack") ||
    r.includes("full-stack") ||
    r.includes("software") ||
    r.includes("platform") ||
    r.includes("infra") ||
    r.includes("sre") ||
    r.includes("devops")
  ) {
    return "engineering";
  }
  if (r.includes("product")) return "product";
  if (r.includes("data") || r.includes("analytics")) return "data";
  if (r.includes("marketing")) return "marketing";
  if (r.includes("sales")) return "sales";
  if (r.includes("research")) return "research";
  // LF-5 path B: unmapped titles still review — candidates bootstrap under general/.
  return "general";
}

function meetingTypeKey(meetingType: string | null | undefined): string | null {
  if (!meetingType || typeof meetingType !== "string") return null;
  const m = meetingType.toLowerCase();
  if (m.includes("growth")) return "growth";
  if (m.includes("performance")) return "performance";
  if (m.includes("bi-weekly") || m.includes("biweekly") || m.includes("check-in")) return "biweekly";
  if (m.includes("off")) return "off";
  return m;
}

function seniorityKey(seniority: string | null | undefined): string | null {
  if (!seniority || typeof seniority !== "string") return null;
  return seniority.toLowerCase().trim();
}

function canonicalPath(roleFamily: string, seniority: string): string {
  return path.join(LEXICONS_DIR, roleFamily, `${seniority}.yaml`);
}

function candidatePath(roleFamily: string, seniority: string): string {
  return path.join(CANDIDATES_DIR, roleFamily, `${seniority}.yaml`);
}

function safeLoadYaml(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: unknown = YAML.parse(raw);
    return isObjectRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadLexicon({ meetingType, role, seniority }: LexiconCtx): Lexicon {
  const family = roleFamilyOf(role);
  const sen = seniorityKey(seniority);
  const mt = meetingTypeKey(meetingType);
  if (!family || !sen || !mt) return { ...EMPTY };

  const filePath = canonicalPath(family, sen);
  const doc = safeLoadYaml(filePath);
  if (!doc) return { ...EMPTY };

  const meetings: Record<string, unknown> = isObjectRecord(doc.meeting_types) ? doc.meeting_types : {};
  const entry = meetings[mt];
  if (!isObjectRecord(entry)) return { ...EMPTY };

  const preferTerms: string[] = Array.isArray(entry.prefer_terms)
    ? entry.prefer_terms.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const preferPhrases: string[] = Array.isArray(entry.prefer_phrases)
    ? entry.prefer_phrases.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const avoidPhrases: AvoidPhrase[] = Array.isArray(entry.avoid_phrases)
    ? entry.avoid_phrases
        .filter(
          (x: unknown): x is { phrase: string; reason?: unknown; better_as?: unknown } =>
            isObjectRecord(x) && typeof x.phrase === "string" && x.phrase.trim().length > 0,
        )
        .map((x) => ({
          phrase: x.phrase,
          reason: typeof x.reason === "string" ? x.reason : "",
          better_as: typeof x.better_as === "string" ? x.better_as : "",
        }))
    : [];

  return { preferTerms, preferPhrases, avoidPhrases };
}

function lexiconScopeFor({ meetingType, role, seniority }: LexiconCtx): LexiconScope {
  return {
    roleFamily: roleFamilyOf(role),
    seniority: seniorityKey(seniority),
    meetingType: meetingTypeKey(meetingType),
  };
}

// Expert ICs on growth paths share the lead lexicon file for their role family.
function resolveLexiconScope(ctx: LexiconCtx): ResolvedLexiconScope {
  const base = lexiconScopeFor(ctx);
  if (base.roleFamily && base.meetingType === "growth" && base.seniority === "expert") {
    return { ...base, seniority: "lead", sourceSeniority: "expert" };
  }
  return base;
}

const REVIEW_SENIORITIES = new Set(["lead", "expert"]);

// LF-5 path B: all role families; still growth + lead|expert (bi-weekly stays out-of-scope).
function isLexiconReviewScope(scope: LexiconScope): boolean {
  return (
    Boolean(scope.roleFamily) &&
    scope.meetingType === "growth" &&
    REVIEW_SENIORITIES.has(scope.seniority ?? "")
  );
}

export {
  loadLexicon,
  lexiconScopeFor,
  resolveLexiconScope,
  isLexiconReviewScope,
  canonicalPath,
  candidatePath,
  roleFamilyOf,
  meetingTypeKey,
  seniorityKey,
};
