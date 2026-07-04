import "@fontsource-variable/inter";
import "./styles/tailwind.css";
import "./styles/design.css";

import { STAGES, store, subscribe, setState, resetSession, isAdmin } from "./state.js";
import { getSession, listRecentRuns, runRegression, me } from "../../shared/api.js";
import { syncUrl, parseLocation, startPopstate, isFlowStage, isAdminStage, isMemberStage, isSharedStage } from "./router.js";
import { createDevBadge } from "./ui/dev-badge.js";
import { createBuildStamp } from "./ui/build-stamp.js";
import { createSessionTopbar } from "./ui/session-topbar.js";
import { createAppNav } from "./ui/app-nav.js";
import { createProfileBadge } from "./ui/profile-badge.js";
import { createNotesPanel } from "./ui/notes-panel.js";
// Lazy stage modules — kept in a map so HMR + code-split both work nicely.
const loaders = {
  LOGIN:           () => import("./stages/login.js"),
  REGISTER:        () => import("./stages/register.js"),
  PRIVACY:         () => import("./stages/privacy.js"),
  ABOUT:           () => import("./stages/about.js"),
  FEEDBACK:        () => import("./stages/feedback.js"),
  START:           () => import("./stages/start.js"),
  MEMBER_HOME:     () => import("./stages/member-home.js"),
  TEAM:            () => import("./stages/team.ts"),
  RUNS:            () => import("./stages/runs.ts"),
  RUN_DETAIL:      () => import("./stages/run-detail.ts"),
  PERSON_DETAIL:   () => import("./stages/person-detail.ts"),
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
  TASKS:           () => import("./stages/tasks.js"),
  ERROR:           () => import("./stages/error.ts"),
};

const root = document.getElementById("root");
let current = { stage: null, mod: null, node: null };
let renderChain = Promise.resolve();

const devBadge = import.meta.env.DEV ? createDevBadge() : null;

// Always-on build stamp (which API build is live) — see ui/build-stamp.js.
document.body.appendChild(createBuildStamp().el);

const topbar = createSessionTopbar({ store, setState, resetSession });
document.body.appendChild(topbar.el);

const appNav = createAppNav({ setState, resetSession });
document.body.appendChild(appNav.el);

// Top-right "who's signed in" chip — members only (see ui/profile-badge.js).
const profileBadge = createProfileBadge();
document.body.appendChild(profileBadge.el);

// Quietly run the (free, offline, no-AI) regression check and flag the nav with
// a red dot if a saved run has regressed or errored. Re-used live by the
// Regression page after each re-check (passed into stage mounts below).
// Admin-only: /api/regression/run is owner-scoped (401 logged-out, 403 for a
// member), and the nav dot only exists for admins — so this is kicked off from
// boot() once an admin identity is confirmed, never at module load.
async function refreshRegressionAlert(data) {
  try {
    const d = data || await runRegression();
    const s = d?.summary || {};
    appNav.setAlert("regression", (s.regressed || 0) + (s.error || 0) > 0);
  } catch { /* API unreachable — leave the dot off */ }
}

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
  await mod.mount(node, { store, setState, resetSession, rehydrateById, refreshRegressionAlert });
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
  appNav.render({ stage: s.stage, user: s.user });
  profileBadge.render({ stage: s.stage, user: s.user });
  notesPanel.render(s);
  if (s.stage !== routedStage || s.stageTick !== routedTick) {
    routedStage = s.stage;
    routedTick = s.stageTick;
    syncUrl(s);
    enqueueRender(s.stage);
  }
});

startPopstate((parsed) => {
  // A member can't reach an admin screen via back/forward — bounce to their Home.
  if (store.user && isAdminStage(parsed.stage) && !isAdmin(store.user)) {
    setState({ stage: STAGES.MEMBER_HOME });
    return;
  }
  if (parsed.stage === STAGES.REVIEW_RUN) {
    if (parsed.params?.reviewRunId) setState({ reviewRunId: parsed.params.reviewRunId, stage: STAGES.REVIEW_RUN });
    else setState({ stage: STAGES.START });
    return;
  }
  if (parsed.stage === STAGES.RUN_DETAIL) {
    if (parsed.params?.myRunId) setState({ myRunId: parsed.params.myRunId, stage: STAGES.RUN_DETAIL });
    else setState({ stage: STAGES.RUNS });
    return;
  }
  if (parsed.stage === STAGES.PERSON_DETAIL) {
    if (parsed.params?.personKey) setState({ personKey: parsed.params.personKey, stage: STAGES.PERSON_DETAIL });
    else setState({ stage: STAGES.TEAM });
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
  // Auth gate — no entry without a valid session. 401 (or API unreachable) → login.
  let identity = null;
  try { identity = await me(); } catch { /* logged out */ }

  const route = parseLocation();

  if (!identity) {
    // Logged out: only the auth screens + the public privacy note are reachable; honor a
    // /register or /privacy deep link, otherwise send to login.
    let loggedOutStage = STAGES.LOGIN;
    if (route?.stage === STAGES.REGISTER) loggedOutStage = STAGES.REGISTER;
    else if (route?.stage === STAGES.PRIVACY) loggedOutStage = STAGES.PRIVACY;
    setState({ user: null, stage: loggedOutStage });
    return;
  }
  // Logged in — record who, then carry on with the normal boot below. Mutate
  // directly (no notify) so the real stage is what renders, no login flash.
  store.user = { userId: identity.userId, orgId: identity.orgId, roles: identity.roles, email: identity.email, name: identity.name };

  // A plain member gets the member app: Home · Team · Runs, plus the prep flow
  // (member-nav Phase 1). Resume a live session if the URL points at one; honor a member
  // deep link (/home, /team, /runs, /new); otherwise land on Home. Admin screens (run
  // history, library, the internal tooling) are never rendered for a member — the rest
  // of boot below is the owner/admin path.
  if (!isAdmin(store.user)) {
    if (route && isFlowStage(route.stage)) {
      try {
        const id = localStorage.getItem("seroSessionId");
        if (id && await rehydrateById(id)) return;   // resume — syncUrl corrects the URL
      } catch (e) { console.warn("[boot] member rehydrate failed:", e); }
    }
    if (route && route.stage === STAGES.INTAKE) { setState({ stage: STAGES.INTAKE, substage: "NAME" }); return; }
    if (route && route.stage === STAGES.RUN_DETAIL) {
      if (route.params?.myRunId) { setState({ myRunId: route.params.myRunId, stage: STAGES.RUN_DETAIL }); return; }
      history.replaceState(null, "", "/runs"); setState({ stage: STAGES.RUNS }); return;
    }
    if (route && route.stage === STAGES.PERSON_DETAIL) {
      if (route.params?.personKey) { setState({ personKey: route.params.personKey, stage: STAGES.PERSON_DETAIL }); return; }
      history.replaceState(null, "", "/team"); setState({ stage: STAGES.TEAM }); return;
    }
    if (route && isMemberStage(route.stage)) { setState({ stage: route.stage }); return; }
    if (route && isSharedStage(route.stage)) { setState({ stage: route.stage }); return; }
    history.replaceState(null, "", "/home");
    setState({ stage: STAGES.MEMBER_HOME });
    return;
  }

  // Admin/owner from here down — safe to kick off the (admin-only) regression check.
  refreshRegressionAlert();

  if (route?.stage === STAGES.LOGIN || route?.stage === STAGES.REGISTER) {
    setState({ stage: STAGES.START });
    return;
  }

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
