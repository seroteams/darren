import fs from "node:fs";
import path from "node:path";
import { walkRuns, reviewSummaryOf } from "./run-history.ts";
import { DATA_DIR } from "./paths.mts";
import type { NextAction } from "../shared/briefing.types.ts";

const PEOPLE_ROOT = path.join(DATA_DIR, "people");
const AXIS_ORDER = ["wellbeing", "engagement", "clarity", "growth"];

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

// One axis as carried on a person's run record. score is null when the axis
// was not read in that session (never a fake zero).
interface AxisSummary {
  id: string;
  score: number | null;
  read: boolean;
  confidence: string | null;
}

type ReviewSummary = ReturnType<typeof reviewSummaryOf>;

// A single finished run, normalized down to what a profile is built from.
interface RunRecord {
  id: string;
  completedAt: number;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  mode: string;
  runLabel: string | null;
  axes: AxisSummary[];
  summaryBullets: string[];
  nextActions: NextAction[];
  watchFor: string[];
  engagementLevel: string | null;
  review: ReviewSummary;
}

interface Person {
  slug: string;
  name: string;
  runs: RunRecord[];
}

interface SynthesisBullet {
  text: string;
  run_ids: string[];
}
type SynthesisSectionKey = "open_threads" | "whats_landed" | "watch_for";
interface Synthesis {
  open_threads?: SynthesisBullet[];
  whats_landed?: SynthesisBullet[];
  watch_for?: SynthesisBullet[];
  data_limits?: string;
}

// profile.json — the sidecar buildProfile writes alongside profile.md.
interface ProfileSidecar {
  version: number;
  slug: string;
  name: string;
  builtAt: number;
  runIds: string[];
  runCount: number;
  synthesized: boolean;
  synthesis: Synthesis | null;
}

interface PersonListing {
  slug: string;
  name: string;
  runCount: number;
  lastRunAt: number;
  profileBuiltAt: number | null;
  stale: boolean;
}

// Group key. "Maya" and "Maya Chen" stay two people until a real person id
// exists; profile.json carries `version` as the migration seam.
function slugify(name: unknown): string | null {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

// Profiles are built ONLY from what each run already saved: ctx, the briefing
// object, and the review verdict. Never transcripts, never raw answers.
function runRecord(run: { id: string; dir: string; state: Record<string, unknown> }): RunRecord {
  const { id, dir, state } = run;
  const briefing = asRecord(state.briefing);
  const ctx = asRecord(state.ctx);
  const axesList: unknown[] = Array.isArray(briefing.axes) ? briefing.axes : [];
  return {
    id,
    completedAt: asNumber(briefing.completedAt) || asNumber(state.completedAt) || asNumber(state.lastSeenAt) || 0,
    ctx: {
      name: asString(ctx.name),
      role: asString(ctx.role),
      seniority: asString(ctx.seniority),
      meetingType: asString(ctx.meetingType),
    },
    mode: asString(state.mode) || "manual",
    runLabel: typeof state.runLabel === "string" ? state.runLabel : null,
    axes: AXIS_ORDER.map((axisId) => {
      const found = axesList.find((a) => asRecord(a).id === axisId);
      if (!found) return { id: axisId, score: null, read: false, confidence: null };
      const axis = asRecord(found);
      return {
        id: axisId,
        score: typeof axis.score === "number" ? axis.score : null,
        read: axis.read_status === "read",
        confidence: asString(axis.confidence) || null,
      };
    }),
    summaryBullets: Array.isArray(briefing.summary_bullets) ? briefing.summary_bullets : [],
    nextActions: Array.isArray(briefing.next_actions) ? briefing.next_actions : [],
    watchFor: Array.isArray(briefing.watch_for) ? briefing.watch_for : [],
    engagementLevel: asString(asRecord(briefing.engagement_read).level) || null,
    review: reviewSummaryOf(dir),
  };
}

// Every person with at least one FINISHED run (has a briefing), newest run
// first within each person. Fresh disk walk every call — derived means derived.
function collectPersonRuns(): Map<string, RunRecord[]> {
  const people = new Map<string, RunRecord[]>();
  for (const run of walkRuns()) {
    if (!run.state || !run.state.briefing) continue;
    const slug = slugify(asRecord(run.state.ctx).name);
    if (!slug) continue;
    let list = people.get(slug);
    if (!list) {
      list = [];
      people.set(slug, list);
    }
    list.push(runRecord(run));
  }
  for (const runs of people.values()) {
    runs.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }
  return people;
}

function personOf(slug: string, runs: RunRecord[]): Person {
  const first = runs[0];
  return { slug, name: first ? first.ctx.name : "", runs };
}

function readProfileJson(slug: string): Partial<ProfileSidecar> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(PEOPLE_ROOT, slug, "profile.json"), "utf8"));
  } catch {
    return null;
  }
}

function listPeople(): PersonListing[] {
  const out: PersonListing[] = [];
  for (const [slug, runs] of collectPersonRuns()) {
    const first = runs[0];
    if (!first) continue;
    const profile = readProfileJson(slug);
    const runIds = runs.map((r) => r.id);
    out.push({
      slug,
      name: first.ctx.name,
      runCount: runs.length,
      lastRunAt: first.completedAt,
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

function fmtDate(ts: number): string {
  if (!ts) return "unknown";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtScore(axis: AxisSummary): string {
  if (!axis.read || axis.score === null) return "n.r.";
  return String(axis.score);
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || "(none)";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const SYNTHESIS_SECTIONS: Array<[string, SynthesisSectionKey]> = [
  ["Open threads", "open_threads"],
  ["What's landed", "whats_landed"],
  ["What to watch", "watch_for"],
];

function renderSynthesis(synthesis: Synthesis | null, runCount: number): string[] {
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
function renderProfileMarkdown(person: Person, synthesis: Synthesis | null = null): string {
  const { name, runs } = person;
  const latest = runs[0];
  if (!latest) return "";
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
        .map((r) => r.axes.find((a) => a.id === axisId)?.score)
        .filter((s): s is number => typeof s === "number")
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
function writeAtomic(file: string, content: string): void {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function validSlug(slug: string): boolean {
  return typeof slug === "string" && /^[a-z0-9-]+$/.test(slug);
}

// Synchronous full rebuild: fresh disk walk, atomic writes. Node's single
// thread means two callers can't interleave; the atomic rename keeps a crash
// mid-write from ever leaving a torn file.
function buildProfile(slug: string, { synthesis = null }: { synthesis?: Synthesis | null } = {}): ProfileSidecar | null {
  if (!validSlug(slug)) return null;
  const runs = collectPersonRuns().get(slug);
  if (!runs) return null;
  const person = personOf(slug, runs);
  const dir = path.join(PEOPLE_ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });
  writeAtomic(path.join(dir, "profile.md"), renderProfileMarkdown(person, synthesis));
  const sidecar: ProfileSidecar = {
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
function rebuildForName(name: string): Promise<ProfileSidecar | null> {
  const slug = slugify(name);
  if (!slug) return Promise.resolve(null);
  return Promise.resolve().then(() => buildProfile(slug));
}

function readProfile(slug: string): { markdown: string; meta: Partial<ProfileSidecar> | null } | null {
  if (!validSlug(slug)) return null;
  let markdown: string;
  try {
    markdown = fs.readFileSync(path.join(PEOPLE_ROOT, slug, "profile.md"), "utf8");
  } catch {
    return null;
  }
  return { markdown, meta: readProfileJson(slug) };
}

export {
  PEOPLE_ROOT,
  slugify,
  collectPersonRuns,
  listPeople,
  renderProfileMarkdown,
  buildProfile,
  rebuildForName,
  readProfile,
};
