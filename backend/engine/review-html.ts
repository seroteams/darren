// Generates self-contained, static review.html pages from a run's log files,
// plus a logs/index.html gallery linking to all runs.
//
// Design goals for v1: static (no JS, no external assets, double-clickable),
// boring, readable, and regression-focused — every loader tolerates missing or
// malformed files, every interpolated value is HTML-escaped, and a run that
// never finished still renders a useful page instead of crashing.

import fs from "node:fs";
import path from "node:path";
import { LOGS_ROOT } from "./session.ts";
import { buildHeadline } from "./run-history.ts";

const SKIP_MONTH_DIRS = new Set(["probes", "sweeps"]);

// Disk JSON is unknown until checked — narrow with these instead of trusting shapes.
function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

interface LoadedRun {
  dir: string;
  id: string;
  state: Record<string, unknown>;
  ctx: Record<string, unknown>;
  briefing: Record<string, unknown> | null;
  transcript: unknown[];
  axis: Record<string, unknown> | null;
  notes: unknown[];
  notesMd: string | null;
  stages: Array<{ name: string; response: unknown }>;
}

interface Quality {
  completed: boolean;
  status: string;
  turns: number;
  stageCount: number;
  noteCount: number;
  cost: Record<string, unknown> | null;
  warnings: string[];
}

interface IndexCard {
  sortKey: number;
  html: string;
}

// ---------------------------------------------------------------------------
// Strict escaping
// ---------------------------------------------------------------------------

function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Tolerant loaders — never throw, always return a usable shape
// ---------------------------------------------------------------------------

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readText(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function listStages(dir: string): Array<{ name: string; response: unknown }> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && /^\d/.test(e.name))
    .map((e) => e.name)
    .sort()
    .map((name) => ({
      name,
      response: readJson(path.join(dir, name, "response.json")),
    }));
}

function loadRun(dir: string): LoadedRun {
  const state = asRecord(readJson(path.join(dir, "session-state.json")));
  const transcript = readJson(path.join(dir, "transcript.json"));
  const axis = readJson(path.join(dir, "axis-state.json"));
  const notesMd = readText(path.join(dir, "notes.md"));
  return {
    dir,
    id: asString(state.id) || path.basename(dir),
    state,
    ctx: asRecord(state.ctx),
    briefing: isObjectRecord(state.briefing) ? state.briefing : null,
    transcript: Array.isArray(transcript) ? transcript : [],
    axis: isObjectRecord(axis) ? axis : null,
    notes: Array.isArray(state.notes) ? state.notes : [],
    notesMd,
    stages: listStages(dir),
  };
}

// ---------------------------------------------------------------------------
// Small formatting helpers
// ---------------------------------------------------------------------------

function fmtDate(ms: unknown): string {
  if (!ms) return "";
  if (typeof ms !== "number" && typeof ms !== "string") return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function fmtDuration(createdAt: unknown, completedAt: unknown): string {
  if (typeof createdAt !== "number" || typeof completedAt !== "number") return "";
  if (!createdAt || !completedAt || completedAt < createdAt) return "";
  const mins = Math.round((completedAt - createdAt) / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function signClass(n: unknown): string {
  if (typeof n !== "number" || n === 0) return "zero";
  return n > 0 ? "pos" : "neg";
}

function signed(n: unknown): string {
  if (typeof n !== "number") return "";
  return n > 0 ? `+${n}` : String(n);
}

const AXIS_ORDER = ["wellbeing", "engagement", "clarity", "growth"];

// ---------------------------------------------------------------------------
// Run-quality assessment (regression-focused)
// ---------------------------------------------------------------------------

function assessQuality(run: LoadedRun): Quality {
  const warnings: string[] = [];
  if (!run.state || !run.state.id) warnings.push("session-state.json missing or unreadable");
  if (run.transcript.length === 0) warnings.push("transcript is empty or missing");
  if (!run.axis) warnings.push("axis-state.json missing or unreadable");
  if (!run.briefing) warnings.push("no briefing — run did not reach evaluation");
  if (run.stages.length === 0) warnings.push("no stage folders found");

  const completed = Boolean(run.state.completedAt);
  return {
    completed,
    status: completed ? "Completed" : "Incomplete",
    turns: run.transcript.length,
    stageCount: run.stages.length,
    noteCount: run.notes.length,
    cost: run.briefing && run.briefing.cost ? asRecord(run.briefing.cost) : null,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Shared CSS — static, boring, readable
// ---------------------------------------------------------------------------

const STYLE = `
:root {
  --bg: #f7f7f5; --card: #ffffff; --ink: #1a1a1a; --muted: #6b6b6b;
  --line: #e3e3df; --pos: #1f7a4d; --neg: #b23b3b; --zero: #8a8a8a;
  --accent: #2b2b2b; --warn-bg: #fff4e5; --warn-ink: #8a5300;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.wrap { max-width: 820px; margin: 0 auto; padding: 40px 24px 80px; }
a { color: inherit; }
h1 { font-size: 26px; margin: 0 0 4px; letter-spacing: -0.01em; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 36px 0 12px; }
.sub { color: var(--muted); font-size: 14px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; margin: 0 0 12px; }
.row { display: flex; flex-wrap: wrap; gap: 8px 18px; }
.kv { font-size: 13px; color: var(--muted); }
.kv b { color: var(--ink); font-weight: 600; }
.chip { display: inline-block; min-width: 34px; text-align: center; padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 13px; }
.chip.pos { background: #e6f4ec; color: var(--pos); }
.chip.neg { background: #fce9e9; color: var(--neg); }
.chip.zero { background: #efefef; color: var(--zero); }
.axis { display: grid; grid-template-columns: 110px 48px 1fr; gap: 8px 12px; align-items: start; padding: 8px 0; border-top: 1px solid var(--line); }
.axis:first-child { border-top: none; }
.axis .name { font-weight: 600; text-transform: capitalize; }
.axis .meaning { color: var(--muted); font-size: 14px; }
.turn { border-top: 1px solid var(--line); padding: 14px 0; }
.turn:first-child { border-top: none; }
.turn .q { font-weight: 600; }
.turn .a { margin: 6px 0; white-space: pre-wrap; }
.turn .meta { font-size: 12px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; }
.turn .note { font-size: 13px; color: var(--muted); border-left: 2px solid var(--line); padding-left: 10px; margin-top: 6px; }
.skip { color: var(--neg); font-weight: 600; }
ul.clean { margin: 6px 0; padding-left: 18px; }
ul.clean li { margin: 4px 0; }
.truth { white-space: pre-wrap; }
.warn { background: var(--warn-bg); color: var(--warn-ink); border: 1px solid #f0d9b5; border-radius: 8px; padding: 10px 14px; font-size: 14px; }
.warn ul { margin: 6px 0 0; padding-left: 18px; }
details { margin: 8px 0; }
summary { cursor: pointer; font-weight: 600; font-size: 14px; }
pre { background: #fafafa; border: 1px solid var(--line); border-radius: 8px; padding: 12px; overflow: auto; font-size: 12px; line-height: 1.45; }
.action { display: grid; grid-template-columns: 90px 1fr; gap: 4px 12px; padding: 6px 0; border-top: 1px solid var(--line); }
.action:first-child { border-top: none; }
.action .when { font-weight: 600; text-transform: capitalize; font-size: 13px; }
.foot { color: var(--muted); font-size: 12px; margin-top: 48px; }
/* index gallery */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.runcard { display: block; text-decoration: none; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
.runcard:hover { border-color: #c9c9c4; }
.runcard .title { font-weight: 600; margin-bottom: 2px; }
.runcard .when { color: var(--muted); font-size: 12px; }
.runcard .axes { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
.runcard .tag { font-size: 11px; color: var(--muted); margin-top: 8px; }
`;

function page(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
${bodyHtml}
<p class="foot">Static review — generated from log files. No live data.</p>
</div>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Per-run review.html
// ---------------------------------------------------------------------------

function renderQuality(q: Quality): string {
  const bits = [
    `<span class="kv">Status: <b>${esc(q.status)}</b></span>`,
    `<span class="kv">Turns: <b>${q.turns}</b></span>`,
    `<span class="kv">Stages: <b>${q.stageCount}</b></span>`,
    `<span class="kv">Notes: <b>${q.noteCount}</b></span>`,
  ];
  if (q.cost && typeof q.cost.usd_total === "number") {
    bits.push(`<span class="kv">Cost: <b>$${q.cost.usd_total.toFixed(4)}</b> (${esc(q.cost.call_count)} calls)</span>`);
  }
  let warn = "";
  if (q.warnings.length) {
    warn = `<div class="warn">Data issues:<ul>${q.warnings
      .map((w) => `<li>${esc(w)}</li>`)
      .join("")}</ul></div>`;
  }
  return `<h2>Run quality</h2>
<div class="card"><div class="row">${bits.join("")}</div>${warn}</div>`;
}

function renderBriefing(b: Record<string, unknown> | null): string {
  if (!b) {
    return `<h2>Verdict</h2><div class="card"><span class="sub">No briefing — this run did not reach the evaluation stage.</span></div>`;
  }
  const parts: string[] = [];
  if (b.headline) parts.push(`<p style="font-weight:600;font-size:17px;margin:0 0 10px">${esc(b.headline)}</p>`);
  if (Array.isArray(b.summary_bullets) && b.summary_bullets.length) {
    parts.push(`<ul class="clean">${b.summary_bullets.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`);
  }
  if (b.understanding_paragraph) parts.push(`<p class="sub">${esc(b.understanding_paragraph)}</p>`);
  const card = `<div class="card">${parts.join("")}</div>`;

  let truths = "";
  if (b.brutal_truth_manager || b.brutal_truth_employee) {
    truths = `<div class="card">
${b.brutal_truth_manager ? `<div class="kv"><b>For the manager</b></div><p class="truth">${esc(b.brutal_truth_manager)}</p>` : ""}
${b.brutal_truth_employee ? `<div class="kv" style="margin-top:10px"><b>For the report</b></div><p class="truth">${esc(b.brutal_truth_employee)}</p>` : ""}
</div>`;
  }

  let actions = "";
  if (Array.isArray(b.next_actions) && b.next_actions.length) {
    actions = `<h2>Next actions</h2><div class="card">${b.next_actions
      .map((a) => `<div class="action"><div class="when">${esc(a.when)}</div><div>${esc(a.action)}</div></div>`)
      .join("")}</div>`;
  }

  let watch = "";
  if (Array.isArray(b.watch_for) && b.watch_for.length) {
    watch = `<h2>Watch for</h2><div class="card"><ul class="clean">${b.watch_for
      .map((x) => `<li>${esc(x)}</li>`)
      .join("")}</ul></div>`;
  }

  return `<h2>Verdict</h2>${card}${truths}${actions}${watch}`;
}

function renderAxes(run: LoadedRun): string {
  // Prefer the briefing's axes (has human "meaning"); fall back to axis-state scores.
  const briefingAxes = run.briefing && Array.isArray(run.briefing.axes) ? run.briefing.axes : null;
  let rows = "";
  if (briefingAxes) {
    rows = briefingAxes
      .map(
        (a) => `<div class="axis"><div class="name">${esc(a.id)}</div>
<div><span class="chip ${signClass(a.score)}">${signed(a.score)}</span></div>
<div class="meaning">${esc(a.meaning)}</div></div>`
      )
      .join("");
  } else if (run.axis) {
    const axisObj = run.axis;
    rows = AXIS_ORDER.filter((k) => axisObj[k])
      .map((k) => {
        const a = asRecord(axisObj[k]);
        const hist = Array.isArray(a.history) ? a.history.length : 0;
        return `<div class="axis"><div class="name">${esc(k)}</div>
<div><span class="chip ${signClass(a.score)}">${signed(a.score)}</span></div>
<div class="meaning">${hist} signal${hist === 1 ? "" : "s"} recorded</div></div>`;
      })
      .join("");
  }
  if (!rows) return "";
  return `<h2>Axis scores</h2><div class="card">${rows}</div>`;
}

function renderTranscript(run: LoadedRun): string {
  if (run.transcript.length === 0) {
    return `<h2>Transcript</h2><div class="card"><span class="sub">No transcript recorded.</span></div>`;
  }
  const turns = run.transcript
    .map((entry) => {
      const t = asRecord(entry);
      const q = asRecord(t.question);
      const deltas = asRecord(t.realized_deltas);
      const deltaChips = Object.keys(deltas)
        .map((k) => `<span class="chip ${signClass(deltas[k])}" title="${esc(k)}">${esc(k.slice(0, 4))} ${signed(deltas[k])}</span>`)
        .join(" ");
      const purpose = q.purpose ? `<span>${esc(q.purpose)}</span>` : "";
      return `<div class="turn">
<div class="q">${esc(t.turn)}. ${esc(q.name || q.label || "(question)")}</div>
<div class="a">${t.skipped ? '<span class="skip">Skipped</span>' : esc(t.answer || "(no answer)")}</div>
<div class="meta">${purpose}${deltaChips}</div>
${t.note ? `<div class="note">${esc(t.note)}</div>` : ""}
</div>`;
    })
    .join("");
  return `<h2>Transcript</h2><div class="card">${turns}</div>`;
}

function renderNotes(run: LoadedRun): string {
  if (run.notes.length) {
    const items = run.notes
      .map((note) => {
        const n = asRecord(note);
        const when = n.ts ? fmtDate(n.ts) : "";
        const stem = n.question_stem ? `<div class="note">${esc(n.question_stem)}</div>` : "";
        return `<div class="turn"><div class="meta">${esc(n.stage || "")} ${esc(when)}</div><div class="a">${esc(n.text)}</div>${stem}</div>`;
      })
      .join("");
    return `<h2>Notes captured</h2><div class="card">${items}</div>`;
  }
  if (run.notesMd && run.notesMd.trim()) {
    return `<h2>Notes captured</h2><div class="card"><pre>${esc(run.notesMd)}</pre></div>`;
  }
  return "";
}

function renderStages(run: LoadedRun): string {
  if (!run.stages.length) return "";
  const blocks = run.stages
    .map((s) => {
      const json = s.response ? JSON.stringify(s.response, null, 2) : "(no response.json or unreadable)";
      return `<details><summary>${esc(s.name)}</summary><pre>${esc(json)}</pre></details>`;
    })
    .join("");
  return `<h2>Stage outputs</h2><div class="card">${blocks}</div>`;
}

function buildReviewHtml(run: LoadedRun): string {
  const q = assessQuality(run);
  const headline = buildHeadline(run.ctx) || run.id;
  const created = fmtDate(run.state.createdAt);
  const duration = fmtDuration(run.state.createdAt, run.state.completedAt);
  const meta = [
    created ? `<span class="kv">${esc(created)}</span>` : "",
    duration ? `<span class="kv">${esc(duration)}</span>` : "",
    `<span class="kv">${esc(run.id)}</span>`,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = `<h1>${esc(headline)}</h1>
<div class="sub">${meta}</div>
${renderQuality(q)}
${renderBriefing(run.briefing)}
${renderAxes(run)}
${renderTranscript(run)}
${renderNotes(run)}
${renderStages(run)}`;

  return page(`Review · ${headline}`, body);
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

function writeReviewHtml(dir: string): string {
  const run = loadRun(dir);
  const html = buildReviewHtml(run);
  const out = path.join(dir, "review.html");
  fs.writeFileSync(out, html);
  return out;
}

function walkRunDirs(): Array<{ dir: string; month: string; id: string }> {
  const out: Array<{ dir: string; month: string; id: string }> = [];
  if (!fs.existsSync(LOGS_ROOT)) return out;
  for (const m of fs.readdirSync(LOGS_ROOT, { withFileTypes: true })) {
    if (!m.isDirectory() || SKIP_MONTH_DIRS.has(m.name)) continue;
    const monthDir = path.join(LOGS_ROOT, m.name);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(monthDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dir = path.join(monthDir, e.name);
      if (!fs.existsSync(path.join(dir, "session-state.json"))) continue;
      out.push({ dir, month: m.name, id: e.name });
    }
  }
  return out;
}

function buildIndexHtml(cards: IndexCard[]): string {
  const grid = cards.length
    ? `<div class="grid">${cards.map((c) => c.html).join("")}</div>`
    : `<div class="card"><span class="sub">No runs found.</span></div>`;
  return page("1:1 Run Library", `<h1>1:1 Run Library</h1>
<div class="sub">${cards.length} run${cards.length === 1 ? "" : "s"}</div>
<h2>Runs</h2>
${grid}`);
}

function indexCard(meta: { dir: string; month: string; id: string }): IndexCard {
  const run = loadRun(meta.dir);
  const q = assessQuality(run);
  const headline = buildHeadline(run.ctx) || run.id;
  const when = fmtDate(run.state.createdAt || run.state.lastSeenAt);
  const axes = run.briefing && Array.isArray(run.briefing.axes) ? run.briefing.axes : [];
  const axisChips = axes
    .map((a) => `<span class="chip ${signClass(a.score)}" title="${esc(a.id)}">${esc(a.id.slice(0, 4))} ${signed(a.score)}</span>`)
    .join(" ");
  const sortKey = asNumber(run.state.createdAt) || asNumber(run.state.lastSeenAt) || 0;
  const href = `${esc(meta.month)}/${esc(meta.id)}/review.html`;
  const tag = q.warnings.length
    ? `<div class="tag" style="color:var(--neg)">${q.status} · ${q.warnings.length} issue${q.warnings.length === 1 ? "" : "s"}</div>`
    : `<div class="tag">${q.status} · ${q.turns} turns · ${q.noteCount} notes</div>`;
  const html = `<a class="runcard" href="${href}">
<div class="title">${esc(headline)}</div>
<div class="when">${esc(when)}</div>
<div class="axes">${axisChips}</div>
${tag}
</a>`;
  return { sortKey, html };
}

function writeIndexHtml(): string {
  const cards = walkRunDirs()
    .map(indexCard)
    .sort((a, b) => b.sortKey - a.sortKey);
  const html = buildIndexHtml(cards);
  const out = path.join(LOGS_ROOT, "index.html");
  fs.writeFileSync(out, html);
  return out;
}

export {
  loadRun,
  buildReviewHtml,
  writeReviewHtml,
  buildIndexHtml,
  writeIndexHtml,
  walkRunDirs,
};
