const fs = require("node:fs");
const path = require("node:path");
const { walkRuns, reviewSummaryOf } = require("./run-history");

const PEOPLE_ROOT = path.join(__dirname, "..", "data", "people");
const AXIS_ORDER = ["wellbeing", "engagement", "clarity", "growth"];

// Group key. "Maya" and "Maya Chen" stay two people until a real person id
// exists; profile.json carries `version` as the migration seam.
function slugify(name) {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

// Profiles are built ONLY from what each run already saved: ctx, the briefing
// object, and the review verdict. Never transcripts, never raw answers.
function runRecord({ id, dir, state }) {
  const briefing = state.briefing;
  const ctx = state.ctx || {};
  return {
    id,
    completedAt: briefing.completedAt || state.completedAt || state.lastSeenAt || 0,
    ctx: {
      name: ctx.name || "",
      role: ctx.role || "",
      seniority: ctx.seniority || "",
      meetingType: ctx.meetingType || "",
    },
    mode: state.mode || "manual",
    runLabel: state.runLabel ?? null,
    axes: AXIS_ORDER.map((axisId) => {
      const axis = (briefing.axes || []).find((a) => a.id === axisId);
      if (!axis) return { id: axisId, score: null, read: false, confidence: null };
      return {
        id: axisId,
        score: typeof axis.score === "number" ? axis.score : null,
        read: axis.read_status === "read",
        confidence: axis.confidence || null,
      };
    }),
    summaryBullets: briefing.summary_bullets || [],
    nextActions: briefing.next_actions || [],
    watchFor: briefing.watch_for || [],
    engagementLevel: briefing.engagement_read?.level || null,
    review: reviewSummaryOf(dir),
  };
}

// Every person with at least one FINISHED run (has a briefing), newest run
// first within each person. Fresh disk walk every call — derived means derived.
function collectPersonRuns() {
  const people = new Map();
  for (const run of walkRuns()) {
    if (!run.state || !run.state.briefing) continue;
    const slug = slugify(run.state.ctx?.name);
    if (!slug) continue;
    if (!people.has(slug)) people.set(slug, []);
    people.get(slug).push(runRecord(run));
  }
  for (const runs of people.values()) {
    runs.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }
  return people;
}

function personOf(slug, runs) {
  return { slug, name: runs[0].ctx.name, runs };
}

function readProfileJson(slug) {
  try {
    return JSON.parse(fs.readFileSync(path.join(PEOPLE_ROOT, slug, "profile.json"), "utf8"));
  } catch {
    return null;
  }
}

function listPeople() {
  const out = [];
  for (const [slug, runs] of collectPersonRuns()) {
    const profile = readProfileJson(slug);
    const runIds = runs.map((r) => r.id);
    out.push({
      slug,
      name: runs[0].ctx.name,
      runCount: runs.length,
      lastRunAt: runs[0].completedAt,
      profileBuiltAt: profile?.builtAt ?? null,
      stale:
        !profile ||
        profile.runCount !== runIds.length ||
        runIds.some((id) => !profile.runIds?.includes(id)),
    });
  }
  out.sort((a, b) => (b.lastRunAt || 0) - (a.lastRunAt || 0));
  return out;
}

function fmtDate(ts) {
  if (!ts) return "unknown";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtScore(axis) {
  if (!axis.read || axis.score === null) return "n.r.";
  return String(axis.score);
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item) || "(none)";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const SYNTHESIS_SECTIONS = [
  ["Open threads", "open_threads"],
  ["What's landed", "whats_landed"],
  ["What to watch", "watch_for"],
];

function renderSynthesis(synthesis, runCount) {
  if (!synthesis) {
    if (runCount < 2) {
      return [
        `Not enough history yet — only ${runCount} finished run. Synthesis appears after the second finished run.`,
      ];
    }
    return ["Not enough yet — this section is written from run evidence in a later phase."];
  }
  const lines = ["_Synthesized from the runs above. Every line cites the run(s) it comes from._"];
  for (const [title, key] of SYNTHESIS_SECTIONS) {
    lines.push("", `### ${title}`);
    const bullets = synthesis[key] || [];
    if (bullets.length === 0) {
      lines.push("Nothing established yet.");
    } else {
      for (const b of bullets) lines.push(`- ${b.text} [${b.run_ids.join(", ")}]`);
    }
  }
  lines.push("", "### Data limits", synthesis.data_limits || "None noted.");
  return lines;
}

// Pure and deterministic: the same person data renders the same bytes. The
// build timestamp lives in profile.json only, so "delete it and rebuild it"
// really does give back an identical profile.md.
function renderProfileMarkdown(person, synthesis = null) {
  const { name, runs } = person;
  const latest = runs[0];
  const who = [latest.ctx.role, latest.ctx.seniority].filter(Boolean).join(" · ");
  const lines = [
    `# ${name} — running profile`,
    "",
    `> Derived from ${runs.length} finished run${runs.length === 1 ? "" : "s"}, latest ${fmtDate(latest.completedAt)}.`,
    "> Regenerated from run evidence — edits here are overwritten.",
    "",
    "## Who",
    `- Name: ${name}`,
    `- Role (latest run): ${who || "(not set)"}`,
    `- Meeting types: ${countBy(runs, (r) => r.ctx.meetingType)
      .map(([type, n]) => `${type} (${n})`)
      .join(", ")}`,
    "",
    "## Runs (newest first)",
    "| Date | Run | Meeting type | Mode | Review | W | E | C | G |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const run of runs) {
    lines.push(
      `| ${fmtDate(run.completedAt)} | ${run.id} | ${run.ctx.meetingType || "(none)"} | ${run.mode} | ${run.review.overall || "—"} | ${run.axes.map(fmtScore).join(" | ")} |`
    );
  }
  lines.push("", 'n.r. = axis not read in that session (no signal — not a zero).', "", "## Axis trends (oldest → newest, read sessions only)");
  for (const axisId of AXIS_ORDER) {
    const label = axisId.charAt(0).toUpperCase() + axisId.slice(1);
    const readRuns = [...runs].reverse().filter((r) => {
      const axis = r.axes.find((a) => a.id === axisId);
      return axis && axis.read && axis.score !== null;
    });
    if (readRuns.length === 0) {
      lines.push(`- ${label}: not read in any run yet`);
    } else {
      const scores = readRuns
        .map((r) => r.axes.find((a) => a.id === axisId).score)
        .join(" → ");
      lines.push(`- ${label}: ${scores}  (read in ${readRuns.length} of ${runs.length} runs)`);
    }
  }
  lines.push("", "## How to help them", ...renderSynthesis(synthesis, runs.length));
  lines.push("", "---", `profile-version: 1 · source runs: ${runs.length} · generated by Sero`, "");
  return lines.join("\n");
}

// Atomic write: stage to a temp file in the same dir, then rename over the
// target so a crash mid-write can never leave a torn profile.
function writeAtomic(file, content) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function validSlug(slug) {
  return typeof slug === "string" && /^[a-z0-9-]+$/.test(slug);
}

// Synchronous full rebuild: fresh disk walk, atomic writes. Node's single
// thread means two callers can't interleave; the atomic rename keeps a crash
// mid-write from ever leaving a torn file.
function buildProfile(slug, { synthesis = null } = {}) {
  if (!validSlug(slug)) return null;
  const runs = collectPersonRuns().get(slug);
  if (!runs) return null;
  const person = personOf(slug, runs);
  const dir = path.join(PEOPLE_ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });
  writeAtomic(path.join(dir, "profile.md"), renderProfileMarkdown(person, synthesis));
  const sidecar = {
    version: 1,
    slug,
    name: person.name,
    builtAt: Date.now(),
    runIds: runs.map((r) => r.id),
    runCount: runs.length,
    synthesized: Boolean(synthesis),
    synthesis,
  };
  writeAtomic(path.join(dir, "profile.json"), JSON.stringify(sidecar, null, 2));
  return sidecar;
}

// Phase-2 hook: called after a run finishes. Must never throw into the caller.
function rebuildForName(name) {
  const slug = slugify(name);
  if (!slug) return Promise.resolve(null);
  return Promise.resolve().then(() => buildProfile(slug));
}

function readProfile(slug) {
  if (!validSlug(slug)) return null;
  let markdown;
  try {
    markdown = fs.readFileSync(path.join(PEOPLE_ROOT, slug, "profile.md"), "utf8");
  } catch {
    return null;
  }
  return { markdown, meta: readProfileJson(slug) };
}

module.exports = {
  PEOPLE_ROOT,
  slugify,
  collectPersonRuns,
  listPeople,
  renderProfileMarkdown,
  buildProfile,
  rebuildForName,
  readProfile,
};
