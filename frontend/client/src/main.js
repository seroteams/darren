import "@fontsource-variable/inter";
import "./styles/tailwind.css";
import "./styles/design.css";

import { STAGES, store, subscribe, setState, resetSession } from "./state.js";
import { getSession, listRecentRuns } from "./api.js";
import { syncUrl, parseLocation, startPopstate, isFlowStage } from "./router.js";
import { createDevBadge } from "./ui/dev-badge.js";
import { createSessionTopbar } from "./ui/session-topbar.js";
import { createAppNav } from "./ui/app-nav.js";
import { createNotesPanel } from "./ui/notes-panel.js";
// Lazy stage modules — kept in a map so HMR + code-split both work nicely.
const loaders = {
  START:           () => import("./stages/start.js"),
  INTAKE:          () => import("./stages/intake.js"),
  ONEPAGE:         () => import("./stages/onepage.js"),
  FOCUS_POINTS:    () => import("./stages/focus-points.js"),
  PREPARATION:     () => import("./stages/preparation.js"),
  BANK:            () => import("./stages/bank.js"),
  QUESTIONING:     () => import("./stages/questioning.js"),
  EVAL:            () => import("./stages/eval.js"),
  BRIEFING:        () => import("./stages/briefing.js"),
  LEXICON_REVIEW:  () => import("./stages/lexicon-review.js"),
  RUN_DEBRIEF:     () => import("./stages/run-debrief.js"),
  COMPARE:         () => import("./stages/compare.js"),
  LIBRARY:         () => import("./stages/library.js"),
  ROLE_LEXICONS:   () => import("./stages/job-lexicons.js"),
  MEETING_ARCS:    () => import("./stages/meeting-arcs.js"),
  REGRESSION:      () => import("./stages/regression.js"),
  PERSONAS:        () => import("./stages/personas.js"),
  REVIEW_RUN:      () => import("./stages/review-run.js"),
  GUIDE:           () => import("./stages/guide.js"),
  ERROR:           () => import("./stages/error.js"),
};

const root = document.getElementById("root");
let current = { stage: null, mod: null, node: null };
let renderChain = Promise.resolve();

const devBadge = import.meta.env.DEV ? createDevBadge() : null;

const topbar = createSessionTopbar({ store, setState, resetSession });
document.body.appendChild(topbar.el);

const appNav = createAppNav({ setState, resetSession });
document.body.appendChild(appNav.el);

const notesPanel = createNotesPanel({ store, setState });
document.body.appendChild(notesPanel.el);
if (devBadge) notesPanel.mountDevBadge(devBadge.el);

async function renderStage(nextStage) {
  if (!loaders[nextStage]) {
    console.error("[main] unknown stage:", nextStage);
    return;
  }
  // Unmount previous
  if (current.mod && typeof current.mod.unmount === "function") {
    try { await current.mod.unmount(current.node); } catch (e) { console.error(e); }
  }
  if (current.node && current.node.parentNode) current.node.remove();

  // Mount next
  const mod = await loaders[nextStage]();
  const node = document.createElement("section");
  node.className = "stage stage-enter";
  root.appendChild(node);
  requestAnimationFrame(() => node.classList.add("is-in"));
  current = { stage: nextStage, mod, node };
  if (devBadge) devBadge.render(nextStage);
  await mod.mount(node, { store, setState, resetSession, rehydrateById });
}

function enqueueRender(nextStage) {
  renderChain = renderChain
    .then(() => renderStage(nextStage))
    .catch((e) => console.error("[main] render failed:", e));
}

let routedStage = null;
let routedTick = null;
subscribe((s) => {
  topbar.render({ ctx: s.ctx, stage: s.stage, sessionId: s.sessionId });
  appNav.render({ stage: s.stage });
  notesPanel.render(s);
  if (s.stage !== routedStage || s.stageTick !== routedTick) {
    routedStage = s.stage;
    routedTick = s.stageTick;
    syncUrl(s);
    enqueueRender(s.stage);
  }
});

startPopstate((parsed) => {
  if (parsed.stage === STAGES.REVIEW_RUN) {
    if (parsed.params?.reviewRunId) setState({ reviewRunId: parsed.params.reviewRunId, stage: STAGES.REVIEW_RUN });
    else setState({ stage: STAGES.START });
    return;
  }
  if (isFlowStage(parsed.stage)) {                 // only valid with a live session
    if (store.sessionId) setState({ stage: parsed.stage, stageTick: store.stageTick + 1 });
    else setState({ stage: STAGES.START });
    return;
  }
  if (parsed.stage === STAGES.INTAKE) { setState({ stage: STAGES.INTAKE, substage: "NAME" }); return; }
  setState({ stage: parsed.stage });               // START / COMPARE / LEXICON_REVIEW
});

export async function rehydrateById(id) {
  try {
    const snap = await getSession(id);
    if (!snap || !snap.sessionId) {
      try { localStorage.removeItem("seroSessionId"); } catch {}
      return false;
    }
    try { localStorage.setItem("seroSessionId", id); } catch {}
    setState({
      sessionId: snap.sessionId,
      stage: snap.stage,
      substage: defaultSubstage(snap.stage),
      turn: snap.turn || 0,
      totalBudget: snap.totalBudget || 8,
      ctx: snap.ctx || store.ctx,
      focusPoints: snap.focusPoints?.focus_points || null,
      preparation: snap.preparation?.brief || null,
      preparationRunId: snap.preparation?.runId || null,
      axes: snap.axes || [],
      briefing: snap.briefing || null,
      notes: snap.notes || [],
      sessionDir: snap.sessionDir || null,
      createdAt: snap.createdAt ?? null,
      completedAt: snap.completedAt ?? snap.briefing?.completedAt ?? null,
      skipBriefingAnimation: snap.stage === STAGES.BRIEFING && !!snap.briefing,
      scripted: snap.scripted || null,
    });
    return true;
  } catch (e) {
    console.warn("[rehydrateById] failed:", e);
    return false;
  }
}

async function boot() {
  const route = parseLocation();

  // /run/:id deep link — id comes from URL, no session needed.
  if (route?.stage === STAGES.REVIEW_RUN) {
    if (route.params?.reviewRunId) { setState({ reviewRunId: route.params.reviewRunId, stage: STAGES.REVIEW_RUN }); return; }
    history.replaceState(null, "", "/"); setState({ stage: STAGES.START }); return;
  }

  let rehydrated = false;
  try {
    const id = localStorage.getItem("seroSessionId");
    if (id) rehydrated = await rehydrateById(id);
  } catch (e) {
    console.warn("[boot] rehydrate failed:", e);
  }

  // Flow paths require a live session; rehydrate decides the real stage.
  if (route && isFlowStage(route.stage)) {
    if (rehydrated) return;                          // syncUrl will correct URL to the true stage
    history.replaceState(null, "", "/"); setState({ stage: STAGES.START }); return;
  }

  // Explicit standalone path wins over a non-flow default (compare / lexicon / new).
  if (route && route.stage && route.stage !== STAGES.START) {
    if (route.stage === STAGES.INTAKE) setState({ stage: STAGES.INTAKE, substage: "NAME" });
    else setState({ stage: route.stage });
    return;
  }

  // Path is "/" (or unknown): live session resumes; else existing default.
  if (rehydrated) return;

  // No active session — pick START if past runs exist, else jump to INTAKE.
  let hasRecent = false;
  try {
    const { runs } = await listRecentRuns(3);
    hasRecent = Array.isArray(runs) && runs.length > 0;
  } catch (e) {
    console.warn("[boot] listRecentRuns failed:", e);
  }
  if (hasRecent) {
    setState({ stage: STAGES.START });
  } else {
    setState({ stage: STAGES.INTAKE, substage: "NAME" });
  }
}

function defaultSubstage(stage) {
  if (stage === STAGES.INTAKE) return "NAME";
  if (stage === STAGES.QUESTIONING) return "Q_SHOW";
  return null;
}

boot();
