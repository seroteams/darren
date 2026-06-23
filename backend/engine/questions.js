const fs = require("node:fs");
const path = require("node:path");
const { QUESTIONS_DIR } = require("./paths");

const QUESTIONS_ROOT = QUESTIONS_DIR;
const INDEX_PATH = path.join(QUESTIONS_ROOT, "_index.json");
const OPENERS_PATH = path.join(QUESTIONS_ROOT, "_openers.json");

const FIELD_ORDER = [
  "alias",
  "label",
  "name",
  "description",
  "purpose",
  "stage",
  "axis_effects",
  "source",
];

// -----------------------------------------------------------------------------
// Minimal YAML codec (scoped to our question shape: flat scalars + one-level
// nested axis_effects: {axisId: int}). Not a general YAML parser.
// -----------------------------------------------------------------------------

function needsQuoting(s) {
  return /[:#"'\n]/.test(s) || /^\s|\s$/.test(s) || /^[0-9-]/.test(s) || s === "";
}

function quote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function emitScalar(v) {
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  const s = String(v);
  return needsQuoting(s) ? quote(s) : s;
}

function emitSignedNumber(n) {
  return n > 0 ? `+${n}` : String(n);
}

function stringifyYaml(obj) {
  const lines = [];
  const keys = FIELD_ORDER.filter((k) => k in obj).concat(
    Object.keys(obj).filter((k) => !FIELD_ORDER.includes(k))
  );
  for (const key of keys) {
    const v = obj[key];
    if (v === undefined || v === null) continue;
    if (key === "axis_effects" && typeof v === "object") {
      lines.push("axis_effects:");
      for (const axisId of Object.keys(v)) {
        lines.push(`  ${axisId}: ${emitSignedNumber(Number(v[axisId]))}`);
      }
      continue;
    }
    lines.push(`${key}: ${emitScalar(v)}`);
  }
  return lines.join("\n") + "\n";
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === "") return "";
  if (s === "true") return true;
  if (s === "false") return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\\\/g, "\\").replace(/\\"/g, '"');
  }
  if (/^[+-]?\d+$/.test(s)) return Number(s);
  if (/^[+-]?\d+\.\d+$/.test(s)) return Number(s);
  return s;
}

function parseYaml(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*(#.*)?$/.test(line)) {
      i++;
      continue;
    }
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const [, key, rest] = m;
    const stripped = rest.replace(/\s+#.*$/, "").trim();
    if (stripped === "") {
      const nested = {};
      i++;
      while (i < lines.length) {
        const sub = lines[i];
        if (/^\s*(#.*)?$/.test(sub)) {
          i++;
          continue;
        }
        const subM = sub.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)$/);
        if (!subM) break;
        nested[subM[2]] = parseScalar(subM[3].replace(/\s+#.*$/, ""));
        i++;
      }
      out[key] = nested;
    } else {
      out[key] = parseScalar(stripped);
      i++;
    }
  }
  return out;
}

function questionFingerprint(q) {
  return JSON.stringify({
    name: q.name,
    description: q.description,
    purpose: q.purpose,
    stage: q.stage ?? null,
    axis_effects: q.axis_effects || {},
  });
}

function readOpeners() {
  try {
    const raw = JSON.parse(fs.readFileSync(OPENERS_PATH, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function scanYamlEntries(dir, subdir = "") {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "_index.json") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // _runtime holds per-session planner/thread-follow artifacts — run
      // records, not pool material; keep them out of the rebuilt index.
      if (e.name === "_archive" || e.name === "_runtime") continue;
      out.push(...scanYamlEntries(full, subdir ? `${subdir}/${e.name}` : e.name));
    } else if (e.name.endsWith(".yaml")) {
      out.push({ alias: e.name.replace(/\.yaml$/, ""), subdir });
    }
  }
  return out;
}

function readIndex() {
  try {
    const doc = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
    if (Array.isArray(doc.aliases)) return doc;
  } catch {}
  return null;
}

function writeIndex(entries) {
  const aliases = entries.map((e) => e.alias).sort();
  const doc = {
    generated_at: new Date().toISOString(),
    count: aliases.length,
    aliases,
    entries: entries.sort((a, b) => a.alias.localeCompare(b.alias)),
  };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(doc, null, 2) + "\n");
  return doc;
}

function rebuildQuestionIndex() {
  const entries = scanYamlEntries(QUESTIONS_ROOT);
  for (const o of readOpeners()) {
    if (o?.alias) entries.push({ alias: o.alias, subdir: "_openers.json", kind: "opener" });
  }
  return writeIndex(entries);
}

function registerAlias(alias, { subdir = "" } = {}) {
  const index = readIndex();
  if (!index) return rebuildQuestionIndex();
  if (index.aliases.includes(alias)) return index;
  index.aliases.push(alias);
  index.aliases.sort();
  index.entries.push({ alias, subdir });
  index.entries.sort((a, b) => a.alias.localeCompare(b.alias));
  index.count = index.aliases.length;
  index.generated_at = new Date().toISOString();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
  return index;
}

// -----------------------------------------------------------------------------
// Alias + file IO
// -----------------------------------------------------------------------------

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function newAlias(baseLabel, existing = new Set()) {
  const base = "q_" + (slugify(baseLabel) || "unnamed");
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function questionPath(alias, subdir = "") {
  const dir = subdir ? path.join(QUESTIONS_ROOT, subdir) : QUESTIONS_ROOT;
  return path.join(dir, `${alias}.yaml`);
}

function saveQuestion(q, { subdir = "" } = {}) {
  const dir = subdir ? path.join(QUESTIONS_ROOT, subdir) : QUESTIONS_ROOT;
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, `${q.alias}.yaml`), stringifyYaml(q));
  registerAlias(q.alias, { subdir });
  return q.alias;
}

function loadQuestion(alias, { subdir = "" } = {}) {
  return parseYaml(fs.readFileSync(questionPath(alias, subdir), "utf8"));
}

function loadDir(subdir) {
  const dir = path.join(QUESTIONS_ROOT, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => parseYaml(fs.readFileSync(path.join(dir, f), "utf8")));
}

function listAliases(subdir = "") {
  const dir = subdir ? path.join(QUESTIONS_ROOT, subdir) : QUESTIONS_ROOT;
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).map((f) => f.replace(/\.yaml$/, ""))
  );
}

function listAllAliases() {
  const index = readIndex();
  if (index) return new Set(index.aliases);
  return listAllAliasesScan();
}

function listAllAliasesScan() {
  const set = new Set();
  for (const a of listAliases()) set.add(a);
  if (fs.existsSync(QUESTIONS_ROOT)) {
    for (const entry of fs.readdirSync(QUESTIONS_ROOT, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        for (const a of listAliases(entry.name)) set.add(a);
      }
    }
  }
  for (const o of readOpeners()) {
    if (o?.alias) set.add(o.alias);
  }
  return set;
}

module.exports = {
  QUESTIONS_ROOT,
  INDEX_PATH,
  stringifyYaml,
  parseYaml,
  questionFingerprint,
  newAlias,
  slugify,
  saveQuestion,
  loadQuestion,
  loadDir,
  listAliases,
  listAllAliases,
  rebuildQuestionIndex,
  registerAlias,
};
