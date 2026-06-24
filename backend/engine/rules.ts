import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { CONTENT_DIR } from "./paths.mts";

interface Rule {
  id: string;
  field: string;
  type: string;
  pattern?: string;
  min?: number;
  max?: number;
  terms?: string[];
}

interface RuleContext {
  output: unknown;
}

interface RuleResult {
  id: string;
  pass: boolean;
  reason: string | null;
}

function loadNotes(notesPath: string): { path?: string; rules: Rule[] } {
  const full = path.isAbsolute(notesPath) ? notesPath : path.join(CONTENT_DIR, notesPath);
  if (!fs.existsSync(full)) return { rules: [] };
  const doc = parseYaml(fs.readFileSync(full, "utf8"));
  return { path: full, rules: Array.isArray(doc?.rules) ? doc.rules : [] };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && (typeof v === "object" || typeof v === "function");
}

function getField(obj: unknown, dotted: string): unknown {
  return String(dotted || "")
    .split(".")
    .reduce<unknown>((acc, key) => (isRecord(acc) ? acc[key] : acc), obj);
}

function checkRule(rule: Rule, ctx: RuleContext): RuleResult {
  const field = getField(ctx.output, rule.field);
  const text = field == null ? "" : Array.isArray(field) ? field.join(" ") : String(field);

  switch (rule.type) {
    case "regex_not": {
      const re = new RegExp(rule.pattern ?? "", "i");
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

function evaluateNotes(notesPath: string, ctx: RuleContext): RuleResult[] {
  const { rules } = loadNotes(notesPath);
  return rules.map((rule) => checkRule(rule, ctx));
}

function summarizeResults(results: RuleResult[]): { ok: boolean; failed: RuleResult[]; total: number } {
  const failed = results.filter((r) => !r.pass);
  return { ok: failed.length === 0, failed, total: results.length };
}

export { loadNotes, evaluateNotes, summarizeResults, checkRule };
