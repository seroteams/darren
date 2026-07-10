// The Universe — a just-for-fun, admin-only 3D map of the whole app. Every light is
// real data: the pipeline stages sit around the Sero core, each person you've met
// orbits further out with their finished 1:1s as moons, and meeting types ring the
// edge. Pulses travel core → pipeline → person → run to show how information flows.
// Drag to spin, scroll to dive (huge zoom range), click a light to fly to it; a run
// moon links straight to its real Review page. An Update button re-reads the engine's
// live data and rings whatever just appeared, telling you what changed. Canvas 2D with
// hand-rolled 3D projection — no new dependencies, all reads (never writes) the API.
//
// The pure, tested map-building lives in universe.model.ts; this file is the mount()
// renderer and eye-candy that draws it.

import { STAGES } from "../state.js";
import type { StageContext } from "./stage.types.ts";
import { getFinishedRuns, getMeetingTypes, listRecentRuns, getArcs, getRoleLexicons, getRunOverview } from "../../../shared/api.js";
import { escapeHtml as esc } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { RefreshCw } from "lucide";
import {
  buildUniverse, filterUniverse, focusUniverse, searchUniverse,
  diffUniverse, summarizeDiff, ringChanges, describeNode, recencyIntensity, COLOR, KIND_WORD, PIPELINE,
} from "./universe.model.ts";
import type { UNode, UEdge } from "./universe.model.ts";

interface Pulse { edge: UEdge; t: number; speed: number }

let raf = 0;
let cleanup: (() => void) | null = null;

export async function mount(root: HTMLElement, { setState }: StageContext): Promise<void> {
  // Full-bleed dark page — neutralize the stage's centering/padding for this screen only.
  root.style.padding = "0";
  root.style.display = "block";
  root.innerHTML = `
    <style>
      .uni { position: relative; width: 100%; height: 100dvh; overflow: hidden; background: #04060f; }
      .uni canvas { position: absolute; inset: 0; display: block; cursor: grab; touch-action: none; /* touch drags go to the pointer handlers, not page scroll */ }
      .uni.is-dragging canvas { cursor: grabbing; }
      .uni__hud { position: absolute; top: 20px; left: 24px; color: #dbe7ff; pointer-events: none; max-width: 340px; }
      .uni__hud h1 { font-size: 22px; font-weight: 700; margin: 0 0 2px; letter-spacing: 0.02em; }
      .uni__hud p { font-size: 14px; margin: 0; color: rgba(219,231,255,0.75); }
      .uni__refresh { pointer-events: auto; margin-top: 12px; display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 14px; font-weight: 600; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(125,211,252,0.4); background: rgba(125,211,252,0.12); color: #dbe7ff; cursor: pointer; transition: background 0.15s; }
      .uni__refresh:hover { background: rgba(125,211,252,0.24); }
      .uni__refresh:disabled { cursor: default; opacity: 0.75; }
      .uni__refresh svg { width: 15px; height: 15px; }
      .uni__refresh.is-busy svg { animation: uni-spin 0.8s linear infinite; }
      @keyframes uni-spin { to { transform: rotate(360deg); } }
      .uni__status { pointer-events: none; margin-top: 10px; font-size: 14px; max-width: 320px; line-height: 1.4; color: rgba(219,231,255,0.9); opacity: 0; transform: translateY(-4px); transition: opacity 0.25s, transform 0.25s; }
      .uni__status.is-on { opacity: 1; transform: none; }
      .uni__status[data-tone="good"] { color: #a7f3c0; }
      .uni__status[data-tone="warn"] { color: #fca5a5; }
      @media (prefers-reduced-motion: reduce) { .uni__refresh.is-busy svg { animation: none; } .uni__status { transition: none; } }
      .uni__counts { position: absolute; bottom: 18px; left: 24px; font-size: 14px; color: rgba(219,231,255,0.65); pointer-events: none; }
      .uni__legend { position: absolute; bottom: 18px; right: 24px; display: flex; gap: 8px; font-size: 14px; pointer-events: auto; flex-wrap: wrap; justify-content: flex-end; max-width: 60vw; transition: right 0.34s cubic-bezier(0.22,1,0.36,1); z-index: 6; }
      /* Chips are filters: click one to hide/show that kind of light. */
      .uni__chip { display: inline-flex; align-items: center; font: inherit; font-size: 14px; color: rgba(219,231,255,0.85); background: rgba(125,211,252,0.07); border: 1px solid rgba(125,211,252,0.16); border-radius: 999px; padding: 5px 12px; cursor: pointer; transition: opacity 0.15s, background 0.15s; }
      .uni__chip:hover { background: rgba(125,211,252,0.2); }
      .uni__chip b { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
      .uni__chip.is-off { opacity: 0.35; }
      .uni__chip.is-off b { background: transparent !important; box-shadow: inset 0 0 0 1.5px rgba(219,231,255,0.55); }
      .uni__chip--all { border-color: rgba(125,211,252,0.45); background: rgba(125,211,252,0.16); font-weight: 600; }
      .uni__chip--focus { border-color: rgba(255,214,102,0.6); background: rgba(255,214,102,0.14); font-weight: 600; color: #ffe9b3; }
      .uni__search { pointer-events: auto; margin-top: 12px; position: relative; width: 270px; }
      .uni__search-input { width: 100%; font: inherit; font-size: 14px; padding: 8px 12px; border-radius: 9px; border: 1px solid rgba(125,211,252,0.3); background: rgba(10,16,34,0.75); color: #eaf2ff; outline: none; }
      .uni__search-input::placeholder { color: rgba(219,231,255,0.45); }
      .uni__search-input:focus { border-color: rgba(125,211,252,0.7); }
      .uni__search-results { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: rgba(10,16,34,0.95); border: 1px solid rgba(125,211,252,0.25); border-radius: 10px; overflow: hidden; backdrop-filter: blur(8px); z-index: 7; }
      .uni__search-hit { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; font: inherit; font-size: 14px; padding: 9px 12px; background: none; border: 0; color: #eaf2ff; cursor: pointer; }
      .uni__search-hit:hover, .uni__search-hit.is-active { background: rgba(125,211,252,0.15); }
      .uni__search-hit b { width: 8px; height: 8px; border-radius: 50%; flex: none; }
      .uni__search-hit .k { margin-left: auto; color: rgba(219,231,255,0.5); }
      /* Panel open: slide the chips left of the drawer so filtering stays usable. */
      .uni.has-panel .uni__legend { right: calc(clamp(300px, 25vw, 440px) + 24px); }
      @media (prefers-reduced-motion: reduce) { .uni__legend { transition: none; } }
      /* Detail panel — a dark drawer down the right edge (~a quarter of the page). */
      .uni__panel { position: absolute; top: 0; right: 0; height: 100%; width: clamp(300px, 25vw, 440px); display: flex; flex-direction: column; z-index: 5; color: #eaf2ff; background: linear-gradient(180deg, rgba(9,13,28,0.97), rgba(6,9,20,0.98)); border-left: 1px solid rgba(125,211,252,0.18); box-shadow: -24px 0 60px rgba(0,0,0,0.55); backdrop-filter: blur(12px); transform: translateX(100%); transition: transform 0.34s cubic-bezier(0.22,1,0.36,1); }
      .uni__panel.is-open { transform: none; }
      .uni__panel-head { position: relative; padding: 24px 24px 18px; border-bottom: 1px solid rgba(125,211,252,0.12); }
      .uni__panel-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #eaf2ff; cursor: pointer; font-size: 20px; line-height: 1; display: grid; place-items: center; }
      .uni__panel-close:hover { background: rgba(255,255,255,0.14); }
      .uni__panel-eyebrow { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
      .uni__panel-title { font-size: 24px; font-weight: 700; margin: 6px 0 5px; line-height: 1.15; padding-right: 36px; }
      .uni__panel-sub { font-size: 14px; line-height: 1.5; color: rgba(234,242,255,0.72); }
      .uni__panel-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
      .uni__rows { display: flex; flex-direction: column; gap: 11px; }
      .uni__row { display: flex; justify-content: space-between; gap: 16px; font-size: 14px; }
      .uni__row .rk { color: rgba(234,242,255,0.55); }
      .uni__row .rv { color: #eaf2ff; text-align: right; font-weight: 500; }
      .uni__row .rv.stars { color: #ffcf5b; letter-spacing: 2px; }
      .uni__section-label { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(234,242,255,0.5); margin-bottom: 10px; }
      .uni__para { font-size: 14px; line-height: 1.55; color: rgba(234,242,255,0.82); white-space: pre-wrap; }
      .uni__runlist { display: flex; flex-direction: column; gap: 8px; }
      .uni__runrow { text-align: left; width: 100%; background: rgba(125,211,252,0.06); border: 1px solid rgba(125,211,252,0.14); border-radius: 10px; padding: 10px 12px; color: #eaf2ff; cursor: pointer; font: inherit; display: flex; flex-direction: column; gap: 3px; }
      .uni__runrow:hover { background: rgba(125,211,252,0.15); border-color: rgba(125,211,252,0.3); }
      .uni__runrow .rr-t { font-size: 14px; font-weight: 600; }
      .uni__runrow .rr-s { font-size: 14px; color: rgba(234,242,255,0.6); }
      .uni__steps { list-style: none; margin: 0; padding: 0; counter-reset: step; display: flex; flex-direction: column; gap: 12px; }
      .uni__steps li { counter-increment: step; position: relative; padding-left: 34px; }
      .uni__steps li::before { content: counter(step); position: absolute; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; background: rgba(76,201,240,0.16); border: 1px solid rgba(76,201,240,0.5); color: #7dd3fc; font-size: 14px; font-weight: 600; display: grid; place-items: center; }
      .uni__steps .st { display: block; font-size: 14px; font-weight: 600; }
      .uni__steps .sb { display: block; font-size: 14px; color: rgba(234,242,255,0.6); line-height: 1.4; }
      .uni__panel-foot { padding: 16px 24px; border-top: 1px solid rgba(125,211,252,0.12); display: flex; gap: 8px; }
      .uni__panel-foot button { flex: 1; font: inherit; font-size: 14px; font-weight: 600; padding: 11px 12px; border-radius: 9px; border: 1px solid rgba(125,211,252,0.4); background: rgba(125,211,252,0.12); color: #dbe7ff; cursor: pointer; }
      .uni__panel-foot button:hover { background: rgba(125,211,252,0.24); }
      .uni__panel-foot button.primary { background: #7dd3fc; color: #04060f; border-color: #7dd3fc; }
      @media (prefers-reduced-motion: reduce) { .uni__panel { transition: none; } .uni__legend { transition: none; } }
    </style>
    <div class="uni">
      <canvas></canvas>
      <div class="uni__hud">
        <h1>The Sero Universe</h1>
        <p>Drag to spin &middot; scroll to dive &middot; click any light to fly to it. Every light is real, and it re-checks the engine every minute by itself.</p>
        <button type="button" class="uni__refresh js-refresh" title="Re-read the engine and show what changed">
          ${icon(RefreshCw, { size: 15 })}
          <span class="uni__refresh-label">Update from the engine</span>
        </button>
        <div class="uni__status js-status" role="status" aria-live="polite"></div>
        <div class="uni__search">
          <input class="uni__search-input js-search" type="search" placeholder="Find anything — a name, a 1:1, a type…" autocomplete="off" spellcheck="false" aria-label="Find anything" />
          <div class="uni__search-results js-search-results" hidden></div>
        </div>
      </div>
      <div class="uni__counts js-counts">Loading the universe…</div>
      <div class="uni__legend" role="group" aria-label="Filter what's shown">
        <button type="button" class="uni__chip js-chip" data-kind="session" title="Click to hide or show these"><b style="background:rgb(${COLOR.session})"></b>Live now</button>
        <button type="button" class="uni__chip js-chip" data-kind="stage" title="Click to hide or show these"><b style="background:rgb(${COLOR.stage})"></b>Pipeline</button>
        <button type="button" class="uni__chip js-chip" data-kind="part" title="Click to hide or show these"><b style="background:rgb(${COLOR.part})"></b>Engine parts</button>
        <button type="button" class="uni__chip js-chip" data-kind="person" title="Click to hide or show these"><b style="background:rgb(${COLOR.person})"></b>People</button>
        <button type="button" class="uni__chip js-chip" data-kind="run" title="Click to hide or show these"><b style="background:rgb(${COLOR.run})"></b>Finished 1:1s</button>
        <button type="button" class="uni__chip js-chip" data-kind="type" title="Click to hide or show these"><b style="background:rgb(${COLOR.type})"></b>Meeting types</button>
        <button type="button" class="uni__chip js-chip" data-kind="lexicon" title="Click to hide or show these"><b style="background:rgb(${COLOR.lexicon})"></b>Role words</button>
        <button type="button" class="uni__chip uni__chip--focus js-chip-focus" hidden></button>
        <button type="button" class="uni__chip uni__chip--all js-chip-all" hidden>Show all</button>
      </div>
      <aside class="uni__panel js-panel" aria-hidden="true"></aside>
    </div>
  `;

  const shell = root.querySelector<HTMLDivElement>(".uni")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  const ctx2d = canvas.getContext("2d")!;
  const countsEl = root.querySelector<HTMLDivElement>(".js-counts")!;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Real data — five free reads, fetched together; any that fails just leaves its
  // layer empty, the universe still renders. Returns null on failure so refresh()
  // can tell "unreachable" apart from "genuinely empty".
  async function fetchAll(): Promise<{ runs: unknown[] | null; types: unknown[] | null; sessions: unknown[] | null; arcs: unknown[] | null; lexicons: unknown[] | null }> {
    const grab = async (go: () => Promise<unknown[] | undefined>) => {
      try { return (await go()) || []; } catch { return null; }
    };
    const [r, t, s, a, l] = await Promise.all([
      grab(async () => ((await getFinishedRuns()) as { runs?: unknown[] }).runs),
      grab(async () => ((await getMeetingTypes()) as { types?: unknown[] }).types),
      grab(async () => ((await listRecentRuns(12)) as { runs?: unknown[] }).runs),
      grab(async () => ((await getArcs()) as { arcs?: unknown[] }).arcs),
      grab(async () => ((await getRoleLexicons()) as { roles?: unknown[] }).roles),
    ]);
    return { runs: r, types: t, sessions: s, arcs: a, lexicons: l };
  }
  const first = await fetchAll();
  let runs = first.runs || [];
  let types = first.types || [];
  let sessions = first.sessions || [];
  let arcs = first.arcs || [];
  let lexicons = first.lexicons || [];
  if (!shell.isConnected) return; // navigated away while fetching

  // Mutable so the Update button can swap in a fresh build without a remount.
  let { nodes, edges } = buildUniverse({ runs, types, sessions, arcs, lexicons });
  let byId = new Map(nodes.map((n) => [n.id, n]));
  let liveCount = nodes.filter((n) => n.kind === "session").length;

  function updateCounts() {
    liveCount = nodes.filter((n) => n.kind === "session").length;
    const nRuns = nodes.filter((n) => n.kind === "run").length;
    const nPeople = nodes.filter((n) => n.kind === "person").length;
    const nTypes = nodes.filter((n) => n.kind === "type").length;
    const live = liveCount ? `${liveCount} live session${liveCount === 1 ? "" : "s"} · ` : "";
    countsEl.textContent = nRuns || liveCount
      ? `${live}${nRuns} finished 1:1${nRuns === 1 ? "" : "s"} · ${nPeople} ${nPeople === 1 ? "person" : "people"} · ${nTypes} meeting types — all live data.`
      : "No 1:1s yet — start one and watch it appear here.";
  }
  updateCounts();

  // Pulses — the moving lights that show information flowing along each line.
  function buildPulses(es: UEdge[]): Pulse[] {
    const out: Pulse[] = [];
    es.forEach((e, i) => {
      const count = Math.max(1, Math.round(e.flow));
      for (let k = 0; k < count; k++) {
        out.push({ edge: e, t: ((i * 0.37 + k / count) % 1), speed: 0.1 + ((i * 7 + k * 13) % 10) * 0.02 });
      }
    });
    return out;
  }
  // Filters — the legend chips hide/show whole kinds. Saved across visits.
  const HIDDEN_KEY = "seroUniverseHidden";
  const FILTER_KINDS: UNode["kind"][] = ["session", "stage", "part", "person", "run", "type", "lexicon"];
  const hidden = new Set<UNode["kind"]>();
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
    if (Array.isArray(saved)) for (const k of saved) if (FILTER_KINDS.includes(k as UNode["kind"])) hidden.add(k as UNode["kind"]);
  } catch { /* fresh start */ }

  // What's actually on screen = the full map, optionally narrowed to one thing's
  // story (focus), minus the hidden kinds (chips). Recomputed on every chip toggle,
  // focus change, and data rebuild.
  let focusId: string | null = null;
  let view = filterUniverse(nodes, edges, hidden);
  let pulses = buildPulses(view.edges);
  function applyView() {
    let base: { nodes: UNode[]; edges: UEdge[] } = { nodes, edges };
    if (focusId) {
      const f = focusUniverse(nodes, edges, focusId);
      if (f) base = f;
      else focusId = null; // the focused thing left the data — back to everything
    }
    view = filterUniverse(base.nodes, base.edges, hidden);
    pulses = buildPulses(view.edges);
    hovered = null;
    renderFocusChip();
    // Whatever the panel showed just got filtered/focused away — close it, keep the camera.
    if (selected && !view.nodes.some((n) => n.id === selected!.id)) { selected = null; renderPanel(null); }
  }
  function setFocus(id: string | null) {
    focusId = id;
    applyView();
    if (id) { const n = byId.get(id); if (n) flyTo(n); }
  }

  // Nodes an Update just added: id -> performance.now() when it arrived, so the frame
  // loop can ring them for a few seconds to point out exactly what changed.
  const spawnedAt = new Map<string, number>();

  // Two star layers: a sky dome fixed at infinity (rotates, never zooms) and world
  // dust that parallaxes as you dive — together the dive feels endless.
  const rand = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const sky = Array.from({ length: 320 }, (_, i) => {
    const u = rand(i) * 2 - 1, a = rand(i + 999) * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return { x: s * Math.cos(a), y: u, z: s * Math.sin(a), m: 0.3 + rand(i + 500) * 0.7 };
  });
  const dust = Array.from({ length: 260 }, (_, i) => ({
    x: (rand(i + 1) - 0.5) * 3200, y: (rand(i + 2) - 0.5) * 3200, z: (rand(i + 3) - 0.5) * 3200,
    m: 0.2 + rand(i + 4) * 0.8,
  }));

  // Camera — yaw/pitch orbit around a target point, exponential zoom. `goal` values
  // are eased toward every frame, which gives the fly-to its glide.
  const cam = { yaw: 0.6, pitch: 0.35, dist: 1400, tx: 0, ty: 0, tz: 0 };
  const goal = { ...cam };
  const FL = 900; // focal length
  let W = 0, H = 0, DPR = 1;
  let hovered: UNode | null = null;
  let selected: UNode | null = null;
  let lastInteract = performance.now();
  let viewShiftX = 0; // screen-space pan so the panel doesn't cover the flown-to node

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = shell.clientWidth; H = shell.clientHeight;
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    // CSS size must stay at the logical size or a DPR > 1 blows the canvas up
    // past the shell (and drags every hit-test off with it).
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx2d.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(shell);
  resize();

  interface P3 { x: number; y: number; s: number; z: number } // screen x/y, scale, depth
  function project(x: number, y: number, z: number): P3 | null {
    const dx = x - cam.tx, dy = y - cam.ty, dz = z - cam.tz;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
    const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
    const depth = z2 + cam.dist;
    if (depth < 24) return null; // behind / inside the camera
    const s = FL / depth;
    return { x: W / 2 + viewShiftX + x1 * s, y: H / 2 - y2 * s, s, z: depth };
  }

  const projected = new Map<string, P3>();

  function flyTo(n: UNode) {
    selected = n;
    goal.tx = n.x; goal.ty = n.y; goal.tz = n.z;
    goal.dist = Math.max(90, n.r * 11);
    renderPanel(n);
  }
  function resetView() {
    selected = null;
    goal.tx = 0; goal.ty = 0; goal.tz = 0; goal.dist = 1400;
    renderPanel(null);
  }

  const panelEl = shell.querySelector<HTMLElement>(".js-panel")!;
  const openRun = (id: string) => setState({ reviewRunId: id, stage: STAGES.REVIEW_RUN });
  const overviewCache = new Map<string, string>(); // runId -> overview text, so re-clicks are instant

  // The dark side drawer. describeNode() (pure, tested) decides what to show for the
  // node's kind; this just turns that model into HTML and slides the panel in. null
  // closes it. People get a clickable 1:1 list, the core the pipeline, a run an "Open".
  function renderPanel(n: UNode | null) {
    if (!n) {
      panelEl.classList.remove("is-open");
      panelEl.setAttribute("aria-hidden", "true");
      shell.classList.remove("has-panel");
      return;
    }
    const col = COLOR[n.kind];
    const m = describeNode(n, (ts) => relTime(ts ?? 0));

    const rowsHtml = m.rows.length
      ? `<div class="uni__rows">${m.rows
          .map((row) => `<div class="uni__row"><span class="rk">${esc(row.k)}</span><span class="rv${row.stars ? " stars" : ""}">${esc(row.v)}</span></div>`)
          .join("")}</div>`
      : "";
    const runsHtml = m.runs
      ? `<div><div class="uni__section-label">Their 1:1s</div><div class="uni__runlist">${m.runs
          .map((r) => `<button type="button" class="uni__runrow" data-run="${esc(r.id)}"><span class="rr-t">${esc(r.title)}</span><span class="rr-s">${esc(r.sub)}</span></button>`)
          .join("")}</div></div>`
      : "";
    const stepsHtml = m.steps
      ? `<div><div class="uni__section-label">How a 1:1 flows</div><ol class="uni__steps">${m.steps
          .map((s) => `<li><span class="st">${esc(s.label)}</span><span class="sb">${esc(s.sub)}</span></li>`)
          .join("")}</ol></div>`
      : "";
    const canFocus = n.kind !== "core" && n.kind !== "part";
    const openBtn = m.openRunId ? `<button type="button" class="primary js-open">Open this run</button>` : "";
    const focusBtn = canFocus
      ? `<button type="button" class="js-focus">${focusId === n.id ? "Show everything" : "Focus on this"}</button>`
      : "";
    const footHtml = openBtn || focusBtn ? `<div class="uni__panel-foot">${openBtn}${focusBtn}</div>` : "";

    panelEl.innerHTML = `
      <div class="uni__panel-head">
        <button type="button" class="uni__panel-close js-close" aria-label="Close">&times;</button>
        <div class="uni__panel-eyebrow" style="color:rgb(${col})">${esc(m.eyebrow)}</div>
        <div class="uni__panel-title">${esc(n.label)}</div>
        <div class="uni__panel-sub">${esc(n.sub)}</div>
      </div>
      <div class="uni__panel-body">${rowsHtml}${runsHtml}${stepsHtml}</div>
      ${footHtml}
    `;
    panelEl.querySelector(".js-close")!.addEventListener("click", resetView);
    panelEl.querySelector(".js-open")?.addEventListener("click", () => { if (n.runId) openRun(n.runId); });
    panelEl.querySelector(".js-focus")?.addEventListener("click", () => setFocus(focusId === n.id ? null : n.id));
    panelEl.querySelectorAll<HTMLButtonElement>(".uni__runrow").forEach((b) => {
      b.addEventListener("click", () => { if (b.dataset.run) openRun(b.dataset.run); });
    });

    // A run's story — lazily pull its saved overview (one free read, cached) and slot
    // it under the facts once it lands, if this run is still the one on screen.
    if (n.kind === "run" && n.runId) {
      const runId = n.runId;
      const body = panelEl.querySelector<HTMLDivElement>(".uni__panel-body")!;
      const sec = document.createElement("div");
      sec.innerHTML = `<div class="uni__section-label">What happened</div><div class="uni__para">Loading the story…</div>`;
      body.appendChild(sec);
      const para = sec.querySelector<HTMLDivElement>(".uni__para")!;
      const show = (text: string) => { if (para.isConnected && selected === n) para.textContent = text || "No overview saved for this one."; };
      const cached = overviewCache.get(runId);
      if (cached != null) show(cached);
      else {
        getRunOverview(runId)
          .then((o) => { const ov = (o as Record<string, unknown>).overview; const text = typeof ov === "string" ? ov.trim() : ""; overviewCache.set(runId, text); show(text); })
          .catch(() => { if (para.isConnected && selected === n) para.textContent = "Couldn't load the overview."; });
      }
    }
    panelEl.classList.add("is-open");
    panelEl.setAttribute("aria-hidden", "false");
    shell.classList.add("has-panel");
  }

  // --- Update button -------------------------------------------------------
  // Re-read the engine's live data, rebuild the map in place, ring whatever's new,
  // and say in one plain line what changed. Read-only; both fetches are free.
  const refreshBtn = shell.querySelector<HTMLButtonElement>(".js-refresh")!;
  const refreshLabel = shell.querySelector<HTMLSpanElement>(".uni__refresh-label")!;
  const statusEl = shell.querySelector<HTMLDivElement>(".js-status")!;
  let statusTimer = 0;
  function setStatus(msg: string, tone: "info" | "good" | "warn") {
    statusEl.textContent = msg;
    statusEl.dataset.tone = tone;
    statusEl.classList.add("is-on");
    clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => statusEl.classList.remove("is-on"), 6000);
  }

  // The ring itself only changes with a code change (which means a page reload), so
  // its "since your last check" memory must survive the reload: one small snapshot
  // in localStorage. First visit just sets the baseline, silently.
  const RING_KEY = "seroUniverseRing";
  function ringSnapshot(): { key: string; label: string }[] | null {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(RING_KEY) || "null");
      return Array.isArray(raw) ? (raw as { key: string; label: string }[]) : null;
    } catch { return null; }
  }
  function saveRing() {
    try { localStorage.setItem(RING_KEY, JSON.stringify(PIPELINE.map(({ key, label }) => ({ key, label })))); } catch { /* private mode */ }
  }
  if (!ringSnapshot()) saveRing();

  // quiet = the minute-timer's background check: no spinner, no "up to date" nag, no
  // unreachable warning — it only speaks (and rings) when something actually changed.
  let refreshing = false;
  async function refresh(quiet = false) {
    if (refreshing) return;
    refreshing = true;
    if (!quiet) {
      refreshBtn.disabled = true;
      refreshBtn.classList.add("is-busy");
      refreshLabel.textContent = "Checking the engine…";
    }
    try {
      const got = await fetchAll();
      if (!shell.isConnected) return; // navigated away mid-fetch
      const reached = got.runs || got.types || got.sessions || got.arcs || got.lexicons;
      if (!reached) { if (!quiet) setStatus("Couldn't reach the engine — try again in a moment.", "warn"); return; }

      // A failed layer keeps its last good data rather than pretending it emptied out.
      runs = got.runs || runs; types = got.types || types; sessions = got.sessions || sessions;
      arcs = got.arcs || arcs; lexicons = got.lexicons || lexicons;
      const next = buildUniverse({ runs, types, sessions, arcs, lexicons });
      const diff = diffUniverse(nodes, next.nodes);
      const ringMsg = ringChanges(ringSnapshot(), PIPELINE);
      if (ringMsg) saveRing(); // announce once, then this ring is the new baseline
      if (quiet && !diff.changed && !ringMsg) return; // background check, nothing new — stay silent
      nodes = next.nodes; edges = next.edges;
      byId = new Map(nodes.map((n) => [n.id, n]));
      applyView();
      // Keep the open card if its light still exists (its details may have moved).
      if (selected) { selected = byId.get(selected.id) || null; renderPanel(selected); }
      updateCounts();
      const now = performance.now();
      for (const id of diff.addedIds) spawnedAt.set(id, now);
      if (ringMsg) setStatus(diff.changed ? `${ringMsg} ${summarizeDiff(diff)}` : ringMsg, "good");
      else if (diff.changed) setStatus(summarizeDiff(diff), "good");
      else setStatus(summarizeDiff(diff), "info");
    } finally {
      if (!quiet) {
        refreshLabel.textContent = "Update from the engine";
        refreshBtn.classList.remove("is-busy");
        refreshBtn.disabled = false;
      }
      refreshing = false;
    }
  }
  refreshBtn.addEventListener("click", () => { void refresh(false); });
  // Watch mode — re-check on its own every minute (same five free reads), so comets
  // appear, move stage to stage, and turn into moons without touching anything.
  const autoTimer = window.setInterval(() => { void refresh(true); }, 60_000);

  // Filter chips — click to hide/show a kind; "Show all" clears every filter.
  const chipEls = [...shell.querySelectorAll<HTMLButtonElement>(".js-chip")];
  const allChip = shell.querySelector<HTMLButtonElement>(".js-chip-all")!;
  const saveHidden = () => { try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden])); } catch { /* private mode */ } };
  function renderChips() {
    for (const b of chipEls) b.classList.toggle("is-off", hidden.has(b.dataset.kind as UNode["kind"]));
    allChip.hidden = hidden.size === 0;
  }
  chipEls.forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.dataset.kind as UNode["kind"];
      if (hidden.has(k)) hidden.delete(k); else hidden.add(k);
      saveHidden(); renderChips(); applyView();
    })
  );
  allChip.addEventListener("click", () => { hidden.clear(); saveHidden(); renderChips(); applyView(); });
  renderChips();

  // Focus chip — shows what the map is narrowed to; click to widen back out.
  const focusChip = shell.querySelector<HTMLButtonElement>(".js-chip-focus")!;
  function renderFocusChip() {
    const n = focusId ? byId.get(focusId) : null;
    focusChip.hidden = !n;
    if (n) focusChip.textContent = `✕ Focusing: ${n.label}`;
  }
  focusChip.addEventListener("click", () => setFocus(null));

  // Find-anything box — searches the FULL map (even filtered-out kinds). Picking a
  // hit un-hides its kind if needed, drops a focus that would hide it, and flies there.
  const searchInput = shell.querySelector<HTMLInputElement>(".js-search")!;
  const searchResults = shell.querySelector<HTMLDivElement>(".js-search-results")!;
  let searchHits: UNode[] = [];
  function renderSearch() {
    searchHits = searchUniverse(nodes, searchInput.value);
    searchResults.hidden = searchHits.length === 0;
    searchResults.innerHTML = searchHits
      .map((n, i) => `<button type="button" class="uni__search-hit${i === 0 ? " is-active" : ""}" data-i="${i}"><b style="background:rgb(${COLOR[n.kind]})"></b><span></span><span class="k">${esc(KIND_WORD[n.kind])}</span></button>`)
      .join("");
    [...searchResults.querySelectorAll<HTMLButtonElement>(".uni__search-hit")].forEach((b, i) => {
      b.querySelector("span")!.textContent = searchHits[i]!.label;
      b.addEventListener("click", () => pickSearch(i));
    });
  }
  function pickSearch(i: number) {
    const hit = searchHits[i];
    if (!hit) return;
    if (hidden.has(hit.kind)) { hidden.delete(hit.kind); saveHidden(); renderChips(); applyView(); }
    if (focusId && !view.nodes.some((v) => v.id === hit.id)) setFocus(null);
    const live = byId.get(hit.id) || hit;
    flyTo(live);
    searchInput.value = "";
    searchResults.hidden = true;
    searchHits = [];
    searchInput.blur();
  }
  searchInput.addEventListener("input", renderSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); pickSearch(0); }
    // Esc in the box just clears the box — it shouldn't also reset the whole view.
    if (e.key === "Escape") { searchInput.value = ""; searchResults.hidden = true; searchHits = []; e.stopPropagation(); }
  });

  function pick(mx: number, my: number): UNode | null {
    let best: UNode | null = null, bestZ = Infinity;
    for (const n of view.nodes) {
      const p = projected.get(n.id);
      if (!p) continue;
      const hit = Math.max(12, n.r * p.s + 6);
      if (Math.hypot(p.x - mx, p.y - my) <= hit && p.z < bestZ) { best = n; bestZ = p.z; }
    }
    return best;
  }

  // --- input ---------------------------------------------------------------
  let dragging = false, moved = false, px = 0, py = 0;
  const onDown = (e: PointerEvent) => {
    dragging = true; moved = false; px = e.clientX; py = e.clientY;
    shell.classList.add("is-dragging");
    canvas.setPointerCapture(e.pointerId);
    lastInteract = performance.now();
  };
  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (dragging) {
      const dx = e.clientX - px, dy = e.clientY - py;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      goal.yaw += dx * 0.005;
      goal.pitch = Math.min(1.4, Math.max(-1.4, goal.pitch + dy * 0.004));
      px = e.clientX; py = e.clientY;
      lastInteract = performance.now();
    } else {
      hovered = pick(e.clientX - rect.left, e.clientY - rect.top);
      canvas.style.cursor = hovered ? "pointer" : "grab";
    }
  };
  const onUp = (e: PointerEvent) => {
    shell.classList.remove("is-dragging");
    if (dragging && !moved) {
      const rect = canvas.getBoundingClientRect();
      const n = pick(e.clientX - rect.left, e.clientY - rect.top);
      if (n) flyTo(n); else { renderPanel(null); selected = null; }
    }
    dragging = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    goal.dist = Math.min(60000, Math.max(60, goal.dist * Math.exp(e.deltaY * 0.0012)));
    lastInteract = performance.now();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") resetView(); };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);

  // --- frame loop ------------------------------------------------------------
  let last = performance.now();
  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Idle auto-drift, then ease camera toward its goal.
    if (!reduceMotion && !dragging && now - lastInteract > 4000 && !selected) goal.yaw += dt * 0.05;
    const k = 1 - Math.exp(-dt * 5);
    cam.yaw += (goal.yaw - cam.yaw) * k;
    cam.pitch += (goal.pitch - cam.pitch) * k;
    cam.dist += (goal.dist - cam.dist) * k;
    cam.tx += (goal.tx - cam.tx) * k;
    cam.ty += (goal.ty - cam.ty) * k;
    cam.tz += (goal.tz - cam.tz) * k;
    // When the panel is open, slide the whole view left by half the panel's width so
    // the selected node sits in the visible half rather than behind the drawer.
    const panelShift = Math.min(440, Math.max(300, W * 0.25)) / 2;
    const shiftGoal = shell.classList.contains("has-panel") ? -panelShift : 0;
    viewShiftX += (shiftGoal - viewShiftX) * k;

    // Space.
    const g = ctx2d.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, "#0a1226");
    g.addColorStop(1, "#03040c");
    ctx2d.fillStyle = g;
    ctx2d.fillRect(0, 0, W, H);

    // Sky dome (infinitely far — rotation-only parallax) with a soft twinkle.
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    for (let i = 0; i < sky.length; i++) {
      const st = sky[i];
      if (!st) continue;
      const x1 = st.x * cy - st.z * sy, z1 = st.x * sy + st.z * cy;
      const y2 = st.y * cp - z1 * sp, z2 = st.y * sp + z1 * cp;
      if (z2 > -0.05) continue; // only the hemisphere in front
      const f = FL / (1.5 + z2 * -1);
      const tw = reduceMotion ? 0.7 : 0.55 + 0.45 * Math.sin(now * 0.001 * st.m * 3 + i);
      ctx2d.fillStyle = `rgba(200,220,255,${(0.35 * st.m * tw).toFixed(3)})`;
      ctx2d.fillRect(W / 2 + x1 * f * 0.9, H / 2 - y2 * f * 0.9, st.m > 0.8 ? 2 : 1, st.m > 0.8 ? 2 : 1);
    }
    // World dust — real depth, so diving through it sells the zoom.
    for (const d of dust) {
      const p = project(d.x, d.y, d.z);
      if (!p) continue;
      const a = Math.min(0.5, 90 * p.s * d.m * 0.01);
      if (a < 0.02) continue;
      ctx2d.fillStyle = `rgba(150,190,255,${a.toFixed(3)})`;
      const sz = Math.max(1, 2.5 * p.s * d.m);
      ctx2d.fillRect(p.x, p.y, sz, sz);
    }

    // Project every visible node once per frame.
    projected.clear();
    for (const n of view.nodes) {
      const p = project(n.x, n.y, n.z);
      if (p) projected.set(n.id, p);
    }

    // Lines.
    for (const e of view.edges) {
      const a = projected.get(e.from), b = projected.get(e.to);
      if (!a || !b) continue;
      const alpha = Math.min(0.5, (a.s + b.s) * 90 * 0.002 + 0.06) * (e.flow >= 2 ? 1 : 0.6);
      ctx2d.strokeStyle = `rgba(120,170,255,${alpha.toFixed(3)})`;
      ctx2d.lineWidth = e.flow >= 2 ? 1.2 : 0.7;
      ctx2d.beginPath();
      ctx2d.moveTo(a.x, a.y);
      ctx2d.lineTo(b.x, b.y);
      ctx2d.stroke();
    }

    // Pulses — additive glow dots travelling along their line. Honesty rule: they only
    // flow while a session is genuinely in flight. When nothing's live, the lines fall
    // completely still — no crawling dots pretending data is moving.
    if (!reduceMotion && liveCount > 0) {
      ctx2d.globalCompositeOperation = "lighter";
      for (const pl of pulses) {
        pl.t = (pl.t + dt * pl.speed) % 1;
        const na = byId.get(pl.edge.from)!, nb = byId.get(pl.edge.to)!;
        const p = project(
          na.x + (nb.x - na.x) * pl.t,
          na.y + (nb.y - na.y) * pl.t,
          na.z + (nb.z - na.z) * pl.t
        );
        if (!p) continue;
        const rr = Math.max(1.2, 26 * p.s);
        const col = COLOR[nb.kind];
        const gg = ctx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        gg.addColorStop(0, `rgba(${col},0.9)`);
        gg.addColorStop(1, `rgba(${col},0)`);
        ctx2d.fillStyle = gg;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalCompositeOperation = "source-over";
    }

    // Nodes, far to near.
    const order = view.nodes
      .map((n) => ({ n, p: projected.get(n.id) }))
      .filter((o): o is { n: UNode; p: P3 } => !!o.p)
      .sort((a, b) => b.p.z - a.p.z);
    const epochNow = Date.now(); // recency runs on wall-clock time, not the animation clock
    for (const { n, p } of order) {
      const col = COLOR[n.kind];
      const R = Math.max(1.5, n.r * p.s);
      // The core only breathes while something's genuinely working; otherwise it holds still.
      const pulse = n.kind === "core" && !reduceMotion && liveCount > 0 ? 1 + Math.sin(now * 0.0016) * 0.08 : 1;
      // Person planets burn by recency: a fresh 1:1 glows full, a dormant one dims to a
      // visible floor — never hidden. Static brightness, so reduced-motion is unaffected.
      const heat = n.kind === "person" ? recencyIntensity(n.lastActiveAt, epochNow) : null;
      const glowA = heat == null ? 0.55 : 0.2 + 0.35 * heat;
      const dotA = heat == null ? 0.95 : 0.55 + 0.4 * heat;
      const glow = ctx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 3 * pulse);
      glow.addColorStop(0, `rgba(${col},${glowA.toFixed(3)})`);
      glow.addColorStop(1, `rgba(${col},0)`);
      ctx2d.fillStyle = glow;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, R * 3 * pulse, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.fillStyle = `rgba(${col},${dotA.toFixed(3)})`;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, R * pulse, 0, Math.PI * 2);
      ctx2d.fill();
      if (n === hovered || n === selected) {
        ctx2d.strokeStyle = `rgba(${col},0.9)`;
        ctx2d.lineWidth = 1.5;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, R + 6, 0, Math.PI * 2);
        ctx2d.stroke();
      }
      // Live-session comets wear a permanent pulsing ring — they're happening NOW.
      if (n.kind === "session") {
        const wob = reduceMotion ? 1 : 1 + Math.sin(now * 0.006 + n.x) * 0.16;
        ctx2d.strokeStyle = `rgba(${col},0.85)`;
        ctx2d.lineWidth = 1.6;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, (R + 8) * wob, 0, Math.PI * 2);
        ctx2d.stroke();
      }
      // "Just arrived" ring — an Update flagged this node; pulse + fade over ~4s so the
      // eye lands on exactly what changed, then forget it.
      const born = spawnedAt.get(n.id);
      if (born != null) {
        const age = now - born;
        if (age > 4000) spawnedAt.delete(n.id);
        else {
          const fade = 1 - age / 4000;
          const grow = reduceMotion ? 1 : 1 + Math.sin(now * 0.008) * 0.18;
          ctx2d.strokeStyle = `rgba(${col},${(0.95 * fade).toFixed(3)})`;
          ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          ctx2d.arc(p.x, p.y, (R + 11) * grow, 0, Math.PI * 2);
          ctx2d.stroke();
        }
      }
      // Labels: always for the core + pipeline, otherwise once you're close (or on it),
      // and always while a node is freshly-arrived so you can read what just landed.
      const wantLabel = n.kind === "core" || n.kind === "stage" || n.kind === "session" || R > 8 || n === hovered || n === selected || spawnedAt.has(n.id);
      if (wantLabel) {
        const size = Math.min(24, Math.max(14, R * 0.8)); // 14px floor holds even in canvas
        const alpha = n === hovered || n === selected ? 1 : Math.min(0.85, p.s * 260 * 0.004 + 0.35);
        ctx2d.font = `600 ${size}px 'Inter Variable', Inter, system-ui, sans-serif`;
        ctx2d.textAlign = "center";
        ctx2d.fillStyle = `rgba(226,238,255,${alpha.toFixed(2)})`;
        ctx2d.shadowColor = "rgba(0,0,0,0.8)";
        ctx2d.shadowBlur = 6;
        ctx2d.fillText(n.label, p.x, p.y - R - 10);
        ctx2d.shadowBlur = 0;
      }
    }
  }
  raf = requestAnimationFrame(frame);

  cleanup = () => {
    cancelAnimationFrame(raf);
    clearInterval(autoTimer);
    ro.disconnect();
    window.removeEventListener("keydown", onKey);
  };
}

export function unmount(): void {
  if (cleanup) { cleanup(); cleanup = null; }
}
