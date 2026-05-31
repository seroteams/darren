const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");

const ROOT = path.join(__dirname, "..");
const LEXICONS_DIR = path.join(ROOT, "lexicons");
const CANDIDATES_DIR = path.join(LEXICONS_DIR, "_candidates");

const EMPTY = { preferTerms: [], preferPhrases: [], avoidPhrases: [] };

function roleFamilyOf(role) {
  if (!role || typeof role !== "string") return null;
  const r = role.toLowerCase();
  if (
    r.includes("designer") ||
    r.includes("design") ||
    r.includes("ux")
  ) {
    return "design";
  }
  return null;
}

function meetingTypeKey(meetingType) {
  if (!meetingType || typeof meetingType !== "string") return null;
  const m = meetingType.toLowerCase();
  if (m.includes("growth")) return "growth";
  if (m.includes("performance")) return "performance";
  if (m.includes("bi-weekly") || m.includes("biweekly") || m.includes("check-in")) return "biweekly";
  if (m.includes("off")) return "off";
  return m;
}

function seniorityKey(seniority) {
  if (!seniority || typeof seniority !== "string") return null;
  return seniority.toLowerCase().trim();
}

function canonicalPath(roleFamily, seniority) {
  return path.join(LEXICONS_DIR, roleFamily, `${seniority}.yaml`);
}

function candidatePath(roleFamily, seniority) {
  return path.join(CANDIDATES_DIR, roleFamily, `${seniority}.yaml`);
}

function safeLoadYaml(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = YAML.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function loadLexicon({ meetingType, role, seniority }) {
  const family = roleFamilyOf(role);
  const sen = seniorityKey(seniority);
  const mt = meetingTypeKey(meetingType);
  if (!family || !sen || !mt) return { ...EMPTY };

  const filePath = canonicalPath(family, sen);
  const doc = safeLoadYaml(filePath);
  if (!doc) return { ...EMPTY };

  const meetings = doc.meeting_types && typeof doc.meeting_types === "object" ? doc.meeting_types : {};
  const entry = meetings[mt];
  if (!entry || typeof entry !== "object") return { ...EMPTY };

  const preferTerms = Array.isArray(entry.prefer_terms)
    ? entry.prefer_terms.filter((x) => typeof x === "string" && x.trim())
    : [];
  const preferPhrases = Array.isArray(entry.prefer_phrases)
    ? entry.prefer_phrases.filter((x) => typeof x === "string" && x.trim())
    : [];
  const avoidPhrases = Array.isArray(entry.avoid_phrases)
    ? entry.avoid_phrases
        .filter((x) => x && typeof x === "object" && typeof x.phrase === "string" && x.phrase.trim())
        .map((x) => ({
          phrase: x.phrase,
          reason: typeof x.reason === "string" ? x.reason : "",
          better_as: typeof x.better_as === "string" ? x.better_as : "",
        }))
    : [];

  return { preferTerms, preferPhrases, avoidPhrases };
}

function lexiconScopeFor({ meetingType, role, seniority }) {
  return {
    roleFamily: roleFamilyOf(role),
    seniority: seniorityKey(seniority),
    meetingType: meetingTypeKey(meetingType),
  };
}

// Expert designers on growth paths share the design/lead lexicon file.
function resolveLexiconScope(ctx) {
  const base = lexiconScopeFor(ctx);
  if (base.roleFamily === "design" && base.meetingType === "growth" && base.seniority === "expert") {
    return { ...base, seniority: "lead", sourceSeniority: "expert" };
  }
  return base;
}

const DESIGN_GROWTH_SENIORITIES = new Set(["lead", "expert"]);

function isLexiconReviewScope(scope) {
  return (
    scope.roleFamily === "design" &&
    scope.meetingType === "growth" &&
    DESIGN_GROWTH_SENIORITIES.has(scope.seniority)
  );
}

module.exports = {
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
