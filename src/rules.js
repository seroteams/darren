const fs = require("node:fs");
const path = require("node:path");
const { parse: parseYaml } = require("yaml");

const ROOT = path.join(__dirname, "..");

function loadNotes(notesPath) {
  const full = path.isAbsolute(notesPath) ? notesPath : path.join(ROOT, notesPath);
  if (!fs.existsSync(full)) return { rules: [] };
  const doc = parseYaml(fs.readFileSync(full, "utf8"));
  return { path: full, rules: Array.isArray(doc?.rules) ? doc.rules : [] };
}

function getField(obj, dotted) {
  return String(dotted || "")
    .split(".")
    .reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function checkRule(rule, ctx) {
  const field = getField(ctx.output, rule.field);
  const text = field == null ? "" : Array.isArray(field) ? field.join(" ") : String(field);

  switch (rule.type) {
    case "regex_not": {
      const re = new RegExp(rule.pattern, "i");
      const pass = !re.test(text);
      return { id: rule.id, pass, reason: pass ? null : `matched banned pattern: ${rule.pattern}` };
    }
    case "length_range": {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const min = rule.min ?? 0;
      const max = rule.max ?? Infinity;
      const pass = words >= min && words <= max;
      return {
        id: rule.id,
        pass,
        reason: pass ? null : `word count ${words} outside ${min}–${max}`,
      };
    }
    case "count_range": {
      const arr = Array.isArray(field) ? field : [];
      const pass = arr.length >= (rule.min ?? 0) && arr.length <= (rule.max ?? Infinity);
      return {
        id: rule.id,
        pass,
        reason: pass ? null : `count ${arr.length} outside ${rule.min}–${rule.max}`,
      };
    }
    case "must_contain_any": {
      const lower = text.toLowerCase();
      const needles = (rule.terms || []).map((t) => String(t).toLowerCase());
      const pass = needles.some((n) => lower.includes(n));
      return {
        id: rule.id,
        pass,
        reason: pass ? null : `missing any of: ${needles.join(", ")}`,
      };
    }
    default:
      return { id: rule.id, pass: true, reason: null };
  }
}

function evaluateNotes(notesPath, ctx) {
  const { rules } = loadNotes(notesPath);
  return rules.map((rule) => checkRule(rule, ctx));
}

function summarizeResults(results) {
  const failed = results.filter((r) => !r.pass);
  return { ok: failed.length === 0, failed, total: results.length };
}

module.exports = { loadNotes, evaluateNotes, summarizeResults, checkRule };
