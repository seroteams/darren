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

import { STAGES, store, setState, resetSession, isAdmin } from "../../admin/src/state.ts";
import { me } from "../../shared/api.js";
import { syncUrl, parseLocation, startPopstate, isFlowStage, isMemberStage, isSharedStage, isGuestStage } from "./router.js";
import { createAppNav } from "./ui/app-nav.js";
import { createProfileBadge } from "../../admin/src/ui/profile-badge.js";
import { applyEnvFavicon } from "../../admin/src/ui/favicon-env.ts";
// The shared shell: chrome, render loop, stale-chunk recovery, rehydrate
// (refactor-2026-07 P7). This app's own gates live in boot()/popstate below.
import { startShell, rehydrateById } from "../../admin/src/boot-shell.js";

// Tab icon: sky-blue brand tile on the live site, charcoal on a local machine.
applyEnvFavicon();

// This app's member home (audit B1): a plain member lands on MEMBER_HOME. Injected once so
// the shared login/register resolver lands them where a reload does — no split-brain.
store.memberHome = STAGES.MEMBER_HOME;

// This app's front door for a signed-out guest (guest-discard fix): discarding/exiting a
// prep without an account returns here, not the signed-in home (START).
store.guestHome = STAGES.WELCOME;

// Lazy stage modules — customer stages only.
const loaders = {
  // Customer-owned screens live HERE (frontend-admin-split Phase 3); the rest
  // are cross-imported shared screens. START is the benchless core — the
  // persona bench (internal QA) exists only in the admin app's start.js (F-005).
  WELCOME:         () => import("./stages/welcome.ts"),
  LOGIN:           () => import("../../admin/src/stages/login.js"),
  JOIN:            () => import("./stages/join.js"),
  REGISTER:        () => import("../../admin/src/stages/register.js"),
  FORGOT_PASSWORD: () => import("../../admin/src/stages/forgot-password.js"),
  RESET_PASSWORD:  () => import("../../admin/src/stages/reset-password.js"),
  PRIVACY:         () => import("../../admin/src/stages/privacy.js"),
  ABOUT:           () => import("../../admin/src/stages/about.js"),
  FEEDBACK:        () => import("../../admin/src/stages/feedback.js"),
  START:           () => import("../../admin/src/stages/start-core.js"),
  MEMBER_HOME:     () => import("./stages/member-home.js"),
  TEAM:            () => import("./stages/team.ts"),
  MEMBERS:         () => import("./stages/members.ts"),
  RUNS:            () => import("../../admin/src/stages/runs.ts"),
  RUN_DETAIL:      () => import("../../admin/src/stages/run-detail.ts"),
  GUIDED:          () => import("./stages/guided/guided.page.ts"), // Monthly Check-in runner (managers, 2026-07-19)
  PERSON_DETAIL:   () => import("./stages/person-detail.ts"),
  INTAKE:          () => import("../../admin/src/stages/intake.js"),
  FOCUS_POINTS:    () => import("../../admin/src/stages/focus-points.js"),
  PREPARATION:     () => import("./stages/preparation.ts"), // customer-owned (prepare-variants); admin imports this same file
  BANK:            () => import("../../admin/src/stages/bank.js"),
  QUESTIONING:     () => import("../../admin/src/stages/questioning.js"),
  EVAL:            () => import("../../admin/src/stages/eval.js"),
  BRIEFING:        () => import("../../admin/src/stages/briefing.js"),
  RUN_DEBRIEF:     () => import("../../admin/src/stages/run-debrief.js"),
  REVIEW_RUN:      () => import("../../admin/src/stages/review-run.js"),
  ERROR:           () => import("../../admin/src/stages/error.ts"),
};

const appNav = createAppNav({ setState, resetSession });
// Top-right "who's signed in" chip — a click-to-open menu (Privacy + Account) for
// the customer app. `customer:true` forces the customer menu even for an admin
// visitor (the frontend has no internal surface); setState drives the Privacy nav.
const profileBadge = createProfileBadge({ setState, resetSession, customer: true });

// The shared shell mounts the chrome and owns the render loop. No stage fade
// here (that CSS is admin-only) and no regression refresher (internal tooling).
startShell({ loaders, syncUrl, appNav, profileBadge });

startPopstate((parsed) => {
  // The password-reset screens are reachable in any auth state — handle them first so the
  // token rides into state and the logged-out gate below can't bounce them to login.
  if (parsed.stage === STAGES.FORGOT_PASSWORD || parsed.stage === STAGES.RESET_PASSWORD) {
    setState({ resetToken: parsed.params?.resetToken || null, stage: parsed.stage });
    return;
  }
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
    // stageTick forces a remount even when the stage doesn't change (audit F3) — Back from
    // one run straight to another keeps stage === RUN_DETAIL, so without the bump the shell's
    // render gate (stage !== routedStage || stageTick !== routedTick) sees nothing new and
    // never re-mounts; the screen keeps showing whichever run last rendered.
    if (parsed.params?.myRunId) setState({ myRunId: parsed.params.myRunId, stage: STAGES.RUN_DETAIL, stageTick: store.stageTick + 1 });
    else setState({ stage: isAdmin(store.user) ? STAGES.RUNS : STAGES.MEMBER_HOME });
    return;
  }
  if (parsed.stage === STAGES.JOIN) {
    if (parsed.params?.joinToken) setState({ joinToken: parsed.params.joinToken, stage: STAGES.JOIN });
    else setState({ stage: STAGES.LOGIN });
    return;
  }
  if (parsed.stage === STAGES.GUIDED) {
    if (parsed.params?.guidedId) setState({ guidedId: parsed.params.guidedId, stage: STAGES.GUIDED });
    else setState({ stage: STAGES.INTAKE, substage: "NAME" });
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

export { rehydrateById };

async function boot() {
  // Auth gate — no entry without a valid session. 401 (or API unreachable) → login.
  let identity = null;
  try { identity = await me(); } catch { /* logged out */ }

  const route = parseLocation();

  // The password-reset screens (forgot-password, reset-password/:token) are reachable in
  // ANY auth state — the live reset email points at THIS customer app, opened logged-out;
  // a logged-in user who clicked it works too. Handle them before the auth gate so the
  // token rides into state and the normal routing can't bounce them.
  if (route && (route.stage === STAGES.FORGOT_PASSWORD || route.stage === STAGES.RESET_PASSWORD)) {
    if (identity) store.user = { userId: identity.userId, orgId: identity.orgId, roles: identity.roles, email: identity.email, name: identity.name, isSuperadmin: identity.isSuperadmin };
    setState({ resetToken: route.params?.resetToken || null, stage: route.stage });
    return;
  }

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
    // RUN_DETAIL left the member whitelist (design-consolidation P2, audit A6): the API is
    // owner-fenced so a member deep link could never load. Land on Home instead.
    if (route && route.stage === STAGES.RUN_DETAIL) {
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

  // /team/:person deep link (audit M9) — a refresh on a person page must stay on that
  // person. person-detail reads store.personKey, so carry the URL param into state here the
  // same way popstate does; without it the page mounted to "No one selected". Bare /team
  // (no key) falls through to the standalone-path handler below and shows the Team list.
  if (route?.stage === STAGES.PERSON_DETAIL && route.params?.personKey) {
    setState({ personKey: route.params.personKey, stage: STAGES.PERSON_DETAIL });
    return;
  }

  // /runs/:id deep link (audit F3) — a refresh, Back, or a pasted link must not lose the run.
  // The router already parses this correctly; boot had no branch that acted on it for a
  // manager, so it fell through to the generic fallback below, which sets the stage but never
  // carries myRunId — run-detail.ts then reads a stale/empty id and shows "No 1:1 selected".
  // Mirrors the /team/:person handler just above.
  if (route?.stage === STAGES.RUN_DETAIL) {
    if (route.params?.myRunId) { setState({ myRunId: route.params.myRunId, stage: STAGES.RUN_DETAIL }); return; }
    history.replaceState(null, "", "/runs"); setState({ stage: STAGES.RUNS }); return;
  }

  // /guided/:id deep link (Monthly Check-in) — id from URL, no live session needed. Only
  // managers get this far (the member/guest gates above already bounced everyone else).
  if (route?.stage === STAGES.GUIDED) {
    if (route.params?.guidedId) { setState({ guidedId: route.params.guidedId, stage: STAGES.GUIDED }); return; }
    history.replaceState(null, "", "/new"); setState({ stage: STAGES.INTAKE, substage: "NAME" }); return;
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

  // Path is "/" (or unknown): live session resumes; else land on Home.
  if (rehydrated) return;

  // No active session — a manager lands on their Home (the START dashboard), whose
  // first-run empty state greets a newcomer. They start a prep when they choose to.
  setState({ stage: STAGES.START });
}

boot();
