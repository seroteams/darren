const STAGE_LABEL = {
  FOCUS_POINTS: "Focus points",
  PREPARATION: "Preparation",
  BANK: "Question bank",
  QUESTIONING: "Questioning",
  EVAL: "Evaluation",
  BRIEFING: "Briefing",
  INTAKE: "Intake",
  ERROR: "Error",
};

const SMOKE_BY_MEETING = [
  { match: /bi-?weekly|check-?in/i, file: "scenarios/batch/lin-biweekly-checkin.json" },
  { match: /performance|feedback/i, file: "scenarios/batch/sarah-performance-feedback.json" },
  { match: /growth|career/i, file: "scenarios/batch/maria-growth-career-plan.json" },
  { match: /onboarding/i, file: "scenarios/batch/sam-onboarding-checkin.json" },
  { match: /something feels off|feels off/i, file: "scenarios/batch/james-something-feels-off.json" },
];

const DEFAULT_SMOKE = "scenarios/001-senior-backend-weekly.json";

function fmtDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return null;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function fmtTimeShort(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function durationFromCost(cost) {
  const calls = cost?.calls;
  if (!Array.isArray(calls) || calls.length === 0) {
    return { ms: null, label: "—", callCount: 0 };
  }
  const first = Date.parse(calls[0].at);
  const last = Date.parse(calls[calls.length - 1].at);
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    return { ms: null, label: "—", callCount: calls.length };
  }
  const ms = Math.max(0, last - first);
  return { ms, label: fmtDuration(ms) || "—", callCount: calls.length };
}

function wallDuration(createdAt, completedAt) {
  if (!Number.isFinite(createdAt) || !Number.isFinite(completedAt)) {
    return { ms: null, label: "—" };
  }
  const ms = Math.max(0, completedAt - createdAt);
  return { ms, label: fmtDuration(ms) || "—" };
}

function relativeLogDir(sessionDir, sessionId) {
  if (sessionDir) {
    const norm = String(sessionDir).replace(/\\/g, "/");
    const idx = norm.toLowerCase().indexOf("/logs/");
    if (idx >= 0) return norm.slice(idx + 1);
    const logsIdx = norm.toLowerCase().indexOf("logs/");
    if (logsIdx >= 0) return norm.slice(logsIdx);
    return norm;
  }
  if (sessionId) {
    const m = /^\d{4}_([A-Z][a-z]{2})\d{2}_/.exec(sessionId);
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const short = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let month = "may";
    if (m) {
      const i = short.indexOf(m[1]);
      if (i >= 0) month = months[i];
    }
    return `logs/${month}/${sessionId}/`;
  }
  return "logs/";
}

function suggestSmokeScenario(meetingType) {
  const label = String(meetingType || "").trim();
  for (const row of SMOKE_BY_MEETING) {
    if (row.match.test(label)) return row.file;
  }
  return DEFAULT_SMOKE;
}

function folderTreeLines(relDir, surface = "web") {
  const root = relDir.endsWith("/") ? relDir : `${relDir}/`;
  const rootFiles =
    surface === "cli"
      ? ["transcript.json", "axis-state.json", "cost.json", "notes.md"]
      : ["transcript.json", "axis-state.json", "session-state.json", "notes.md"];
  const stages = [
    "01-focus-points/",
    "01b-preparation/",
    "02-intro-questions/",
    "03-question-bank/",
    "04-dynamic-answers/",
    "05-evaluation/",
  ];
  const allItems = [
    ...rootFiles.map((text) => ({ text, isStage: false })),
    ...stages.map((text) => ({ text, isStage: true })),
  ];
  const lines = allItems.map((item, i) => ({
    prefix: i === allItems.length - 1 ? "└" : "├",
    text: item.text,
    isStage: item.isStage,
  }));
  return { root, lines };
}

function formatDebriefNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes
    .filter((n) => String(n?.text || "").trim())
    .map((n) => {
      const ts = Number.isFinite(n?.ts) ? n.ts : Date.now();
      let stageLabel = STAGE_LABEL[n.stage] || n.stage || "—";
      if (n.stage === "QUESTIONING" && n.turn) {
        stageLabel = `${STAGE_LABEL.QUESTIONING} · Q${n.turn}`;
      }
      return {
        time: fmtTimeShort(ts),
        stageLabel,
        text: String(n.text || "").trim(),
        title: String(n.text || "").trim(),
      };
    });
}

const QA_REVIEW_INSTRUCTIONS = `Go.

Review this session as a prompt-engine QA pass, not as product strategy.

Use ONLY the loaded run evidence:
- focus points
- preparation output
- question bank
- transcript
- final evaluation
- my live testing notes and concerns

Goal:
Find prompt/engine fixes that make future Sero runs more realistic, grounded, and useful.

Pay special attention to these issues from the run:

1. Test input realism
The manager answers were too polished because ChatGPT helped generate them. Assume real managers type shorter, rougher, less complete notes. Identify where the prompts over-reward polished answers or fail when answers are sparse.

2. Skipped / weak answers
The final briefing said "Maya's answers were mostly skips" but still made strong claims. Fix this. Strong conclusions must reduce confidence when evidence is skipped, thin, or manager-supplied.

3. Evidence ownership
Separate:
- what Maya actually said
- what the manager inferred
- what Sero suggested
Do not claim Maya "named" or "proposed" something if it came from the manager input or Sero.

4. Briefing length
The final briefing is too long for a manager. Reduce by 30–40%. Keep only what helps the next action.

5. Tone
Remove harsh/internal wording:
- "forcing her"
- "checklist non-adoption"
- anything that sounds like prompt/system language
Use normal manager language.

6. Scores
Check whether wellbeing/engagement/clarity/growth scoring is useful here. If evidence is weak, prefer "not enough signal" over numeric-looking confidence.

Output format:

A. Confirmed issues from this run
Only list issues grounded in the run.

B. Prompt fixes
For each issue:
- file/stage likely affected
- exact rule to add/change
- why it fixes the issue

C. Engine/data fixes
Only include if prompt changes are not enough.

D. What NOT to change
Protect anything that worked well.

E. Final recommendation
Give me the smallest safe fix set for the next run.`;

function buildRunContextBlock({ ctx, payload, sessionDir }) {
  const lines = ["## Run context", ""];
  const name = String(ctx?.name || "").trim();
  const role = String(ctx?.role || "").trim();
  const seniority = String(ctx?.seniority || "").trim();
  const meetingType = String(ctx?.meetingType || "").trim();
  if (name) lines.push(`**Report:** ${name}`);
  if (role) lines.push(`**Role:** ${role}`);
  if (seniority) lines.push(`**Seniority:** ${seniority}`);
  if (meetingType) lines.push(`**Meeting type:** ${meetingType}`);
  if (payload.sessionId) lines.push(`**Session ID:** ${payload.sessionId}`);
  if (sessionDir) lines.push(`**Log folder (absolute):** ${sessionDir}`);
  if (payload.logDirCopy) lines.push(`**Log folder (relative):** ${payload.logDirCopy}`);
  if (payload.reviewrunTip) lines.push(`**Review command:** ${payload.reviewrunTip}`);
  lines.push("");
  lines.push("**Pipeline on disk:**");
  lines.push(payload.tree?.root || payload.logDir || "");
  for (const line of payload.tree?.lines || []) {
    lines.push(`${line.prefix} ${line.text}`);
  }
  lines.push("");
  const api = payload.apiDuration || {};
  const apiLine = `**API time:** ${api.label || "—"}`;
  lines.push(api.callCount ? `${apiLine} (${api.callCount} call${api.callCount === 1 ? "" : "s"})` : apiLine);
  if (payload.hasWallClock && payload.wallDuration?.label) {
    lines.push(`**Wall clock:** ${payload.wallDuration.label}`);
  }
  if (payload.noteCount > 0) {
    lines.push("");
    lines.push("**Testing notes captured during run:**");
    for (const n of payload.notes || []) {
      lines.push(`- [${n.time}] ${n.stageLabel}: ${n.text}`);
    }
    if (payload.notesMdPath) lines.push(`**Notes file:** ${payload.notesMdPath}`);
  }
  lines.push("");
  return lines.join("\n");
}

function buildQaReviewPrompt({ ctx, payload, sessionDir }) {
  return `${buildRunContextBlock({ ctx, payload, sessionDir })}\n${QA_REVIEW_INSTRUCTIONS}`;
}

function buildRunDebriefPayload({
  sessionId,
  sessionDir,
  notes = [],
  cost,
  createdAt,
  completedAt,
  meetingType,
  surface = "web",
}) {
  const relDir = relativeLogDir(sessionDir, sessionId);
  const relDirSlash = relDir.endsWith("/") ? relDir : `${relDir}/`;
  const scenario = suggestSmokeScenario(meetingType);
  const smokeNode = `node scripts/smoke-test.js ${scenario}`;
  const smokeCommandBlock = `npm run smoke\n${smokeNode}`;
  const { root, lines } = folderTreeLines(relDirSlash, surface);
  const formattedNotes = formatDebriefNotes(notes);
  const apiDuration = durationFromCost(cost);
  const wall = wallDuration(createdAt, completedAt);

  return {
    sessionId: sessionId || "",
    logDir: relDirSlash,
    logDirCopy: relDirSlash.replace(/\/$/, ""),
    smokeScenario: scenario,
    smokeNpm: "npm run smoke",
    smokeNode,
    smokeCommandBlock,
    tree: { root, lines },
    notes: formattedNotes,
    noteCount: formattedNotes.length,
    apiDuration,
    wallDuration: wall,
    hasWallClock: Number.isFinite(createdAt) && Number.isFinite(completedAt),
    reviewrunTip: `/reviewrun ${relDirSlash.replace(/\/$/, "")}`,
    notesMdPath: `${relDirSlash}notes.md`,
    surface,
    cost: cost || null,
  };
}

function printRunDebrief(payload, ui) {
  const { dim, cyan } = ui;
  console.log();
  console.log(dim("  ── Run log " + "─".repeat(44)));
  console.log();
  console.log(dim("  Re-test"));
  console.log("  " + cyan(payload.smokeNpm));
  console.log("  " + cyan(payload.smokeNode));
  console.log(dim("  (replays scenario stdin — not this session)"));
  console.log();
  console.log(dim("  Folder"));
  console.log("  " + payload.logDir);
  for (const line of payload.tree.lines) {
    console.log(dim(`  ${line.prefix} `) + line.text);
  }
  console.log();
  console.log(dim("  Notes"));
  if (payload.noteCount === 0) {
    console.log(dim("  none captured"));
  } else {
    console.log(`  ${payload.noteCount} captured · ${payload.notesMdPath}`);
    for (const n of payload.notes) {
      console.log(dim(`  [${n.time}] `) + `${n.stageLabel} — ${n.text}`);
    }
  }
  console.log();
  console.log(dim("  Duration"));
  const api = payload.apiDuration;
  console.log(
    `  API time: ${api.label}${api.callCount ? dim(` (${api.callCount} calls)`) : ""}`
  );
  if (payload.hasWallClock) {
    console.log(`  Wall clock: ${payload.wallDuration.label}`);
  }
  console.log();
  console.log(dim("  Review: ") + payload.reviewrunTip);
  console.log();
}

export {
  STAGE_LABEL,
  durationFromCost,
  wallDuration,
  relativeLogDir,
  suggestSmokeScenario,
  folderTreeLines,
  formatDebriefNotes,
  buildRunDebriefPayload,
  buildQaReviewPrompt,
  printRunDebrief,
};
