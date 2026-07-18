import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque"; // display headings (DESIGN.md §3)
import "./styles/tailwind.css";
import "./styles/design.css";

import { STAGES, store, subscribe, setState, resetSession, isAdmin, isInternalAdmin, isSuperadmin, isLiveEnv } from "./state.js";
import { loaders } from "./stage-loaders.js";
import { getSession, runRegression, me } from "../../shared/api.js";
import { syncUrl, parseLocation, startPopstate, replaceUrl, isFlowStage, isInternalStage, isMemberStage, isSharedStage, isGuestStage, isSuperadminStage, isLiveHiddenStage } from "./router.js";
import { createDevBadge } from "./ui/dev-badge.js";
import { createBuildStamp } from "./ui/build-stamp.js";
import { createSessionTopbar } from "./ui/session-topbar.js";
import { createAppNav } from "./ui/app-nav.js";
import { createProfileBadge } from "./ui/profile-badge.js";
import { createNotesPanel } from "./ui/notes-panel.js";
import { installGlobalErrorReporter, reportError } from "./ui/error-reporter.js";

// This app's member home (audit B1): a plain member lands on their Past 1:1s (RUNS).
// Injected once so the shared login/register resolver lands them where a reload does.
store.memberHome = STAGES.RUNS;

// Lazy stage modules live in ./stage-loaders.js — the single registry the Screen
// Gallery also reads, so a new screen appears there automatically.

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
  // Rendered cleanly, so this tab is on the current build — clear the reload
  // guard so a future stale-chunk failure can trigger a fresh recovery.
  try { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); } catch {}
}

// A failed lazy import almost always means a stale tab: a new deploy replaced
// the hashed route chunks this bundle references and deleted the old ones, so
// the import 404s and the server's SPA fallback returns index.html — which the
// browser rejects as a module ("MIME type text/html" / "Failed to fetch
// dynamically imported module"). One full reload fetches the fresh index.html +
// new chunk hashes and the screen renders. The one-shot flag (cleared on the
// next clean render) stops a reload loop if a deploy is genuinely broken.
const CHUNK_RELOAD_FLAG = "seroChunkReload";
function isStaleChunkError(e) {
  const msg = (e && e.message) || "";
  return /dynamically imported module|Importing a module script failed|module script/i.test(msg);
}

function enqueueRender(nextStage) {
  renderChain = renderChain
    .then(() => renderStage(nextStage))
    .catch((e) => {
      if (isStaleChunkError(e) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
        try { sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1"); } catch {}
        location.reload();
        return;
      }
      console.error("[main] render failed:", e);
      reportError((e && e.message) || "Stage render failed");
    });
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
  // Live site: Test engine + Tasks are off — a back/forward to them bounces to Home
  // (admin-live-deploy Phase 2), even for a superadmin.
  if (store.user && isLiveEnv() && isLiveHiddenStage(parsed.stage)) {
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
  if (parsed.stage === STAGES.GUIDED) {
    if (parsed.params?.guidedId) setState({ guidedId: parsed.params.guidedId, stage: STAGES.GUIDED });
    else setState({ stage: STAGES.INTAKE });
    return;
  }
  if (parsed.stage === STAGES.ADMIN_USER) {
    if (parsed.params?.adminUserId) setState({ adminUserId: parsed.params.adminUserId, stage: STAGES.ADMIN_USER });
    else setState({ stage: STAGES.ADMIN_REGISTERED });
    return;
  }
  // Screen Gallery — /gallery or /gallery/:screenId. The screenId rides into state and the
  // stageTick bump makes main re-render the gallery so it opens on that screen.
  if (parsed.stage === STAGES.GALLERY) {
    setState({ galleryScreen: parsed.params?.galleryScreen || null, stage: STAGES.GALLERY, stageTick: store.stageTick + 1 });
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
  // Stash the server's environment truth (admin-live-deploy Phase 2) so the nav trim and the
  // live deep-link bounce below can tell live from local. Only present when logged in; a
  // logged-out visitor sees no nav, so "local" is a safe default.
  store.appEnv = identity?.appEnv || "local";

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
      replaceUrl("/runs"); setState({ stage: STAGES.RUNS }); return;
    }
    if (route && isMemberStage(route.stage)) { setState({ stage: route.stage }); return; }
    if (route && isSharedStage(route.stage)) { setState({ stage: route.stage }); return; }
    replaceUrl("/runs");
    setState({ stage: STAGES.RUNS });
    return;
  }

  // A manager deep-linking the internal toolset lands on their Home instead
  // (manager-ready Phase 1). Before the regression kick-off — that's internal-only too.
  if (!isInternalAdmin(store.user) && route && isInternalStage(route.stage)) {
    replaceUrl("/");
    setState({ stage: STAGES.START });
    return;
  }

  // A non-superadmin deep-linking an /admin/* superadmin screen lands on Home (F-009).
  if (!isSuperadmin(store.user) && route && isSuperadminStage(route.stage)) {
    replaceUrl("/");
    setState({ stage: STAGES.START });
    return;
  }

  // On the LIVE site the Test engine (paid persona runs) and the Tasks board are off — a
  // deep link to either lands on Home (admin-live-deploy Phase 2). This bounces even a
  // superadmin: those tools don't belong on live. The nav hides them too; the Phase-1
  // backend fence 403s the paid start regardless.
  if (isLiveEnv() && route && isLiveHiddenStage(route.stage)) {
    replaceUrl("/");
    setState({ stage: STAGES.START });
    return;
  }

  // Admin/owner from here down — safe to kick off the (admin-only) regression check.
  if (isInternalAdmin(store.user)) refreshRegressionAlert();

  // The superadmin lands on the Pulse dashboard — the admin console's home now (Carl's call
  // 2026-07-14: Pulse is the landing everywhere, local + live), unless they deep-linked
  // somewhere specific. A bare /admin/, a stale "/" or the post-login redirect all resolve to
  // Pulse; the old START launcher lives on as the "Start a 1:1" nav item.
  const landsHome = !route || route.stage === STAGES.START
    || route.stage === STAGES.LOGIN || route.stage === STAGES.REGISTER;
  if (isSuperadmin(store.user) && landsHome) {
    replaceUrl("/pulse");
    setState({ stage: STAGES.ADMIN_PULSE });
    return;
  }

  if (route?.stage === STAGES.LOGIN || route?.stage === STAGES.REGISTER) {
    setState({ stage: STAGES.START });
    return;
  }

  // /run/:id deep link — id comes from URL, no session needed.
  if (route?.stage === STAGES.REVIEW_RUN) {
    if (route.params?.reviewRunId) { setState({ reviewRunId: route.params.reviewRunId, stage: STAGES.REVIEW_RUN }); return; }
    replaceUrl("/"); setState({ stage: STAGES.START }); return;
  }

  // /admin/users/:id deep link (PG8) — id from URL; the name isn't in the URL, so the
  // page shows a generic title until it loads. Falls back to the Registered list.
  if (route?.stage === STAGES.ADMIN_USER) {
    if (route.params?.adminUserId) { setState({ adminUserId: route.params.adminUserId, stage: STAGES.ADMIN_USER }); return; }
    replaceUrl("/admin/registered"); setState({ stage: STAGES.ADMIN_REGISTERED }); return;
  }

  // /guided/:id deep link (monthly-checkin) — id from URL, no live session needed. The
  // internal-admin bounce above already sent non-internal callers home, so this is safe.
  if (route?.stage === STAGES.GUIDED) {
    if (route.params?.guidedId) { setState({ guidedId: route.params.guidedId, stage: STAGES.GUIDED }); return; }
    history.replaceState(null, "", "/new"); setState({ stage: STAGES.INTAKE }); return;
  }

  // /team/:person deep link (audit M9) — a refresh on a person page must stay on that
  // person. person-detail reads store.personKey, so carry the URL param into state here (the
  // generic standalone handler below drops params); without it the page mounted to "No one
  // selected". Bare /team falls through to that handler and shows the Team list.
  if (route?.stage === STAGES.PERSON_DETAIL && route.params?.personKey) {
    setState({ personKey: route.params.personKey, stage: STAGES.PERSON_DETAIL });
    return;
  }

  // /gallery/:screenId deep link — carry the screen id into state so a reload lands back on
  // the same screen inside the gallery. The internal/superadmin/live guards above already
  // bounced non-internal callers and the live site, so this is safe.
  if (route?.stage === STAGES.GALLERY) {
    setState({ galleryScreen: route.params?.galleryScreen || null, stage: STAGES.GALLERY });
    return;
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
    replaceUrl("/"); setState({ stage: STAGES.START }); return;
  }

  // Explicit standalone path wins over a non-flow default (compare / lexicon / new).
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

function defaultSubstage(stage) {
  if (stage === STAGES.INTAKE) return "NAME";
  if (stage === STAGES.QUESTIONING) return "Q_SHOW";
  return null;
}

boot();
