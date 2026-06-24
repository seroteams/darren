const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const { LEXICONS_DIR } = require("../paths.mts");

const CAND_DIR = path.join(LEXICONS_DIR, "_candidates");
const LEX_DIR = LEXICONS_DIR;

function readYaml(filePath) {
  try {
    return YAML.parse(fs.readFileSync(filePath, "utf8")) || null;
  } catch {
    return null;
  }
}

function writeYaml(filePath, doc) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(doc));
}

function ensureCanonical(roleFamily, seniority) {
  return {
    role_family: roleFamily,
    seniority,
    meeting_types: {},
  };
}

function ensureMeetingType(doc, meetingType) {
  if (!doc.meeting_types) doc.meeting_types = {};
  if (!doc.meeting_types[meetingType]) {
    doc.meeting_types[meetingType] = { prefer_terms: [], prefer_phrases: [], avoid_phrases: [] };
  }
  const m = doc.meeting_types[meetingType];
  if (!Array.isArray(m.prefer_terms)) m.prefer_terms = [];
  if (!Array.isArray(m.prefer_phrases)) m.prefer_phrases = [];
  if (!Array.isArray(m.avoid_phrases)) m.avoid_phrases = [];
  return m;
}

function listCandidateFiles() {
  if (!fs.existsSync(CAND_DIR)) return [];
  const out = [];
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

function netNewForMeeting(candM, canonM) {
  const seenTerms = new Set((canonM.prefer_terms || []).map((x) => String(x).toLowerCase()));
  const seenPhrases = new Set((canonM.prefer_phrases || []).map((x) => String(x).toLowerCase()));
  const seenAvoids = new Set((canonM.avoid_phrases || []).map((x) => String(x?.phrase || "").toLowerCase()));

  const items = [];
  for (const v of candM.prefer_terms || []) {
    if (!seenTerms.has(String(v).toLowerCase())) {
      items.push({ kind: "prefer_term", value: v, valueKey: String(v) });
    }
  }
  for (const v of candM.prefer_phrases || []) {
    if (!seenPhrases.has(String(v).toLowerCase())) {
      items.push({ kind: "prefer_phrase", value: v, valueKey: String(v) });
    }
  }
  for (const a of candM.avoid_phrases || []) {
    const phrase = String(a?.phrase || "");
    if (!seenAvoids.has(phrase.toLowerCase())) {
      items.push({ kind: "avoid_phrase", value: a, valueKey: phrase });
    }
  }
  return items;
}

function promotionItemId({ roleFamily, seniority, meetingType, kind, valueKey }) {
  return [roleFamily, seniority, meetingType, kind, valueKey].join("\u001f");
}

function parsePromotionItemId(id) {
  const parts = String(id || "").split("\u001f");
  if (parts.length < 5) return null;
  const [roleFamily, seniority, meetingType, kind, ...rest] = parts;
  return { roleFamily, seniority, meetingType, kind, valueKey: rest.join("\u001f") };
}

function describePromotionItem(item) {
  if (item.kind === "prefer_term") return `"${item.value}"`;
  if (item.kind === "prefer_phrase") return `"${item.value}"`;
  if (item.kind === "avoid_phrase") {
    const a = item.value;
    return a.better_as ? `Avoid "${a.phrase}" → "${a.better_as}"` : `Avoid "${a.phrase}"`;
  }
  return String(item.valueKey || "");
}

function applyKeep(canonM, item) {
  if (item.kind === "prefer_term") canonM.prefer_terms.push(item.value);
  else if (item.kind === "prefer_phrase") canonM.prefer_phrases.push(item.value);
  else if (item.kind === "avoid_phrase") canonM.avoid_phrases.push(item.value);
}

function removeFromCandidate(candM, item) {
  const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  if (item.kind === "prefer_term") {
    candM.prefer_terms = (candM.prefer_terms || []).filter((x) => !eq(x, item.value));
  } else if (item.kind === "prefer_phrase") {
    candM.prefer_phrases = (candM.prefer_phrases || []).filter((x) => !eq(x, item.value));
  } else if (item.kind === "avoid_phrase") {
    candM.avoid_phrases = (candM.avoid_phrases || []).filter((x) => !eq(x?.phrase, item.value?.phrase));
  }
}

function findPendingItem(parsedId) {
  if (!parsedId) return null;
  const f = listCandidateFiles().find(
    (x) => x.roleFamily === parsedId.roleFamily && x.seniority === parsedId.seniority
  );
  if (!f) return null;

  const candDoc = readYaml(f.path);
  if (!candDoc?.meeting_types?.[parsedId.meetingType]) return null;

  const canonPath = path.join(LEX_DIR, f.roleFamily, `${f.seniority}.yaml`);
  const canonDoc = readYaml(canonPath) || ensureCanonical(f.roleFamily, f.seniority);
  const candM = candDoc.meeting_types[parsedId.meetingType];
  const canonM = ensureMeetingType(canonDoc, parsedId.meetingType);
  const items = netNewForMeeting(candM, canonM);
  const item = items.find((x) => x.kind === parsedId.kind && x.valueKey === parsedId.valueKey);
  if (!item) return null;

  return { file: f, candDoc, canonDoc, candM, canonM, item, canonPath };
}

function listPendingPromotions() {
  const pending = [];
  for (const f of listCandidateFiles()) {
    const candDoc = readYaml(f.path);
    if (!candDoc?.meeting_types) continue;

    const canonPath = path.join(LEX_DIR, f.roleFamily, `${f.seniority}.yaml`);
    const canonDoc = readYaml(canonPath) || ensureCanonical(f.roleFamily, f.seniority);

    for (const meetingType of Object.keys(candDoc.meeting_types)) {
      const candM = candDoc.meeting_types[meetingType] || {};
      const canonM = ensureMeetingType(canonDoc, meetingType);
      for (const item of netNewForMeeting(candM, canonM)) {
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
          context: item.kind === "avoid_phrase" && item.value?.reason ? item.value.reason : "",
          scopeLabel: `${f.roleFamily} / ${f.seniority} / ${meetingType}`,
        });
      }
    }
  }
  return pending;
}

function applyPromotionDecisions(decisions) {
  const touched = new Map();
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
    const candM = bucket.candDoc.meeting_types[parsed.meetingType];
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

module.exports = {
  listPendingPromotions,
  applyPromotionDecisions,
  promotionItemId,
  parsePromotionItemId,
  listCandidateFiles,
  netNewForMeeting,
  describePromotionItem,
};
