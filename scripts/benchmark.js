#!/usr/bin/env node
// Phase-0 benchmark: render a PREP-FIRST, human-judged verdict form per run.
// Reuses existing tooling; makes NO engine changes. AI judge is OPTIONAL and is
// only an assistant — Carl's pass/fail is the verdict.
//
// Run: node scripts/benchmark.js <sessionDir> [<sessionDir> ...] [--label baseline] [--judge]
//      node scripts/benchmark.js --manifest <file.json> [--judge]
//
// Output: logs/benchmark/<label>/<id>.md  (one reviewable page per run) + index.md

const fs = require("node:fs");
const path = require("node:path");
const { loadEnv } = require("../backend/engine/env.ts");
loadEnv();

const { getArc } = require("../backend/engine/one-on-one-types");
const { validateBrief } = require("../backend/engine/preparation");
const { resolveSelectedFocus } = require("../backend/engine/selected-focus.ts");
const { isSameStagePlannerDrill } = require("../backend/engine/queue-manager");
const { stageCoverageSummary } = require("./eval-judge");
const { isYesNoDeadEnd, isPresupposed, isMultiProbe, isTrustRisk } = require("./lint-bank");

const ROOT = path.join(__dirname, "..");

function loadJson(p, fb = null) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }

// Heuristic trust-boundary check: pull "private-ish" assertions the manager made
// in the notes, and flag if any served question/brief text states them directly.
// Conservative — complements (does not replace) the AI judge + the prompt-side rules.
const PRIVATE_MARKERS = [
  /\bworried\b/i, /\bconcern(ed)?\b/i, /\bborderline\b/i, /\bunderperform/i, /\btoo (low|slow|junior)\b/i,
  /\bburn(t|ed)? ?out\b/i, /\bpip\b/i, /\bpromotion?\b/i, /\bbeing considered\b/i, /\bnot good enough\b/i,
  /\bperformance is\b/i, /\blet (them|him|her) go\b/i,
];
function extractPrivatePhrases(notes) {
  const out = [];
  for (const re of PRIVATE_MARKERS) { const m = String(notes || "").match(re); if (m) out.push(m[0].toLowerCase()); }
  return [...new Set(out)];
}
function trustCheck(notes, servedTexts) {
  const phrases = extractPrivatePhrases(notes);
  const hits = [];
  for (const p of phrases) {
    for (const t of servedTexts) { if (String(t || "").toLowerCase().includes(p)) { hits.push({ phrase: p, text: t }); break; } }
  }
  return { privatePhrases: phrases, leaks: hits, pass: hits.length === 0 };
}

function bullets(arr) { return (arr || []).map((x) => `  - ${typeof x === "string" ? x : x?.action || JSON.stringify(x)}`).join("\n") || "  - (none)"; }

// Classify each turn as "arc" (advances/serves the planned arc) vs "deeper"
// (the engine chose to drill on the just-given answer). Mirrors the engine's own
// definitions in src/queue-manager.js — does not re-judge, just reads the signals.
// Deeper when ANY of: off-arc excursion (stage null — see computeOffArcDrillCount),
// runtime thread-follow (mirrors isRuntimeThreadFollow), or a planner drill at a
// stage already opened earlier in the transcript (isSameStagePlannerDrill).
function classifyArcKinds(transcript) {
  const seenStages = new Set();
  return (transcript || []).map((t) => {
    const q = t?.question || {};
    const stage = q.stage ?? null;
    const hasStage = stage != null && stage !== "";
    const firstOfStage = hasStage && !seenStages.has(stage);
    if (hasStage) seenStages.add(stage);
    const offArc = !hasStage;
    const runtimeThreadFollow = q.source === "planner_added" && q.label === "Thread follow";
    const sameStageDrill = !firstOfStage && isSameStagePlannerDrill(q, stage);
    return offArc || runtimeThreadFollow || sameStageDrill ? "deeper" : "arc";
  });
}

function renderRun({ dir, scenario, brief, prepIssues, transcript, arc, coverage, servedLint, briefing, trust, judge }) {
  const kinds = classifyArcKinds(transcript);
  const L = [];
  L.push(`# Verdict — ${scenario.name} · ${scenario.role} · ${scenario.seniority} · ${scenario.meeting_type}`);
  L.push(`Run: \`${path.relative(ROOT, dir)}\``);
  L.push("");
  L.push("## Sparse input (all the manager gave Sero)");
  L.push(`> ${scenario.manager_notes || "(none)"}`);
  L.push("");
  L.push("## PREP BRIEF — the primary value");
  L.push(`**Core issue:** ${brief.coreIssue || "(missing)"}`);
  L.push(`**Opening question:** ${brief.openingQuestion || "(missing)"}`);
  L.push(`**Listen for:**\n${bullets(brief.listenFor)}`);
  L.push(`**Avoid:**\n${bullets(brief.avoid)}`);
  L.push(`**Good outcome:** ${brief.goodOutcome || "(missing)"}`);
  L.push(`**Suggested action:** ${brief.suggestedAction || "(missing)"}`);
  L.push("");
  L.push(`_Deterministic prep checks (validateBrief):_ ${prepIssues.length ? prepIssues.map((i) => `\`${i}\``).join("; ") : "no issues"}`);
  L.push("");
  L.push("## Questions asked (arc)");
  L.push("| # | stage | on-arc? | question |");
  L.push("|---|---|---|---|");
  (transcript || []).forEach((t, i) => L.push(`| ${i + 1} | ${t?.question?.stage || "—"} | ${kinds[i] === "deeper" ? "deeper" : "on-arc"} | ${(t?.question?.name || "").replace(/\|/g, "\\|")} |`));
  const expected = arc.arc.map((s) => s.id);
  L.push("");
  L.push(`_Arc fidelity:_ covered ${coverage.matched_count}/${coverage.expected_count} stages (expected: ${expected.join(" → ")}; missing: ${coverage.missing_stage_ids.join(", ") || "none"})`);
  L.push(`_Served-question lint:_ yes/no ${servedLint.yesno}, presupposed ${servedLint.presup}, multi-probe ${servedLint.multi}, trust-risk ${servedLint.trust}`);
  L.push("");
  L.push("## Final briefing");
  L.push(`**Headline:** ${briefing?.headline || "(none)"}`);
  L.push(`**Next actions:**\n${bullets((briefing?.next_actions || []).map((a) => `${a.when ? a.when + ": " : ""}${a.action || a}`))}`);
  L.push("");
  L.push("## Trust boundary");
  L.push(`Private phrases in notes: ${trust.privatePhrases.length ? trust.privatePhrases.map((p) => `\`${p}\``).join(", ") : "(none detected)"}`);
  L.push(`Heuristic leakage: ${trust.pass ? "**PASS** (no private phrase stated in served output)" : "**FLAG** — " + trust.leaks.map((h) => `"${h.phrase}" → ${h.text.slice(0, 60)}`).join("; ")}`);
  L.push("");
  if (judge) {
    L.push("## AI judge — assistant summary (NOT the verdict)");
    L.push(`score ${judge.score}/5 · tier ${judge.verdict_tier} · arc_coverage: ${judge.arc_coverage}`);
    L.push(`tone_fit: ${judge.tone_fit}`);
    L.push(`evidence: ${judge.evidence}`);
    if (judge.flags?.length) L.push(`flags: ${judge.flags.map((f) => `\`${f}\``).join("; ")}`);
    L.push("");
  }
  L.push("## CARL'S VERDICT — you decide (pass/fail per dimension)");
  L.push("| Dimension | Pass/Fail | Note |");
  L.push("|---|---|---|");
  const dims = [
    "Role / seniority / meeting awareness (prep)",
    "Groundedness / no over-inference (prep)",
    "Usefulness & brevity (prep)",
    "Trust boundary (no private leak)",
    "Arc fidelity (right arc for type)",
    "Contextual adaptation (to person/answers)",
    "Next-question usefulness",
    "Final-briefing evidence quality",
  ];
  dims.forEach((d) => L.push(`| ${d} |  | |`));
  L.push("");
  L.push("---");
  return L.join("\n");
}

async function processRun(dir, judgeOn, suggestOn) {
  const ss = loadJson(path.join(dir, "session-state.json"), {});
  const ctx = ss.ctx || {};
  const scenario = { name: ctx.name, role: ctx.role, seniority: ctx.seniority, meeting_type: ctx.meetingType, manager_notes: ctx.notes };
  const prepRaw = loadJson(path.join(dir, "01b-preparation/response.json"), {});
  const brief = prepRaw.brief || prepRaw || {};
  const transcript = loadJson(path.join(dir, "transcript.json"), []);
  const briefing = loadJson(path.join(dir, "05-evaluation/response.json"), null);
  const arc = getArc(scenario.meeting_type);

  const focusPoints = ss.focusPointsResult?.focus_points || [];
  const selectedFocus = resolveSelectedFocus({ notes: ctx.notes, observedShift: ctx.notes, focusPoints });
  const inputs = { name: ctx.name, roleTitle: ctx.role, seniority: ctx.seniority, meetingType: ctx.meetingType, observedShift: ctx.notes || "", focusPoints, selectedFocus, primaryFocusId: selectedFocus?.id };
  const { issues: prepIssues } = validateBrief(brief, inputs);

  const bankQuestions = (transcript || []).map((t) => t.question).filter(Boolean);
  const coverage = stageCoverageSummary(arc.arc, bankQuestions);

  const names = (transcript || []).map((t) => t?.question?.name || "");
  const servedLint = {
    yesno: names.filter(isYesNoDeadEnd).length,
    presup: names.filter(isPresupposed).length,
    multi: names.filter(isMultiProbe).length,
    trust: names.filter(isTrustRisk).length,
  };

  const servedTexts = [...names, brief.openingQuestion, brief.coreIssue, brief.goodOutcome, brief.suggestedAction, ...(brief.listenFor || []), briefing?.headline, ...((briefing?.summary_bullets) || [])];
  const trust = trustCheck(ctx.notes, servedTexts);

  let judge = null;
  if (judgeOn) {
    try { judge = await require("./eval-judge").judgeSession({ sessionDir: dir, scenario }); }
    catch (e) { judge = { score: "?", verdict_tier: "error", arc_coverage: "", tone_fit: "", evidence: "judge error: " + e.message, flags: [] }; }
  }

  const id = path.basename(dir);
  const md = renderRun({ id, dir, scenario, brief, prepIssues, transcript, arc, coverage, servedLint, briefing, trust, judge });
  let suggest = null;
  const data = {
    id,
    name: scenario.name, role: scenario.role, seniority: scenario.seniority, meeting: scenario.meeting_type,
    notes: scenario.manager_notes,
    brief: {
      coreIssue: brief.coreIssue, openingQuestion: brief.openingQuestion,
      listenFor: brief.listenFor || [], avoid: brief.avoid || [],
      goodOutcome: brief.goodOutcome, suggestedAction: brief.suggestedAction,
    },
    prepIssues,
    questions: (() => { const kinds = classifyArcKinds(transcript); return (transcript || []).map((t, i) => ({ turn: i + 1, stage: t?.question?.stage || "", kind: kinds[i], name: t?.question?.name || "", note: t?.answer || "" })); })(),
    arc: { expected: arc.arc.map((s) => s.id), covered: coverage.matched_count, total: coverage.expected_count, missing: coverage.missing_stage_ids },
    servedLint,
    briefing: briefing ? { headline: briefing.headline, next_actions: (briefing.next_actions || []).map((a) => ({ when: a.when, action: a.action })) } : null,
    trust: { pass: trust.pass, privatePhrases: trust.privatePhrases, leaks: trust.leaks },
    judge,
  };
  if (suggestOn) {
    try { suggest = await require("./suggest-judge").judgeDimensions(data); }
    catch (e) { console.error(`suggest failed for ${id}: ${e.message}`); }
    data.suggest = suggest;
  }
  return { id, scenario, prepIssues, coverage, servedLint, trust, judge, md, data };
}

function writeHtml(outDir, rows) {
  const tplPath = path.join(__dirname, "verdict-template.html");
  const tpl = fs.readFileSync(tplPath, "utf8");
  const json = JSON.stringify(rows.map((r) => r.data)).replace(/</g, "\\u003c");
  const html = tpl.replace("/*__RUNS__*/[]", json);
  const outFile = path.join(outDir, "verdict.html");
  fs.writeFileSync(outFile, html);
  return outFile;
}

async function main() {
  const args = process.argv.slice(2);
  const judgeOn = args.includes("--judge");
  const suggestOn = args.includes("--suggest");
  let label = "baseline";
  const li = args.indexOf("--label"); if (li >= 0) label = args[li + 1];
  let dirs = [];
  const mi = args.indexOf("--manifest");
  if (mi >= 0) dirs = loadJson(args[mi + 1], []).map((x) => (typeof x === "string" ? x : x.sessionDir));
  else dirs = args.filter((a) => !a.startsWith("--") && a !== label);

  if (!dirs.length) { console.error("Usage: node scripts/benchmark.js <sessionDir>... [--label L] [--judge]"); process.exit(2); }

  const outDir = path.join(ROOT, "logs", "benchmark", label);
  fs.mkdirSync(outDir, { recursive: true });

  const rows = [];
  for (const d of dirs) {
    const abs = path.isAbsolute(d) ? d : path.join(ROOT, d);
    if (!fs.existsSync(path.join(abs, "session-state.json"))) { console.error(`skip (no session-state): ${d}`); continue; }
    const r = await processRun(abs, judgeOn, suggestOn);
    fs.writeFileSync(path.join(outDir, `${r.id}.md`), r.md);
    rows.push(r);
    console.error(`rendered ${r.id} — ${r.scenario.name} (${r.scenario.meeting_type})`);
  }

  const idx = ["# Phase-0 benchmark — verdict forms", `Label: \`${label}\` · ${rows.length} runs · prep-first, human-judged`, "", "| Run | Persona | Meeting | Prep issues | Arc | Served lint (yn/pre/multi) | Trust | AI |", "|---|---|---|---|---|---|---|---|"];
  for (const r of rows) {
    idx.push(`| [${r.id}](${r.id}.md) | ${r.scenario.name} | ${r.scenario.meeting_type} | ${r.prepIssues.length} | ${r.coverage.matched_count}/${r.coverage.expected_count} | ${r.servedLint.yesno}/${r.servedLint.presup}/${r.servedLint.multi} | ${r.trust.pass ? "ok" : "FLAG"} | ${r.judge ? r.judge.score + "/5" : "—"} |`);
  }
  idx.push("", "_AI scores are assistant-only. Fill each run's CARL'S VERDICT table by hand._");
  fs.writeFileSync(path.join(outDir, "index.md"), idx.join("\n"));
  const htmlFile = writeHtml(outDir, rows);
  console.error(`\nwrote ${rows.length} verdict pages + index to ${path.relative(ROOT, outDir)}/`);
  console.error(`interactive review app: ${path.relative(ROOT, htmlFile)}  (double-click to open)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
