const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");

const { callAI, parseAIJson } = require("./ai-client");
const { modelFor } = require("./models");
const {
  loadLexicon,
  lexiconScopeFor,
  canonicalPath,
  candidatePath,
} = require("./lexicon");
const { bold, cyan, dim, gray, green, yellow, HR } = require("./ui");

const ROOT = path.join(__dirname, "..");
const PROMPT_PATH = path.join(ROOT, "prompts", "review-session-for-lexicon.md");
const SUGGESTED_DIR = path.join(ROOT, "lexicons", "_suggested");

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    roleFamily: { type: "string" },
    seniority: { type: "string" },
    meetingType: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["prefer_term", "prefer_phrase", "avoid_phrase"] },
          value: { type: "string" },
          reason: { type: "string" },
          evidence: { type: "string" },
          better_as: { type: ["string", "null"] },
          status: { type: "string", enum: ["pending"] },
        },
        required: ["type", "value", "reason", "evidence", "better_as", "status"],
        additionalProperties: false,
      },
    },
  },
  required: ["roleFamily", "seniority", "meetingType", "suggestions"],
  additionalProperties: false,
};

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function shouldReview({ role, seniority, meetingType }) {
  const scope = lexiconScopeFor({ role, seniority, meetingType });
  return scope.roleFamily === "design" && scope.seniority === "lead" && scope.meetingType === "growth";
}

function buildPrompt({ scope, ctx, lexicon, transcript, bank, evaluation }) {
  const template = fs.readFileSync(PROMPT_PATH, "utf8");
  const filled = template
    .replace(/\{\{ROLE_FAMILY\}\}/g, scope.roleFamily)
    .replace(/\{\{SENIORITY\}\}/g, scope.seniority)
    .replace(/\{\{MEETING_TYPE\}\}/g, scope.meetingType)
    .replace("{{CURRENT_LEXICON_JSON}}", JSON.stringify(lexicon, null, 2))
    .replace("{{NAME}}", ctx.name || "(unknown)")
    .replace("{{ROLE}}", ctx.role || "(unknown)")
    .replace("{{MEETING_TYPE_LABEL}}", ctx.meetingType || "(unknown)")
    .replace("{{MANAGER_NOTES}}", ctx.notes || "(none)")
    .replace("{{TRANSCRIPT_JSON}}", JSON.stringify(transcript || [], null, 2))
    .replace("{{QUESTION_BANK_JSON}}", JSON.stringify(bank || [], null, 2))
    .replace("{{EVALUATION_JSON}}", JSON.stringify(evaluation || {}, null, 2));

  const systemMatch = filled.match(/## System\s+([\s\S]*?)\n## User/);
  const userMatch = filled.match(/## User\s+([\s\S]*)$/);
  return {
    system: systemMatch ? systemMatch[1].trim() : "",
    user: userMatch ? userMatch[1].trim() : filled,
  };
}

function describeSuggestion(s, i) {
  if (s.type === "prefer_term") return `Add preferred term: "${s.value}"`;
  if (s.type === "prefer_phrase") return `Add preferred phrase: "${s.value}"`;
  if (s.type === "avoid_phrase") {
    const better = s.better_as ? ` (better: "${s.better_as}")` : "";
    return `Avoid phrase: "${s.value}"${better}`;
  }
  return `${s.type}: "${s.value}"`;
}

function renderSuggestions(suggestions, scopeLabel) {
  console.log();
  console.log("  " + bold(`Sero found ${suggestions.length} possible wording updates for ${scopeLabel}:`));
  console.log();
  suggestions.forEach((s, i) => {
    console.log(`  ${yellow(`[${i + 1}]`)} ${describeSuggestion(s)}`);
    if (s.reason) console.log(`       ${gray(s.reason)}`);
    if (s.evidence) console.log(`       ${dim("evidence: " + s.evidence)}`);
  });
  console.log();
}

function parseInput(raw) {
  const s = (raw || "").trim().toLowerCase();
  if (s === "q") return { action: "skip" };
  if (s === "n") return { action: "none" };
  if (s === "") return { action: "approve_all" };
  const nums = s
    .split(/[\s,]+/)
    .map((x) => parseInt(x, 10))
    .filter((x) => Number.isInteger(x) && x > 0);
  if (nums.length) return { action: "approve_except", remove: new Set(nums) };
  return { action: "approve_all" };
}

function partition(suggestions, parsed) {
  if (parsed.action === "skip" || parsed.action === "none") {
    return { accepted: [], rejected: suggestions.slice() };
  }
  if (parsed.action === "approve_all") {
    return { accepted: suggestions.slice(), rejected: [] };
  }
  const accepted = [];
  const rejected = [];
  suggestions.forEach((s, i) => {
    if (parsed.remove.has(i + 1)) rejected.push(s);
    else accepted.push(s);
  });
  return { accepted, rejected };
}

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

async function reviewSession({ session, ctx, ask }) {
  if (!shouldReview(ctx)) return { skipped: true, reason: "out-of-scope" };

  const scope = lexiconScopeFor(ctx);
  const sessionDir = session.dir;

  const transcript = readJsonSafe(path.join(sessionDir, "transcript.json"));
  const bankResp = readJsonSafe(path.join(sessionDir, "03-question-bank", "response.json"));
  const evalResp = readJsonSafe(path.join(sessionDir, "05-evaluation", "response.json"));
  const bankQuestions = extractBankQuestions(bankResp);

  const lexicon = loadLexicon(ctx);

  console.log();
  console.log(HR);
  console.log("  " + bold("Lexicon review") + dim(` — ${scope.roleFamily} / ${scope.seniority} / ${scope.meetingType}`));

  let response;
  try {
    const messages = buildPrompt({ scope, ctx, lexicon, transcript, bank: bankQuestions, evaluation: evalResp });
    const raw = await callAI({
      system: messages.system,
      user: messages.user,
      schema: RESPONSE_SCHEMA,
      schemaName: "lexicon_review",
      temperature: 0.4,
      model: modelFor("evaluation"),
      costLabel: "06-lexicon-review",
    });
    response = parseAIJson(raw, "Lexicon reviewer", ["suggestions"]);
  } catch (e) {
    console.log("  " + dim(`reviewer failed: ${e.message}`));
    return { skipped: true, reason: "reviewer-failed", error: e.message };
  }

  const suggestions = Array.isArray(response.suggestions) ? response.suggestions : [];
  if (!suggestions.length) {
    console.log("  " + dim("No useful wording updates suggested."));
    writeTrace({
      sessionId: session.id,
      scope,
      allSuggestions: [],
      accepted: [],
      rejected: [],
      userInput: "(no suggestions)",
    });
    console.log();
    return { skipped: false, accepted: [], rejected: [] };
  }

  const scopeLabel = `${capitalize(scope.roleFamily)} ${capitalize(scope.seniority)} + ${capitalize(scope.meetingType)}`;
  renderSuggestions(suggestions, scopeLabel);

  console.log("  " + dim("Enter = approve all as candidates · numbers (e.g. 2 5) = remove those · n = none · q = skip"));
  const raw = await ask(cyan("  Approve as candidates except: "));
  const parsed = parseInput(raw);
  const { accepted, rejected } = partition(suggestions, parsed);

  const tracePath = writeTrace({
    sessionId: session.id,
    scope,
    allSuggestions: suggestions,
    accepted,
    rejected,
    userInput: raw || "",
  });

  let wrote = false;
  if (parsed.action !== "skip" && accepted.length) {
    wrote = appendCandidates(candidatePath(scope.roleFamily, scope.seniority), scope, accepted);
  }

  console.log();
  if (parsed.action === "skip") {
    console.log("  " + dim("Skipped. Trace saved for review."));
  } else if (accepted.length && wrote) {
    console.log("  " + green(`Saved ${accepted.length} to candidates`) + dim(` → ${path.relative(ROOT, candidatePath(scope.roleFamily, scope.seniority))}`));
    console.log("  " + dim(`Canonical (live) lexicon unchanged: ${path.relative(ROOT, canonicalPath(scope.roleFamily, scope.seniority))}`));
  } else if (accepted.length && !wrote) {
    console.log("  " + dim("All accepted suggestions were already in the candidate file — nothing new written."));
  } else {
    console.log("  " + dim("Saved none."));
  }
  console.log("  " + dim(`Trace: ${path.relative(ROOT, tracePath)}`));
  console.log();

  return { skipped: false, accepted, rejected, tracePath };
}

function extractBankQuestions(bankResp) {
  if (!bankResp) return [];
  if (Array.isArray(bankResp)) return bankResp;
  if (typeof bankResp === "object" && bankResp.raw) {
    try {
      const parsed = JSON.parse(bankResp.raw);
      if (Array.isArray(parsed?.questions)) return parsed.questions;
    } catch {}
  }
  if (typeof bankResp === "string") {
    try {
      const parsed = JSON.parse(bankResp);
      if (Array.isArray(parsed?.questions)) return parsed.questions;
    } catch {}
  }
  return [];
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = {
  reviewSession,
  shouldReview,
  // exposed for tests
  _internals: { parseInput, partition, appendCandidates, writeTrace, ensureCandidateDoc, extractBankQuestions },
};
