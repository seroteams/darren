// Customer app entry (frontend-admin-split Phase 2) — the customer subset of
// admin/src/main.js. Same store, same stage modules (cross-imported from
// ../admin/src until Phase 3 physically moves them), but the loader map only
// knows the customer stages: the internal toolset (Library, Test engine,
// Universe, Tasks, lexicons, superadmin screens) is not imported anywhere in
// this app, so none of it reaches the customer bundle.
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque"; // display headings (DESIGN.md §3)
import "../../admin/src/styles/tailwind.css";
import "../../admin/src/styles/design.css";

import { STAGES, store, subscribe, setState, resetSession, isAdmin } from "../../admin/src/state.js";
import { getSession, listRecentRuns, me } from "../../shared/api.js";
import { syncUrl, parseLocation, startPopstate, isFlowStage, isMemberStage, isSharedStage, isGuestStage } from "./router.js";
import { createDevBadge } from "../../admin/src/ui/dev-badge.js";
import { createBuildStamp } from "../../admin/src/ui/build-stamp.js";
import { createSessionTopbar } from "../../admin/src/ui/session-topbar.js";
import { createAppNav } from "./ui/app-nav.js";
import { createProfileBadge } from "../../admin/src/ui/profile-badge.js";
import { createNotesPanel } from "../../admin/src/ui/notes-panel.js";
import { installGlobalErrorReporter, reportError } from "../../admin/src/ui/error-reporter.js";
// Lazy stage modules — customer stages only.
const loaders = {
  // Customer-owned screens live HERE (frontend-admin-split Phase 3); the rest
  // are cross-imported shared screens. START is the benchless core — the
  // persona bench (internal QA) exists only in the admin app's start.js (F-005).
  WELCOME:         () => import("./stages/welcome.ts"),
  LOGIN:           () => import("../../admin/src/stages/login.js"),
  JOIN:            () => import("./stages/join.js"),
  REGISTER:        () => import("../../admin/src/stages/register.js"),
  PRIVACY:         () => import("../../admin/src/stages/privacy.js"),
  ABOUT:           () => import("../../admin/src/stages/about.js"),
  FEEDBACK:        () => import("../../admin/src/stages/feedback.js"),
  START:           () => import("../../admin/src/stages/start-core.js"),
  MEMBER_HOME:     () => import("./stages/member-home.js"),
  TEAM:            () => import("./stages/team.ts"),
  RUNS:            () => import("../../admin/src/stages/runs.ts"),
  RUN_DETAIL:      () => import("../../admin/src/stages/run-detail.ts"),
  PERSON_DETAIL:   () => import("./stages/person-detail.ts"),
  INTAKE:          () => import("../../admin/src/stages/intake.js"),
  ONEPAGE:         () => import("../../admin/src/stages/onepage.js"),
  FOCUS_POINTS:    () => import("../../admin/src/stages/focus-points.js"),
  PREPARATION:     () => import("./stages/preparation.ts"), // customer-owned (prepare-variants); admin keeps its own copy
  BANK:            () => import("../../admin/src/stages/bank.js"),
  QUESTIONING:     () => import("../../admin/src/stages/questioning.js"),
  EVAL:            () => import("../../admin/src/stages/eval.js"),
  BRIEFING:        () => import("../../admin/src/stages/briefing.js"),
  RUN_DEBRIEF:     () => import("../../admin/src/stages/run-debrief.js"),
  REVIEW_RUN:      () => import("../../admin/src/stages/review-run.js"),
  ERROR:           () => import("../../admin/src/stages/error.ts"),
};

const root = document.getElementById("root");
// Catch browser crashes / unhandled rejections and forward them to the Error log.
installGlobalErrorReporter();
let current = { stage: null, mod: null, node: null };
let renderChain = Promise.resolve();

const devBadge = import.meta.env.DEV ? createDevBadge() : null;

// Always-on build stamp (which API build is live).
document.body.appendChild(createBuildStamp().el);

const topbar = createSessionTopbar({ store, setState, resetSession });
document.body.appendChild(topbar.el);

const appNav = createAppNav({ setState, resetSession });
document.body.appendChild(appNav.el);

// Top-right "who's signed in" chip — members only.
const profileBadge = createProfileBadge();
document.body.appendChild(profileBadge.el);

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
    .catch((e) => { console.error("[main] render failed:", e); reportError((e && e.message) || "Stage render failed"); });
}

let routedStage = null;
let routedTick = null;
subscribe((s) => {
  topbar.render({ ctx: s.ctx, stage: s.stage, sessionId: s.sessionId });
  appNav.render({ stage: s.stage, user: s.user });
  profileBadge.render({ stage: s.stage, user: s.user });
  notesPanel.render(s);
  if (s.stage !== routedStage || s.stageTick !== routedTick) {
    // Remember where we came from so the Privacy note's Back link returns there.
    if (s.stage === STAGES.PRIVACY && routedStage && routedStage !== STAGES.PRIVACY) {
      store.privacyBack = routedStage;
    }
    routedStage = s.stage;
    routedTick = s.stageTick;
    syncUrl(s);
    enqueueRender(s.stage);
  }
});

startPopstate((parsed) => {
  // A guest (no account, guest-run Phase 2) only has the guest lane — intake, the
  // run stages, and the auth/content pages. Back/forward onto "/" is the guest-first
  // start screen (start-screen); any other destination bounces to login.
  if (!store.user
      && !isGuestStage(parsed.stage) && !isSharedStage(parsed.stage)
      && parsed.stage !== STAGES.LOGIN && parsed.stage !== STAGES.REGISTER
      && parsed.stage !== STAGES.JOIN) {
    setState({ stage: parsed.stage === STAGES.START ? STAGES.WELCOME : STAGES.LOGIN });
    return;
  }
  // A plain member only has the 1:1s prepped about them (member-view: about-me only) — any
  // other back/forward destination (the prep flow, Team, the manager RUNS view) bounces to
  // their home. Their own run detail and shared content pages pass through.
  if (store.user && !isAdmin(store.user) && !isMemberStage(parsed.stage) && !isSharedStage(parsed.stage)) {
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
    else setState({ stage: isAdmin(store.user) ? STAGES.RUNS : STAGES.MEMBER_HOME });
    return;
  }
  if (parsed.stage === STAGES.JOIN) {
    if (parsed.params?.joinToken) setState({ joinToken: parsed.params.joinToken, stage: STAGES.JOIN });
    else setState({ stage: STAGES.LOGIN });
    return;
  }
  if (parsed.stage === STAGES.PERSON_DETAIL) {
    if (parsed.params?.personKey) setState({ personKey: parsed.params.personKey, stage: STAGES.PERSON_DETAIL });
    else setState({ stage: STAGES.TEAM });
    return;
  }
  if (isFlowStage(parsed.stage)) {                 // only valid with a live session
    if (store.sessionId) setState({ stage: parsed.stage, stageTick: store.stageTick + 1 });
    // No session: a logged-in user goes home; a guest goes to the start screen.
    else setState({ stage: store.user ? STAGES.START : STAGES.WELCOME });
    return;
  }
  if (parsed.stage === STAGES.INTAKE) { setState({ stage: STAGES.INTAKE, substage: "NAME" }); return; }
  setState({ stage: parsed.stage });               // START / content pages
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
    // Logged out: the auth screens, the public privacy note, and the GUEST lane
    // (guest-run Phase 2) are reachable — intake plus a mid-run reload back into a
    // live guest session (the id in localStorage is the way back in; the server
    // already lets an anonymous caller reach an ownerless session). Anything else
    // sends to login.
    if (route?.stage === STAGES.INTAKE) {
      setState({ user: null, stage: STAGES.INTAKE, substage: "NAME" });
      return;
    }
    if (route && isGuestStage(route.stage)) {
      let rehydrated = false;
      try {
        const id = localStorage.getItem("seroSessionId");
        if (id) rehydrated = await rehydrateById(id); // sets the real stage from the snapshot
      } catch (e) {
        console.warn("[boot] guest rehydrate failed:", e);
      }
      if (!rehydrated) setState({ user: null, stage: STAGES.WELCOME });
      return;
    }
    // The front door (start-screen): a fresh visitor on "/" — or any unknown
    // path — gets the guest-first start screen, not the login form. Explicit
    // /login, /register and /privacy deep links still work; every other known
    // page stays behind login.
    // A one-time join link works logged-out — that's its whole point
    // (member-onboarding-invites). Token rides in store for the JOIN stage.
    if (route?.stage === STAGES.JOIN && route.params?.joinToken) {
      setState({ user: null, joinToken: route.params.joinToken, stage: STAGES.JOIN });
      return;
    }
    let loggedOutStage = STAGES.WELCOME;
    if (route?.stage === STAGES.LOGIN) loggedOutStage = STAGES.LOGIN;
    else if (route?.stage === STAGES.REGISTER) loggedOutStage = STAGES.REGISTER;
    else if (route?.stage === STAGES.PRIVACY) loggedOutStage = STAGES.PRIVACY;
    else if (route && route.stage !== STAGES.START) loggedOutStage = STAGES.LOGIN;
    setState({ user: null, stage: loggedOutStage });
    return;
  }
  // Logged in — record who, then carry on with the normal boot below. Mutate
  // directly (no notify) so the real stage is what renders, no login flash.
  store.user = { userId: identity.userId, orgId: identity.orgId, roles: identity.roles, email: identity.email, name: identity.name, isSuperadmin: identity.isSuperadmin };

  // A plain member gets a read-only app: the 1:1s prepped ABOUT them, and nothing else
  // (member-view: about-me only). They can't start or run a 1:1, and Home/Team are gone.
  // Honor a deep link to one of their own runs or a shared content page
  // (privacy/about/feedback); anything else — the prep flow, Team, the manager RUNS view —
  // lands on their home. The rest of boot below is the manager path.
  if (!isAdmin(store.user)) {
    if (route && route.stage === STAGES.RUN_DETAIL) {
      if (route.params?.myRunId) { setState({ myRunId: route.params.myRunId, stage: STAGES.RUN_DETAIL }); return; }
      history.replaceState(null, "", "/home"); setState({ stage: STAGES.MEMBER_HOME }); return;
    }
    if (route && isMemberStage(route.stage)) { setState({ stage: route.stage }); return; }
    if (route && isSharedStage(route.stage)) { setState({ stage: route.stage }); return; }
    history.replaceState(null, "", "/home");
    setState({ stage: STAGES.MEMBER_HOME });
    return;
  }

  // Manager from here down.
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

  // Explicit standalone path wins over a non-flow default.
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
