import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque"; // display headings (DESIGN.md §3)
import "./styles/tailwind.css";
import "./styles/design.css";

import { STAGES, store, subscribe, setState, resetSession, isAdmin, isInternalAdmin, isSuperadmin } from "./state.js";
import { getSession, listRecentRuns, runRegression, me } from "../../shared/api.js";
import { syncUrl, parseLocation, startPopstate, isFlowStage, isInternalStage, isMemberStage, isSharedStage, isGuestStage, isSuperadminStage } from "./router.js";
import { createDevBadge } from "./ui/dev-badge.js";
import { createBuildStamp } from "./ui/build-stamp.js";
import { createSessionTopbar } from "./ui/session-topbar.js";
import { createAppNav } from "./ui/app-nav.js";
import { createProfileBadge } from "./ui/profile-badge.js";
import { createNotesPanel } from "./ui/notes-panel.js";
import { installGlobalErrorReporter, reportError } from "./ui/error-reporter.js";
// Lazy stage modules — kept in a map so HMR + code-split both work nicely.
const loaders = {
  // The customer shell (welcome/join/team/person-detail) lives in the customer
  // app now (frontend-admin-split Phase 3). MEMBER_HOME is kept only because the
  // shared login.js still lands members there — it cross-imports the moved file.
  LOGIN:           () => import("./stages/login.js"),
  REGISTER:        () => import("./stages/register.js"),
  FORGOT_PASSWORD: () => import("./stages/forgot-password.js"),
  RESET_PASSWORD:  () => import("./stages/reset-password.js"),
  PRIVACY:         () => import("./stages/privacy.js"),
  ABOUT:           () => import("./stages/about.js"),
  FEEDBACK:        () => import("./stages/feedback.js"),
  START:           () => import("./stages/start.js"),
  MEMBER_HOME:     () => import("../../frontend/src/stages/member-home.js"),
  RUNS:            () => import("./stages/runs.ts"),
  RUN_DETAIL:      () => import("./stages/run-detail.ts"),
  INTAKE:          () => import("./stages/intake.js"),
  ONEPAGE:         () => import("./stages/onepage.js"),
  FOCUS_POINTS:    () => import("./stages/focus-points.js"),
  PREPARATION:     () => import("../../frontend/src/stages/preparation.ts"), // customer-owned rebuild (prepare-variants); old screen kept at ./stages/preparation.js
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
  PERSONAS:        () => import("./stages/personas.js"),
  REVIEW_RUN:      () => import("./stages/review-run.js"),
  GUIDE:           () => import("./stages/guide.js"),
  TASKS:           () => import("./stages/tasks.js"),
  UNIVERSE:        () => import("./stages/universe.ts"),
  ADMIN_REGISTERED: () => import("./stages/admin-registered.ts"),
  ADMIN_USER:      () => import("./stages/admin-user-detail.ts"),
  ADMIN_ERROR_LOG: () => import("./stages/admin-error-log.ts"),
  ADMIN_FEEDBACK:  () => import("./stages/admin-feedback.ts"),
  ADMIN_GUEST_RUNS: () => import("./stages/admin-guest-runs.ts"),
  DESIGN:          () => import("./stages/design.js"),
  TEST:            () => import("./stages/test.js"),
  GUIDED:          () => import("../../frontend/src/stages/guided/guided.page.ts"), // Monthly Check-in runner (customer-owned so Phase 7 can reuse it)
  ERROR:           () => import("./stages/error.ts"),
};

const root = document.getElementById("root");
// Catch browser crashes / unhandled rejections and forward them to the Error log (error-log Phase 3).
installGlobalErrorReporter();
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
    appNav.setAlert("personas", (s.regressed || 0) + (s.error || 0) > 0);
  } catch { /* API unreachable — leave the dot off */ }
}

const notesPanel = createNotesPanel({ store, setState });
document.body.appendChild(notesPanel.el);
if (devBadge) notesPanel.mountDevBadge(devBadge.el);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Quick fade-out of the outgoing stage node. Resolves when the fade ends (or
// immediately under reduced-motion / on first paint). Renders are serialized by
// renderChain, so the outgoing and incoming stages never coexist — this reads as
// a clean cross-dissolve, not two stacked screens.
function fadeOutStage(node) {
  if (!node || !node.parentNode || reducedMotion.matches) return Promise.resolve();
  return new Promise((resolve) => {
    node.classList.add("stage-exit");
    requestAnimationFrame(() => node.classList.add("is-out"));
    let done = false;
    const finish = () => { if (done) return; done = true; resolve(); };
    node.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 200); // safety net if transitionend never fires
  });
}

async function renderStage(nextStage) {
  if (!loaders[nextStage]) {
    console.error("[main] unknown stage:", nextStage);
    return;
  }
  // Fade the outgoing stage out first, then unmount + remove it.
  await fadeOutStage(current.node);
  if (current.mod && typeof current.mod.unmount === "function") {
    try { await current.mod.unmount(current.node); } catch (e) { console.error(e); }
  }
  if (current.node && current.node.parentNode) current.node.remove();

  // Mount next
  const mod = await loaders[nextStage]();
  const node = document.createElement("section");
  node.className = "stage stage-enter";
  root.appendChild(node);
  // Every screen starts at the top — the previous screen's scroll position was
  // carrying over, so the new screen opened mid-page (phone walk 2026-07-11).
  window.scrollTo(0, 0);
  requestAnimationFrame(() => node.classList.add("is-in"));
  current = { stage: nextStage, mod, node };
  if (devBadge) devBadge.render(nextStage);
  await mod.mount(node, { store, setState, resetSession, rehydrateById, refreshRegressionAlert });
}

function enqueueRender(nextStage) {
  renderChain = renderChain
    .then(() => renderStage(nextStage))
    .catch((e) => { console.error("[main] render failed:", e); reportError((e && e.message) || "Stage render failed"); });
}

let routedStage = null;
let routedTick = null;
subscribe((s) => {
  topbar.render({ ctx: s.ctx, stage: s.stage, sessionId: s.sessionId, user: s.user });
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
  // The password-reset screens are reachable in any auth state — handle them first so the
  // token rides into state and neither the logged-out gate nor the member/admin routing
  // below can bounce them.
  if (parsed.stage === STAGES.FORGOT_PASSWORD || parsed.stage === STAGES.RESET_PASSWORD) {
    setState({ resetToken: parsed.params?.resetToken || null, stage: parsed.stage });
    return;
  }
  // Logged out on the ADMIN app: the guest QA lane (intake + run stages) and the
  // auth/content pages are reachable; everything else bounces to login. The guest
  // front door (WELCOME) and join links live in the customer app now
  // (frontend-admin-split Phase 3).
  if (!store.user
      && !isGuestStage(parsed.stage) && !isSharedStage(parsed.stage)
      && parsed.stage !== STAGES.LOGIN && parsed.stage !== STAGES.REGISTER) {
    setState({ stage: STAGES.LOGIN });
    return;
  }
  // A plain member only has their past 1:1s (member-view: only-runs) — any other
  // back/forward destination (admin screens, the prep flow, Team, the old Home) bounces to
  // Past 1:1s. Their own runs (RUNS / RUN_DETAIL) and shared content pages pass through.
  if (store.user && !isAdmin(store.user) && !isMemberStage(parsed.stage) && !isSharedStage(parsed.stage)) {
    setState({ stage: STAGES.RUNS });
    return;
  }
  // A manager can't reach the internal toolset via back/forward — bounce to their Home
  // (manager-ready Phase 1). Cosmetic wall; the backend 403s stay the real one.
  if (store.user && isInternalStage(parsed.stage) && !isInternalAdmin(store.user)) {
    setState({ stage: STAGES.START });
    return;
  }
  // The /admin/* superadmin screens are off-limits to a normal manager/admin — bounce
  // to Home (F-009). The backend 403s the data; this keeps the shell out of reach too.
  if (store.user && isSuperadminStage(parsed.stage) && !isSuperadmin(store.user)) {
    setState({ stage: STAGES.START });
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
  if (parsed.stage === STAGES.ADMIN_USER) {
    if (parsed.params?.adminUserId) setState({ adminUserId: parsed.params.adminUserId, stage: STAGES.ADMIN_USER });
    else setState({ stage: STAGES.ADMIN_REGISTERED });
    return;
  }
  if (parsed.stage === STAGES.GUIDED) {
    if (parsed.params?.guidedId) setState({ guidedId: parsed.params.guidedId, stage: STAGES.GUIDED });
    else setState({ stage: STAGES.START });
    return;
  }
  if (isFlowStage(parsed.stage)) {                 // only valid with a live session
    if (store.sessionId) setState({ stage: parsed.stage, stageTick: store.stageTick + 1 });
    // No session: a logged-in user goes home; a guest goes to login.
    else setState({ stage: store.user ? STAGES.START : STAGES.LOGIN });
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

  // The password-reset screens (forgot-password, reset-password/:token) are reachable in
  // ANY auth state — a logged-out user following an emailed link, or a logged-in user who
  // clicked it. Handle them before the auth gate so the token rides into state and the
  // normal routing can't bounce them to login/home.
  if (route && (route.stage === STAGES.FORGOT_PASSWORD || route.stage === STAGES.RESET_PASSWORD)) {
    if (identity) store.user = { userId: identity.userId, orgId: identity.orgId, roles: identity.roles, email: identity.email, name: identity.name, isSuperadmin: identity.isSuperadmin };
    setState({ resetToken: route.params?.resetToken || null, stage: route.stage });
    return;
  }

  if (!identity) {
    // Logged out on the ADMIN app: the auth screens, the public privacy note, and
    // the guest QA lane (intake plus a mid-run reload back into a live ownerless
    // session) are reachable. Everything else — including "/" — sends to login:
    // the guest-first front door (WELCOME) and join links live in the customer
    // app now (frontend-admin-split Phase 3).
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
      if (!rehydrated) setState({ user: null, stage: STAGES.LOGIN });
      return;
    }
    let loggedOutStage = STAGES.LOGIN;
    if (route?.stage === STAGES.REGISTER) loggedOutStage = STAGES.REGISTER;
    else if (route?.stage === STAGES.PRIVACY) loggedOutStage = STAGES.PRIVACY;
    setState({ user: null, stage: loggedOutStage });
    return;
  }
  // Logged in — record who, then carry on with the normal boot below. Mutate
  // directly (no notify) so the real stage is what renders, no login flash.
  store.user = { userId: identity.userId, orgId: identity.orgId, roles: identity.roles, email: identity.email, name: identity.name, isSuperadmin: identity.isSuperadmin };

  // A plain member gets a read-only app: their own past 1:1s, and nothing else
  // (member-view: only-runs). They can't start or run a 1:1, and Home/Team are gone. Honor
  // a deep link to one of their own runs or a shared content page (privacy/about/feedback);
  // anything else — the prep flow, Team, the old Home, any admin screen — lands on Past
  // 1:1s. The rest of boot below is the owner/admin path.
  if (!isAdmin(store.user)) {
    if (route && route.stage === STAGES.RUN_DETAIL) {
      if (route.params?.myRunId) { setState({ myRunId: route.params.myRunId, stage: STAGES.RUN_DETAIL }); return; }
      history.replaceState(null, "", "/runs"); setState({ stage: STAGES.RUNS }); return;
    }
    if (route && isMemberStage(route.stage)) { setState({ stage: route.stage }); return; }
    if (route && isSharedStage(route.stage)) { setState({ stage: route.stage }); return; }
    history.replaceState(null, "", "/runs");
    setState({ stage: STAGES.RUNS });
    return;
  }

  // A manager deep-linking the internal toolset lands on their Home instead
  // (manager-ready Phase 1). Before the regression kick-off — that's internal-only too.
  if (!isInternalAdmin(store.user) && route && isInternalStage(route.stage)) {
    history.replaceState(null, "", "/");
    setState({ stage: STAGES.START });
    return;
  }

  // A non-superadmin deep-linking an /admin/* superadmin screen lands on Home (F-009).
  if (!isSuperadmin(store.user) && route && isSuperadminStage(route.stage)) {
    history.replaceState(null, "", "/");
    setState({ stage: STAGES.START });
    return;
  }

  // Admin/owner from here down — safe to kick off the (admin-only) regression check.
  if (isInternalAdmin(store.user)) refreshRegressionAlert();

  if (route?.stage === STAGES.LOGIN || route?.stage === STAGES.REGISTER) {
    setState({ stage: STAGES.START });
    return;
  }

  // /run/:id deep link — id comes from URL, no session needed.
  if (route?.stage === STAGES.REVIEW_RUN) {
    if (route.params?.reviewRunId) { setState({ reviewRunId: route.params.reviewRunId, stage: STAGES.REVIEW_RUN }); return; }
    history.replaceState(null, "", "/"); setState({ stage: STAGES.START }); return;
  }

  // /admin/users/:id deep link (PG8) — id from URL; the name isn't in the URL, so the
  // page shows a generic title until it loads. Falls back to the Registered list.
  if (route?.stage === STAGES.ADMIN_USER) {
    if (route.params?.adminUserId) { setState({ adminUserId: route.params.adminUserId, stage: STAGES.ADMIN_USER }); return; }
    history.replaceState(null, "", "/admin/registered"); setState({ stage: STAGES.ADMIN_REGISTERED }); return;
  }

  // /guided/:id deep link — a Monthly Check-in resumed by URL (reload-resume). id from the
  // URL; the runner fetches the session and lands on its saved stage. Internal-only (the
  // isInternalStage gate above already bounced a corridor manager). Falls back to Home.
  if (route?.stage === STAGES.GUIDED) {
    if (route.params?.guidedId) { setState({ guidedId: route.params.guidedId, stage: STAGES.GUIDED }); return; }
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
