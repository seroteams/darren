// The Universe — pure data model. Turns the engine's live reads into a 3D node/edge
// map plus the per-node detail model, and the filter/focus/search/diff helpers the
// screen drives. No DOM, no canvas — every function here is deterministic and tested
// (universe.model.test.ts beside this file). universe.ts renders what this produces.

import { stageLabel, TOPBAR_STAGES } from "../ui/stage-labels.js";

// One finished 1:1, as carried on a person node for the detail panel's list.
export interface UNodeRun {
  id: string;
  label: string;
  role: string;
  meetingType: string;
  lastSeenAt: number | null;
  rating: number | null;
}

export interface UNode {
  id: string;
  kind: "core" | "stage" | "person" | "run" | "type" | "session" | "part" | "lexicon";
  label: string;
  sub: string;
  x: number;
  y: number;
  z: number;
  r: number; // world-space radius
  runId?: string; // run nodes only — links to the real Review page
  // Detail-panel extras, populated per kind (the renderer formats them):
  step?: number;              // stage: its 1-based position in the pipeline
  role?: string;              // run: the role at that 1:1
  meetingType?: string;       // run: the meeting type
  lastSeenAt?: number | null; // run + session: when it was last touched
  rating?: number | null;     // run: the member's star rating, if any
  withName?: string;          // run: who the 1:1 was with
  runs?: UNodeRun[];          // person: their finished 1:1s
  sessionStage?: string;      // session: which stage it's sitting at, in plain words
  parentLabel?: string;       // part: which stage planet it belongs to
  termsCount?: number;        // lexicon: how many words it holds
  termsSample?: string;       // lexicon: a taste of the words
  duration?: string;          // type: how long this kind of meeting runs
  arcSteps?: number;          // type: how many beats its arc has
  arcTone?: string;           // type: the arc's tone register
}

export interface UEdge {
  from: string;
  to: string;
  flow: number; // pulse density along this line
}

export interface PipelineStep { key: string; label: string; sub: string }

// The ring's friendly copy per known flow stage — the ring's stable id plus the plain
// words shown on the planet. Order and membership come from the app's real flow
// (TOPBAR_STAGES, the rail every run screen renders), never from this lookup.
const RING_COPY: Record<string, PipelineStep> = {
  INTAKE: { key: "intake", label: "Intake", sub: "You tell Sero who you're meeting and what's on your mind." },
  FOCUS_POINTS: { key: "focus", label: "Focus points", sub: "Sero picks the focus areas that fit." },
  PREPARATION: { key: "prepare", label: "Preparation", sub: "It reads the history and drafts its thinking." },
  BANK: { key: "bank", label: "Question bank", sub: "It writes a bank of possible questions." },
  QUESTIONING: { key: "interview", label: "Interview", sub: "It asks you a few short questions." },
  EVAL: { key: "evaluate", label: "Evaluate", sub: "It weighs what your answers mean." },
  BRIEFING: { key: "briefing", label: "Briefing", sub: "It writes the briefing you take into the 1:1." },
};

/** The pipeline ring derived from the app's real flow. A stage the app grows shows
 * up honestly under its topbar label — never silently dropped. */
export function derivePipeline(flow: ReadonlyArray<readonly string[]>): PipelineStep[] {
  return flow.map(([stage = "", label = ""]) =>
    RING_COPY[stage] || { key: stage.toLowerCase(), label, sub: "A new pipeline step — not yet described here." }
  );
}

export const PIPELINE = derivePipeline(TOPBAR_STAGES);

const GOLDEN = 2.399963229728653; // golden angle — spreads people evenly on the sphere

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : null;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ""); // loose text matching

// "backend-engineer--mid-level" -> "Backend engineer · Mid level" — a raw key never
// reaches the screen (plain-language rule). `--` splits facets, `-` is just a space.
const humanize = (key: string): string =>
  key
    .split("--")
    .map((seg) => seg.replace(/-/g, " ").trim())
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(" · ");

// Which pipeline planet an in-flight session parks at, by its saved stage name.
const SESSION_AT: Record<string, string> = {
  INTAKE: "intake", FOCUS_POINTS: "focus", PREPARATION: "prepare",
  BANK: "bank", QUESTIONING: "interview", EVAL: "evaluate",
};

// The engine's real inner machinery, as moons around their stage planet. Every entry
// is a real module (question-generator.ts, delta-gates.ts, opener.ts, …) — no set dressing.
const ENGINE_PARTS: { stage: string; label: string; sub: string }[] = [
  { stage: "bank", label: "Question generator", sub: "Writes candidate questions for this person and meeting." },
  { stage: "bank", label: "Question validator", sub: "Checks every question is clear, safe, and well-formed." },
  { stage: "bank", label: "Eligibility filter", sub: "Drops questions that don't fit this meeting type." },
  { stage: "bank", label: "Dedup gate", sub: "Blocks questions too close to ones already asked." },
  { stage: "bank", label: "Queue manager", sub: "Keeps the best questions lined up in order." },
  { stage: "evaluate", label: "Answer axes", sub: "Weighs what each answer reveals, axis by axis." },
  { stage: "evaluate", label: "Axis coverage", sub: "Tracks which areas the conversation has covered." },
  { stage: "evaluate", label: "Safety gates", sub: "Blocks output that breaks the engine's rules." },
  { stage: "briefing", label: "Opener", sub: "Shapes how the 1:1 starts." },
  { stage: "briefing", label: "Agenda", sub: "Weaves your own agenda points in." },
  { stage: "briefing", label: "Closer", sub: "Lands the ending and next steps." },
];

export interface UniverseInput {
  runs?: unknown[];      // finished 1:1s
  types?: unknown[];     // meeting types
  sessions?: unknown[];  // recent sessions incl. stage — unfinished ones become comets
  arcs?: unknown[];      // meeting arcs — enrich their type's panel
  lexicons?: unknown[];  // role word lists
}

/** Turn real app data into the 3D node/edge map. Pure and deterministic — tested. */
export function buildUniverse(input: UniverseInput): { nodes: UNode[]; edges: UEdge[] } {
  const nodes: UNode[] = [];
  const edges: UEdge[] = [];

  // World position of a pipeline planet, shared by the ring itself and everything
  // that anchors to it (parts, live-session comets).
  const stagePos = (key: string) => {
    const i = PIPELINE.findIndex((s) => s.key === key);
    if (i < 0) return { x: 0, y: 0, z: 0 };
    const a = (i / PIPELINE.length) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * 250, y: Math.sin(a * 2) * 28, z: Math.sin(a) * 250 };
  };

  nodes.push({ id: "core", kind: "core", label: "Sero", sub: "The engine. Everything flows through here.", x: 0, y: 0, z: 0, r: 46 });

  // Pipeline ring — the seven steps a 1:1 travels through, chained in order.
  PIPELINE.forEach((s, i) => {
    const at = stagePos(s.key);
    nodes.push({
      id: `stage:${s.key}`, kind: "stage", label: s.label, sub: s.sub,
      x: at.x, y: at.y, z: at.z, r: 20, step: i + 1,
    });
    edges.push(
      i === 0
        ? { from: "core", to: `stage:${s.key}`, flow: 3 }
        : { from: `stage:${PIPELINE[i - 1]!.key}`, to: `stage:${s.key}`, flow: 3 }
    );
  });

  // The engine's inner parts — tiny moons you find by diving close to a stage planet.
  const partIdx = new Map<string, number>();
  for (const p of ENGINE_PARTS) {
    const j = partIdx.get(p.stage) || 0;
    partIdx.set(p.stage, j + 1);
    const at = stagePos(p.stage);
    const b = j * 1.9 + 0.4;
    nodes.push({
      id: `part:${p.stage}:${j}`, kind: "part", label: p.label, sub: p.sub,
      x: at.x + Math.cos(b) * 44, y: at.y - 16 + Math.sin(b * 1.3) * 10, z: at.z + Math.sin(b) * 44,
      r: 5, parentLabel: PIPELINE.find((s) => s.key === p.stage)!.label,
    });
    edges.push({ from: `stage:${p.stage}`, to: `part:${p.stage}:${j}`, flow: 0.3 });
  }

  // People — one planet per distinct person across the finished runs; their runs
  // become moons. Grouping is case/space-insensitive on the person's name.
  const people = new Map<string, { label: string; runs: UNodeRun[] }>();
  const personRoles = new Map<string, Set<string>>(); // person key -> normalized roles, for role-word links
  for (const raw of input.runs || []) {
    const r = asRecord(raw);
    if (!r) continue;
    const ctx = asRecord(r.ctx) || {};
    const name = str(ctx.name);
    const key = (name || "someone").toLowerCase();
    const id = str(r.id);
    if (!people.has(key)) people.set(key, { label: name || "Someone", runs: [] });
    const role = str(ctx.role);
    if (role) {
      if (!personRoles.has(key)) personRoles.set(key, new Set());
      personRoles.get(key)!.add(norm(role));
    }
    people.get(key)!.runs.push({
      id,
      label: str(r.headline) || name || id || "a 1:1",
      role: str(ctx.role),
      meetingType: str(ctx.meetingType),
      lastSeenAt: typeof r.lastSeenAt === "number" ? r.lastSeenAt : null,
      rating: typeof r.rating === "number" ? r.rating : null,
    });
  }

  let pi = 0;
  for (const [key, p] of people) {
    const pid = `person:${key}`;
    const a = pi * GOLDEN;
    const y = (people.size > 1 ? pi / (people.size - 1) - 0.5 : 0) * 320;
    const px = Math.cos(a) * 560, pz = Math.sin(a) * 560;
    nodes.push({
      id: pid, kind: "person", label: p.label,
      sub: `${p.runs.length} finished 1:1${p.runs.length === 1 ? "" : "s"}`,
      x: px, y, z: pz, r: 15, runs: p.runs,
    });
    edges.push({ from: "stage:briefing", to: pid, flow: 2 });
    p.runs.forEach((run, j) => {
      const b = j * 2.1;
      const orbit = 58 + j * 15;
      const rid = run.id ? `run:${run.id}` : `run:${key}:${j}`;
      const sub = [run.role, run.meetingType].filter(Boolean).join(" · ") || "A finished 1:1.";
      nodes.push({
        id: rid, kind: "run", label: run.label, sub,
        x: px + Math.cos(b) * orbit, y: y + Math.sin(b * 1.7) * 22, z: pz + Math.sin(b) * orbit,
        r: 7, runId: run.id || undefined,
        role: run.role, meetingType: run.meetingType, lastSeenAt: run.lastSeenAt, rating: run.rating, withName: p.label,
      });
      edges.push({ from: pid, to: rid, flow: 1 });
    });
    pi++;
  }

  // Meeting types — the outer constellation. A type is an INPUT you pick at Intake,
  // so its flow runs type -> Intake (not out of the core), and each type links to the
  // runs that actually used it. Arcs (matched by label/slug) enrich the type's panel.
  const arcByKey = new Map<string, { steps: number; tone: string }>();
  for (const raw of input.arcs || []) {
    const a = asRecord(raw);
    if (!a) continue;
    const info = { steps: Array.isArray(a.arc) ? a.arc.length : 0, tone: str(a.tone_register) };
    for (const k of [str(a.label), str(a.slug)]) if (k) arcByKey.set(norm(k), info);
  }
  let ti = 0;
  const seen = new Set<string>();
  for (const raw of input.types || []) {
    const t = asRecord(raw);
    const label = t ? str(t.label) || str(t.name) || str(t.slug) : str(raw);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    const a = ti * GOLDEN + 0.9;
    const tid = `type:${label.toLowerCase()}`;
    const arc = arcByKey.get(norm(label));
    nodes.push({
      id: tid, kind: "type", label,
      sub: (t && str(t.description)) || "A meeting type Sero knows how to run.",
      x: Math.cos(a) * 800, y: Math.sin(a * 1.3) * 150, z: Math.sin(a) * 800, r: 10,
      duration: (t && str(t.duration)) || undefined,
      arcSteps: arc && arc.steps ? arc.steps : undefined,
      arcTone: arc && arc.tone ? arc.tone : undefined,
    });
    edges.push({ from: tid, to: "stage:intake", flow: 0.5 });
    for (const n of nodes) {
      if (n.kind === "run" && n.meetingType && n.meetingType.toLowerCase() === label.toLowerCase()) {
        edges.push({ from: tid, to: n.id, flow: 0.25 });
      }
    }
    ti++;
  }

  // Live sessions — comets parked at the stage they're actually sitting at right now.
  // Finished sessions (BRIEFING) are already moons; unknown stages park at the core.
  let si = 0;
  for (const raw of input.sessions || []) {
    const r = asRecord(raw);
    if (!r) continue;
    const stage = str(r.stage);
    if (!stage || stage === "BRIEFING") continue;
    const ctx = asRecord(r.ctx) || {};
    const key = SESSION_AT[stage];
    const at = key ? stagePos(key) : { x: 0, y: 0, z: 0 };
    const id = str(r.id) || `s${si}`;
    const b = si * 2.4 + 0.7;
    nodes.push({
      id: `session:${id}`, kind: "session",
      label: str(ctx.name) || "A live session",
      sub: `In flight right now — sitting at ${stageLabel(stage)}.`,
      x: at.x + Math.cos(b) * 46, y: at.y + 24, z: at.z + Math.sin(b) * 46, r: 9,
      sessionStage: stageLabel(stage),
      lastSeenAt: typeof r.lastSeenAt === "number" ? r.lastSeenAt : null,
    });
    edges.push({ from: key ? `stage:${key}` : "core", to: `session:${id}`, flow: 4 });
    si++;
  }

  // Role word lists — the engine's vocabulary per role. They feed Preparation (that's
  // where role knowledge is used) and link to any person whose role matches.
  let li = 0;
  for (const raw of input.lexicons || []) {
    const r = asRecord(raw);
    if (!r) continue;
    const label = str(r.label) || str(r.title) || humanize(str(r.key));
    if (!label) continue;
    const terms = Array.isArray(r.terms) ? r.terms : [];
    const names = terms
      .map((t) => { const tr = asRecord(t); return tr ? str(tr.term) : str(t); })
      .filter(Boolean);
    const a = li * GOLDEN + 1.7;
    const id = `lexicon:${(str(r.key) || label).toLowerCase()}`;
    nodes.push({
      id, kind: "lexicon", label, sub: "The words Sero knows for this role.",
      x: Math.cos(a) * 950, y: Math.sin(a * 1.7) * 180, z: Math.sin(a) * 950, r: 9,
      termsCount: terms.length, termsSample: names.slice(0, 3).join(", ") || undefined,
    });
    edges.push({ from: id, to: "stage:prepare", flow: 0.25 });
    for (const [pkey, roles] of personRoles) {
      if (roles.has(norm(label))) edges.push({ from: id, to: `person:${pkey}`, flow: 0.25 });
    }
    li++;
  }

  return { nodes, edges };
}

/* ----------------------------------------------------------------- filter --- */
// The legend chips hide/show whole kinds. Pure + tested: drop hidden kinds and any
// line touching a hidden node. The core is the map's anchor — it can never be hidden.
export function filterUniverse(
  nodes: UNode[],
  edges: UEdge[],
  hidden: ReadonlySet<UNode["kind"]>
): { nodes: UNode[]; edges: UEdge[] } {
  if (!hidden.size) return { nodes, edges };
  const keep = nodes.filter((n) => n.kind === "core" || !hidden.has(n.kind));
  const ids = new Set(keep.map((n) => n.id));
  return { nodes: keep, edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)) };
}

/* ------------------------------------------------------------------ focus --- */
// "Show only their universe" — one node plus the things that genuinely belong to its
// story, by kind: a person keeps their runs, role words, and the types those runs
// used; a run keeps its person + type; a type keeps its runs + their people; a stage
// keeps its machinery + parked sessions. Core/parts can't focus (core IS the map).
export function focusUniverse(nodes: UNode[], edges: UEdge[], id: string): { nodes: UNode[]; edges: UEdge[] } | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const me = byId.get(id);
  if (!me || me.kind === "core" || me.kind === "part") return null;

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.from)!.push(e.to);
    adj.get(e.to)!.push(e.from);
  }
  const near = (of: string, kinds: UNode["kind"][]) =>
    (adj.get(of) || []).filter((nid) => { const n = byId.get(nid); return !!n && kinds.includes(n.kind); });

  const keep = new Set<string>([id, "core"]);
  if (me.kind === "person") {
    for (const nid of near(id, ["run", "lexicon"])) keep.add(nid);
    for (const rid of near(id, ["run"])) for (const tid of near(rid, ["type"])) keep.add(tid);
  } else if (me.kind === "run") {
    for (const nid of near(id, ["person", "type"])) keep.add(nid);
  } else if (me.kind === "type") {
    for (const rid of near(id, ["run"])) { keep.add(rid); for (const pid of near(rid, ["person"])) keep.add(pid); }
  } else if (me.kind === "lexicon") {
    for (const pid of near(id, ["person"])) keep.add(pid);
  } else if (me.kind === "session") {
    for (const sid of near(id, ["stage"])) keep.add(sid);
  } else if (me.kind === "stage") {
    for (const nid of near(id, ["part", "session"])) keep.add(nid);
  }
  return {
    nodes: nodes.filter((n) => keep.has(n.id)),
    edges: edges.filter((e) => keep.has(e.from) && keep.has(e.to)),
  };
}

/* ----------------------------------------------------------------- search --- */
// Find-anything: name beats mention, people beat their runs, 8 results max. Two
// letters minimum so a single keystroke doesn't light up the whole sky.
const SEARCH_RANK: Record<UNode["kind"], number> = {
  person: 0, session: 1, run: 2, type: 3, stage: 4, lexicon: 5, part: 6, core: 7,
};

export function searchUniverse(nodes: UNode[], query: string): UNode[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const scored: { n: UNode; s: number }[] = [];
  for (const n of nodes) {
    const label = n.label.toLowerCase();
    let s: number | null = null;
    if (label.startsWith(q)) s = 0;
    else if (label.includes(q)) s = 1;
    else if (n.sub.toLowerCase().includes(q)) s = 2;
    if (s != null) scored.push({ n, s });
  }
  return scored
    .sort((a, b) => a.s - b.s || SEARCH_RANK[a.n.kind] - SEARCH_RANK[b.n.kind] || a.n.label.localeCompare(b.n.label))
    .map((x) => x.n)
    .slice(0, 8);
}

/* ------------------------------------------------------------------- diff --- */
// Compare two builds of the universe so an Update can tell what changed in the
// engine since it was last drawn. Pure + tested — the button just renders these.

export interface UniverseDiff {
  added: Partial<Record<UNode["kind"], number>>;
  removed: Partial<Record<UNode["kind"], number>>;
  addedIds: string[]; // node ids that are new — the frame loop rings these briefly
  changed: boolean;
}

export function diffUniverse(prev: UNode[], next: UNode[]): UniverseDiff {
  const prevIds = new Set(prev.map((n) => n.id));
  const nextIds = new Set(next.map((n) => n.id));
  const added: Partial<Record<UNode["kind"], number>> = {};
  const removed: Partial<Record<UNode["kind"], number>> = {};
  const addedIds: string[] = [];
  for (const n of next) {
    if (!prevIds.has(n.id)) { added[n.kind] = (added[n.kind] || 0) + 1; addedIds.push(n.id); }
  }
  for (const n of prev) {
    if (!nextIds.has(n.id)) { removed[n.kind] = (removed[n.kind] || 0) + 1; }
  }
  const changed = addedIds.length > 0 || Object.keys(removed).length > 0;
  return { added, removed, addedIds, changed };
}

// The kinds that can change, with plain-language singular/plural nouns and a stable
// order to read them in. The pipeline ring is on the list on purpose: it derives from
// the app's real flow now, so a flow change must be announced — never muted.
const DIFF_NOUN: Partial<Record<UNode["kind"], [string, string]>> = {
  stage: ["pipeline step", "pipeline steps"],
  session: ["live session", "live sessions"],
  run: ["1:1", "1:1s"],
  person: ["person", "people"],
  type: ["meeting type", "meeting types"],
  lexicon: ["role word list", "role word lists"],
};
const DIFF_ORDER: UNode["kind"][] = ["stage", "session", "run", "person", "type", "lexicon"];

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] || "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function diffClause(counts: Partial<Record<UNode["kind"], number>>, fresh: boolean): string {
  const parts: string[] = [];
  for (const kind of DIFF_ORDER) {
    const n = counts[kind];
    const noun = DIFF_NOUN[kind];
    if (!n || !noun) continue;
    parts.push(`${n} ${fresh ? "new " : ""}${noun[n === 1 ? 0 : 1]}`);
  }
  return joinList(parts);
}

/** Plain words for a change in the ring itself between visits — a code change, so the
 * caller keeps a persisted snapshot across reloads. "" = nothing to say (incl. first visit). */
export function ringChanges(prev: { key: string; label: string }[] | null, next: { key: string; label: string }[]): string {
  if (!prev || prev.length === 0) return "";
  const prevBy = new Map(prev.map((s) => [s.key, s.label]));
  const nextBy = new Map(next.map((s) => [s.key, s.label]));
  const added = next.filter((s) => !prevBy.has(s.key)).map((s) => s.label);
  const removed = prev.filter((s) => !nextBy.has(s.key)).map((s) => s.label);
  const renamed = next
    .filter((s) => prevBy.has(s.key) && prevBy.get(s.key) !== s.label)
    .map((s) => `${prevBy.get(s.key)} → ${s.label}`);
  const parts: string[] = [];
  if (added.length) parts.push(`added: ${joinList(added)}`);
  if (removed.length) parts.push(`removed: ${joinList(removed)}`);
  if (renamed.length) parts.push(`renamed: ${joinList(renamed)}`);
  if (!parts.length) return "";
  const n = added.length + removed.length + renamed.length;
  return `Pipeline step${n === 1 ? "" : "s"} ${parts.join("; ")}.`;
}

/** One short, plain sentence for the Update button to show. */
export function summarizeDiff(diff: UniverseDiff): string {
  if (!diff.changed) return "Everything's already up to date.";
  const clauses: string[] = [];
  const add = diffClause(diff.added, true);
  const rem = diffClause(diff.removed, false);
  if (add) clauses.push(`${add} just appeared`);
  if (rem) clauses.push(`${rem} dropped off`);
  return `${clauses.join(", and ")}.`;
}

/* ---------------------------------------------------------------- renderer -- */

export const COLOR: Record<UNode["kind"], string> = {
  core: "125,211,252",    // sky
  stage: "76,201,240",    // cyan
  person: "255,183,3",    // amber
  run: "167,243,192",     // mint
  type: "192,132,252",    // violet
  session: "255,214,102", // warm gold — the live comets
  part: "126,166,224",    // dim steel — inner machinery
  lexicon: "244,114,182", // pink — role words
};

export const KIND_WORD: Record<UNode["kind"], string> = {
  core: "The engine", stage: "Pipeline step", person: "Person", run: "Finished 1:1",
  type: "Meeting type", session: "Live session", part: "Engine part", lexicon: "Role words",
};

// n filled stars then hollow ones, e.g. stars(4) -> "★★★★☆".
export const stars = (n: number): string => "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);

// What the detail panel shows for a node — the branchy per-kind logic, kept pure so
// it's tested without a browser (describe-node in universe.test.ts). The renderer just
// turns this into HTML. `fmtWhen` is injected so relative time stays out of the pure part.
export interface PanelModel {
  eyebrow: string;
  rows: { k: string; v: string; stars?: boolean }[];
  runs?: { id: string; title: string; sub: string }[]; // person: clickable 1:1 list
  steps?: { label: string; sub: string }[];             // core: the pipeline
  openRunId?: string;                                    // run: shows the "Open" button
}

export function describeNode(n: UNode, fmtWhen: (ts: number | null | undefined) => string): PanelModel {
  const rows: PanelModel["rows"] = [];
  const model: PanelModel = { eyebrow: KIND_WORD[n.kind], rows };
  if (n.kind === "run") {
    if (n.withName) rows.push({ k: "With", v: n.withName });
    if (n.role) rows.push({ k: "Role", v: n.role });
    if (n.meetingType) rows.push({ k: "Meeting", v: n.meetingType });
    const when = fmtWhen(n.lastSeenAt);
    if (when) rows.push({ k: "Last touched", v: when });
    if (n.rating) rows.push({ k: "Rating", v: stars(n.rating), stars: true });
    if (n.runId) model.openRunId = n.runId;
  } else if (n.kind === "stage" && n.step) {
    rows.push({ k: "Step", v: `${n.step} of ${PIPELINE.length}` });
  } else if (n.kind === "person" && n.runs) {
    const roles = [...new Set(n.runs.map((r) => r.role).filter(Boolean))];
    rows.push({ k: "Finished 1:1s", v: String(n.runs.length) });
    if (roles.length) rows.push({ k: roles.length === 1 ? "Role" : "Roles", v: roles.join(", ") });
    model.runs = n.runs.map((r) => ({
      id: r.id,
      title: r.label,
      sub: [r.role, r.meetingType, fmtWhen(r.lastSeenAt)].filter(Boolean).join(" · ") || "A finished 1:1",
    }));
  } else if (n.kind === "core") {
    model.steps = PIPELINE.map((s) => ({ label: s.label, sub: s.sub }));
  } else if (n.kind === "type") {
    if (n.duration) rows.push({ k: "Duration", v: n.duration });
    if (n.arcSteps) rows.push({ k: "Arc steps", v: String(n.arcSteps) });
    if (n.arcTone) rows.push({ k: "Tone", v: n.arcTone });
    if (!rows.length) rows.push({ k: "Kind", v: "A meeting type Sero can run" });
  } else if (n.kind === "session") {
    rows.push({ k: "With", v: n.label });
    if (n.sessionStage) rows.push({ k: "At stage", v: n.sessionStage });
    const when = fmtWhen(n.lastSeenAt);
    if (when) rows.push({ k: "Last touched", v: when });
  } else if (n.kind === "part") {
    if (n.parentLabel) rows.push({ k: "Part of", v: n.parentLabel });
  } else if (n.kind === "lexicon") {
    rows.push({ k: "Words", v: String(n.termsCount || 0) });
    if (n.termsSample) rows.push({ k: "Sample", v: n.termsSample });
  }
  return model;
}
