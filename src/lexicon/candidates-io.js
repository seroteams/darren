const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const { LEXICONS_DIR } = require("../../backend/engine/paths");

const SUGGESTED_DIR = path.join(LEXICONS_DIR, "_suggested");

function ensureCandidateDoc(filePath, scope) {
  let doc = null;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    doc = YAML.parse(raw);
  } catch {}
  if (!doc || typeof doc !== "object") {
    doc = { role_family: scope.roleFamily, seniority: scope.seniority, meeting_types: {} };
  }
  if (!doc.meeting_types || typeof doc.meeting_types !== "object") doc.meeting_types = {};
  if (!doc.meeting_types[scope.meetingType] || typeof doc.meeting_types[scope.meetingType] !== "object") {
    doc.meeting_types[scope.meetingType] = {
      prefer_terms: [],
      prefer_phrases: [],
      avoid_phrases: [],
    };
  }
  const entry = doc.meeting_types[scope.meetingType];
  if (!Array.isArray(entry.prefer_terms)) entry.prefer_terms = [];
  if (!Array.isArray(entry.prefer_phrases)) entry.prefer_phrases = [];
  if (!Array.isArray(entry.avoid_phrases)) entry.avoid_phrases = [];
  return doc;
}

function appendCandidates(filePath, scope, accepted) {
  if (!accepted.length) return false;
  const doc = ensureCandidateDoc(filePath, scope);
  const entry = doc.meeting_types[scope.meetingType];

  const seenTerms = new Set(entry.prefer_terms.map((x) => String(x).toLowerCase()));
  const seenPhrases = new Set(entry.prefer_phrases.map((x) => String(x).toLowerCase()));
  const seenAvoids = new Set(entry.avoid_phrases.map((x) => (x?.phrase || "").toLowerCase()));

  let changed = false;
  for (const s of accepted) {
    const v = (s.value || "").trim();
    if (!v) continue;
    if (s.type === "prefer_term") {
      const k = v.toLowerCase();
      if (!seenTerms.has(k)) {
        entry.prefer_terms.push(v);
        seenTerms.add(k);
        changed = true;
      }
    } else if (s.type === "prefer_phrase") {
      const k = v.toLowerCase();
      if (!seenPhrases.has(k)) {
        entry.prefer_phrases.push(v);
        seenPhrases.add(k);
        changed = true;
      }
    } else if (s.type === "avoid_phrase") {
      const k = v.toLowerCase();
      if (!seenAvoids.has(k)) {
        entry.avoid_phrases.push({
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

function writeTrace({ sessionId, scope, allSuggestions, accepted, rejected, userInput }) {
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

function tracePathFor(sessionId) {
  return path.join(SUGGESTED_DIR, `${sessionId}.json`);
}

function readTrace(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(tracePathFor(sessionId), "utf8"));
  } catch {
    return null;
  }
}

module.exports = {
  appendCandidates,
  ensureCandidateDoc,
  writeTrace,
  readTrace,
  tracePathFor,
  SUGGESTED_DIR,
};
