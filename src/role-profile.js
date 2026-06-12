const fs = require("node:fs");
const path = require("node:path");

const { slugify } = require("./person-profile");
const { roleFamilyOf } = require("./lexicon");
const { splitSystemUser } = require("./prompt-utils");
const { promptVersionFor } = require("./prompt-version");
const { logStage } = require("./session");
const { modelFor } = require("./models");
const { callAI, parseAIJson } = require("./ai-client");
const { isRelationalArc } = require("./relational-arcs");

const ROOT = path.join(__dirname, "..");
const PROFILES_DIR = path.join(ROOT, "data", "role-profiles");
const PROMPT_PATH = path.join(ROOT, "prompts", "generate-role-profile.md");
const PROFILE_VERSION = 1;

const FALLBACK_BLOCK =
  "(no role profile available — ground questions in the stated role title and seniority)";

const getDefaultModel = () => modelFor("role_profile");

// Generated from role + seniority ONLY — the file is shared across every person
// holding this title at this level, so nothing personal may flow in.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    role_confidence: { type: "string", enum: ["low", "medium", "high"] },
    known_challenges: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          category: { type: "string", enum: ["wellbeing", "topic", "competency"] },
        },
        required: ["text", "category"],
        additionalProperties: false,
      },
    },
    recommended_question_themes: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          theme: { type: "string" },
          why: { type: "string" },
          category: { type: "string", enum: ["wellbeing", "topic", "competency"] },
        },
        required: ["theme", "why", "category"],
        additionalProperties: false,
      },
    },
    terminology: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          meaning: { type: "string" },
        },
        required: ["term", "meaning"],
        additionalProperties: false,
      },
    },
    listen_for: { type: "array", maxItems: 5, items: { type: "string" } },
    avoid: { type: "array", maxItems: 4, items: { type: "string" } },
  },
  required: [
    "summary",
    "role_confidence",
    "known_challenges",
    "recommended_question_themes",
    "terminology",
    "listen_for",
    "avoid",
  ],
  additionalProperties: false,
};

// Exact title + seniority is the cache key — "job titles are key". No family
// coarsening: Staff SRE and Software Engineer are different files by design.
function keyOf({ role, seniority }) {
  const roleSlug = slugify(role);
  const senSlug = slugify(seniority);
  if (!roleSlug || !senSlug) return null;
  return `${roleSlug}--${senSlug}`;
}

function profilePath(key) {
  return path.join(PROFILES_DIR, `${key}.json`);
}

function validShape(doc) {
  return Boolean(
    doc &&
      typeof doc === "object" &&
      doc.version === PROFILE_VERSION &&
      doc.profile &&
      typeof doc.profile === "object" &&
      typeof doc.profile.summary === "string" &&
      Array.isArray(doc.profile.known_challenges) &&
      Array.isArray(doc.profile.recommended_question_themes)
  );
}

// Null-safe read for stage consumption (the loadLexicon EMPTY pattern): any
// missing/corrupt/wrong-version file means "no profile", never a throw. A
// prompt_version mismatch does NOT null it — content is still useful mid-run;
// regeneration is ensureRoleProfile's job at intake time.
function loadRoleProfile({ role, seniority }) {
  const key = keyOf({ role, seniority });
  if (!key) return null;
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(profilePath(key), "utf8"));
  } catch {
    return null;
  }
  return validShape(doc) ? doc : null;
}

function isFresh(doc) {
  return validShape(doc) && doc.prompt_version === promptVersionFor(PROMPT_PATH);
}

// Atomic write, same pattern as person-profile.js: a crash mid-write can never
// leave a torn cache file.
function writeAtomic(file, content) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function buildMessages({ role, seniority }) {
  const template = fs.readFileSync(PROMPT_PATH, "utf8");
  const filled = template
    .replaceAll("{{ROLE_TITLE}}", role || "(not provided)")
    .replaceAll("{{SENIORITY}}", seniority || "(not provided)");
  return splitSystemUser(filled);
}

async function generate({ role, seniority, key, model, session }) {
  const messages = buildMessages({ role, seniority });
  const raw = await callAI({
    system: messages.system,
    user: messages.user,
    schema: RESPONSE_SCHEMA,
    schemaName: "role_profile",
    temperature: 0.4,
    model,
    costLabel: "00b-role-profile",
  });

  logStage(session, "00b-role-profile", {
    inputs: { role, seniority, key, model },
    prompt: messages.filled,
    response: raw,
  });

  const profile = parseAIJson(raw, "Role profile model", [
    "summary",
    "role_confidence",
    "known_challenges",
    "recommended_question_themes",
  ]);

  const doc = {
    version: PROFILE_VERSION,
    prompt_version: promptVersionFor(PROMPT_PATH),
    model,
    generated_at: Date.now(),
    role_title_raw: role,
    role_slug: slugify(role),
    seniority_raw: seniority,
    seniority_key: slugify(seniority),
    role_family: roleFamilyOf(role),
    profile,
  };

  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  writeAtomic(profilePath(key), JSON.stringify(doc, null, 2));
  return doc;
}

// One generation per key at a time within this process; two simultaneous
// setups share the same promise instead of double-spending.
const inFlight = new Map();

// Every run's log folder gets the profile it actually used — cache hits
// included — so a run is self-contained for review. Logging must never break
// a run, hence the blanket try/catch.
function snapshotToSession(session, outcome) {
  if (!session || !session.dir) return;
  try {
    const dir = path.join(session.dir, "00b-role-profile");
    fs.mkdirSync(dir, { recursive: true });
    if (outcome.doc) {
      fs.writeFileSync(path.join(dir, "profile.json"), JSON.stringify(outcome.doc, null, 2));
    }
    // The generated path already wrote inputs.json/prompt.md/response.json via
    // logStage; only fill inputs.json for the paths that skipped generation.
    if (outcome.status !== "generated") {
      fs.writeFileSync(
        path.join(dir, "inputs.json"),
        JSON.stringify(
          { key: outcome.key, status: outcome.status, ...(outcome.error ? { error: outcome.error } : {}) },
          null,
          2
        )
      );
    }
  } catch {
    // never let log writing interrupt the run
  }
}

// Cache-first: a fresh file on disk means zero LLM calls. Failure resolves
// { status: "unavailable" } — stages fall back to the neutral block, the run
// never blocks on this. Whatever the outcome, a snapshot lands in the
// session's log folder.
async function ensureRoleProfile({ role, seniority }, { session, model = getDefaultModel() } = {}) {
  const key = keyOf({ role, seniority });
  if (!key) {
    const outcome = { status: "unavailable", key: null, doc: null };
    snapshotToSession(session, outcome);
    return outcome;
  }

  let existing = null;
  try {
    existing = JSON.parse(fs.readFileSync(profilePath(key), "utf8"));
  } catch {
    existing = null;
  }
  if (isFresh(existing)) {
    const outcome = { status: "cached", key, doc: existing };
    snapshotToSession(session, outcome);
    return outcome;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key).then((outcome) => {
      snapshotToSession(session, outcome);
      return outcome;
    });
  }

  const promise = generate({ role, seniority, key, model, session })
    .then((doc) => ({ status: "generated", key, doc }))
    .catch((err) => ({ status: "unavailable", key, doc: null, error: err.message }))
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise.then((outcome) => {
    snapshotToSession(session, outcome);
    return outcome;
  });
}

// Relational arcs (bi-weekly / feels-off) must never surface competency
// content — same rule as catalogueForArc in generate.js, enforced in code at
// render time so one cached profile safely serves every meeting type.
function filterForArc(items, meetingType) {
  if (!isRelationalArc(meetingType)) return items;
  return items.filter((item) => item.category !== "competency");
}

const SLICES = {
  full: { challenges: true, themes: true, terminology: true, listenFor: true, avoid: true },
  focus: { challenges: true, themes: false, terminology: false, listenFor: false, avoid: false },
  planner: { challenges: false, themes: false, terminology: true, listenFor: true, avoid: false },
  eval: { challenges: true, themes: false, terminology: true, listenFor: false, avoid: false },
};

function renderRoleProfileBlock(doc, { slice = "full", meetingType } = {}) {
  if (!doc || !validShape(doc)) return FALLBACK_BLOCK;
  const p = doc.profile;
  const parts = SLICES[slice] || SLICES.full;
  const lines = ["<role_profile>"];
  lines.push(
    `Role context for a ${doc.seniority_raw || "(unspecified)"} ${doc.role_title_raw || "(unspecified)"} (generated guidance, not facts about this specific person):`
  );
  if (p.role_confidence === "low") {
    lines.push("(low confidence in this exact title — treat the following as general guidance)");
  }
  lines.push("", `Summary: ${p.summary}`);

  if (parts.challenges) {
    const challenges = filterForArc(p.known_challenges, meetingType);
    if (challenges.length) {
      lines.push("", "Known challenges for this role and level:");
      for (const c of challenges) lines.push(`- ${c.text}`);
    }
  }
  if (parts.themes) {
    const themes = filterForArc(p.recommended_question_themes, meetingType);
    if (themes.length) {
      lines.push("", "Worth exploring (themes, not verbatim questions):");
      for (const t of themes) lines.push(`- ${t.theme} — ${t.why}`);
    }
  }
  if (parts.terminology && (p.terminology || []).length) {
    lines.push("", "Terms this role uses (recognise and mirror them):");
    for (const t of p.terminology) lines.push(`- ${t.term}: ${t.meaning}`);
  }
  if (parts.listenFor && (p.listen_for || []).length) {
    lines.push("", "Listen for:");
    for (const s of p.listen_for) lines.push(`- ${s}`);
  }
  if (parts.avoid && (p.avoid || []).length) {
    lines.push("", "Avoid:");
    for (const a of p.avoid) lines.push(`- ${a}`);
  }
  lines.push("</role_profile>");
  return lines.join("\n");
}

// For stage inputs.json — lets QA verify deterministically whether the block
// was loaded for a given run without parsing the rendered prompt.
function roleProfileLogInfo({ role, seniority }) {
  return {
    key: keyOf({ role, seniority }),
    status: loadRoleProfile({ role, seniority }) ? "loaded" : "none",
  };
}

module.exports = {
  PROFILES_DIR,
  PROMPT_PATH,
  PROFILE_VERSION,
  FALLBACK_BLOCK,
  keyOf,
  profilePath,
  loadRoleProfile,
  ensureRoleProfile,
  renderRoleProfileBlock,
  roleProfileLogInfo,
  buildMessages,
};
