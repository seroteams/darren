// Path-based routing for the SPA. Maps store.stage <-> location.pathname so every
// screen has its own URL (/, /compare, /run/:id, /interview, ...). No deps on the
// store: main.js injects behavior via the exported helpers. Two guards prevent a
// setState<->popstate loop — a suppress flag and a compare-before-write in syncUrl.

import { STAGES } from "./state.js";

// The app is served under a base path on live (/admin, admin-live-deploy Phase 2) so it can
// sit alongside the customer app at /. Vite injects the base as import.meta.env.BASE_URL
// ("/admin/" here; "/" if ever served at root). BASE is normalized to no trailing slash for
// prefixing ("" when at root). withBase turns an internal route ("/guide") into a real
// browser path ("/admin/guide"); stripBase does the reverse, so the route tables below and
// every deep link stay base-agnostic.
// import.meta.env is vite-only — undefined when router.js is imported by a Node unit test,
// so read it defensively (BASE = "" there, making withBase/stripBase identity).
const BASE = ((import.meta.env && import.meta.env.BASE_URL) || "/").replace(/\/+$/, "");

export function withBase(path) {
  return BASE ? BASE + path : path;
}
export function stripBase(pathname) {
  if (!BASE) return pathname;
  if (pathname === BASE) return "/";
  if (pathname.startsWith(BASE + "/")) return pathname.slice(BASE.length);
  return pathname; // not under the base — leave as-is
}
// Replace the current history entry at a base-aware URL (boot's redirects in main.js go
// through this so they land under /admin/ on live instead of the site root).
export function replaceUrl(path) {
  window.history.replaceState(null, "", withBase(path));
}

// stage -> path
const PATH_FOR = {
  // The guest-first front door (WELCOME), join links, Team and person pages live
  // in the CUSTOMER app now (frontend-admin-split Phase 3) — the admin app keeps
  // login, the run lane (internal QA), and the internal toolset.
  [STAGES.LOGIN]:          () => "/login",
  [STAGES.REGISTER]:       () => "/register",
  [STAGES.FORGOT_PASSWORD]: () => "/forgot-password",
  [STAGES.RESET_PASSWORD]: (s) => (s.resetToken ? `/reset-password/${encodeURIComponent(s.resetToken)}` : "/reset-password"),
  [STAGES.PRIVACY]:        () => "/privacy",
  [STAGES.ABOUT]:          () => "/about",
  [STAGES.FEEDBACK]:       () => "/feedback",
  [STAGES.START]:          () => "/",
  [STAGES.MEMBER_HOME]:    () => "/home",
  [STAGES.RUNS]:           () => "/runs",
  [STAGES.RUN_DETAIL]:     (s) => (s.myRunId ? `/runs/${encodeURIComponent(s.myRunId)}` : "/runs"),
  [STAGES.INTAKE]:         () => "/new",
  [STAGES.ONEPAGE]:        () => "/flow",
  [STAGES.FOCUS_POINTS]:   () => "/focus",
  [STAGES.PREPARATION]:    () => "/prepare",
  [STAGES.BANK]:           () => "/bank",
  [STAGES.QUESTIONING]:    () => "/interview",
  [STAGES.EVAL]:           () => "/evaluate",
  [STAGES.BRIEFING]:       () => "/briefing",
  [STAGES.RUN_DEBRIEF]:    () => "/debrief",
  [STAGES.LEXICON_REVIEW]: () => "/lexicon",
  [STAGES.COMPARE]:        () => "/compare",
  [STAGES.LIBRARY]:        () => "/library",
  [STAGES.ROLE_LEXICONS]:  () => "/job-lexicons",
  [STAGES.MEETING_ARCS]:   () => "/meeting-arcs",
  [STAGES.PERSONAS]:       () => "/personas",
  [STAGES.GUIDE]:          () => "/guide",
  [STAGES.TASKS]:          () => "/tasks",
  [STAGES.UNIVERSE]:       () => "/universe",
  [STAGES.DESIGN]:         () => "/design",
  [STAGES.ADMIN_REGISTERED]: () => "/admin/registered",
  [STAGES.ADMIN_ERROR_LOG]: () => "/admin/errors",
  [STAGES.ADMIN_FEEDBACK]: () => "/admin/feedback",
  [STAGES.ADMIN_GUEST_RUNS]: () => "/admin/guests",
  [STAGES.ADMIN_USER]:     (s) => (s.adminUserId ? `/admin/users/${encodeURIComponent(s.adminUserId)}` : "/admin/registered"),
  [STAGES.REVIEW_RUN]:     (s) => (s.reviewRunId ? `/run/${encodeURIComponent(s.reviewRunId)}` : "/run"),
  // ERROR intentionally absent -> urlForState returns null -> no URL write
};

// path -> stage (exact paths). /run/:id handled separately.
const STAGE_FOR = {
  "/login": STAGES.LOGIN, "/register": STAGES.REGISTER, "/forgot-password": STAGES.FORGOT_PASSWORD,
  "/privacy": STAGES.PRIVACY,
  "/about": STAGES.ABOUT, "/feedback": STAGES.FEEDBACK,
  "/": STAGES.START, "/home": STAGES.MEMBER_HOME, "/runs": STAGES.RUNS,
  "/new": STAGES.INTAKE, "/flow": STAGES.ONEPAGE, "/focus": STAGES.FOCUS_POINTS,
  "/prepare": STAGES.PREPARATION, "/bank": STAGES.BANK, "/interview": STAGES.QUESTIONING,
  "/evaluate": STAGES.EVAL, "/briefing": STAGES.BRIEFING, "/debrief": STAGES.RUN_DEBRIEF,
  "/lexicon": STAGES.LEXICON_REVIEW, "/compare": STAGES.COMPARE, "/library": STAGES.LIBRARY,
  "/job-lexicons": STAGES.ROLE_LEXICONS, "/meeting-arcs": STAGES.MEETING_ARCS,
  "/personas": STAGES.PERSONAS, "/guide": STAGES.GUIDE,
  "/tasks": STAGES.TASKS, "/universe": STAGES.UNIVERSE, "/design": STAGES.DESIGN,
  "/admin/registered": STAGES.ADMIN_REGISTERED,
  "/admin/errors": STAGES.ADMIN_ERROR_LOG,
  "/admin/feedback": STAGES.ADMIN_FEEDBACK,
  "/admin/guests": STAGES.ADMIN_GUEST_RUNS,
};

const FLOW = new Set([STAGES.FOCUS_POINTS, STAGES.PREPARATION, STAGES.BANK,
  STAGES.QUESTIONING, STAGES.EVAL, STAGES.BRIEFING, STAGES.RUN_DEBRIEF]);
export const isFlowStage = (stage) => FLOW.has(stage);

// Screens reserved for owners/admins — the internal tooling + the run-history dashboard
// (admin-access-guard Phase 2). A member deep-linking here is bounced to the prep flow.
const ADMIN_ONLY = new Set([STAGES.START, STAGES.LIBRARY, STAGES.COMPARE,
  STAGES.PERSONAS, STAGES.LEXICON_REVIEW, STAGES.ROLE_LEXICONS, STAGES.MEETING_ARCS,
  STAGES.TASKS, STAGES.UNIVERSE, STAGES.GUIDE, STAGES.DESIGN, STAGES.REVIEW_RUN, STAGES.ADMIN_REGISTERED, STAGES.ADMIN_USER,
  STAGES.ADMIN_ERROR_LOG, STAGES.ADMIN_FEEDBACK, STAGES.ADMIN_GUEST_RUNS]);
export const isAdminStage = (stage) => ADMIN_ONLY.has(stage);

// The cross-company superadmin screens (pre-go-live PG6+). A subset of ADMIN_ONLY that
// even a normal manager/admin must NOT reach — only the email-allowlisted superadmin.
// The backend 403s their data; this bounces a non-superadmin off the shell too (F-009).
const SUPERADMIN_ONLY = new Set([STAGES.ADMIN_REGISTERED, STAGES.ADMIN_USER,
  STAGES.ADMIN_ERROR_LOG, STAGES.ADMIN_FEEDBACK, STAGES.ADMIN_GUEST_RUNS]);
export const isSuperadminStage = (stage) => SUPERADMIN_ONLY.has(stage);

// The internal toolset (manager-ready Phase 1) — the workshop screens only the internal
// `admin` role should meet. A manager deep-linking here is bounced to their Home (START).
// Deliberately NOT including START (the manager's dashboard) or REVIEW_RUN (their own run
// reviews) — the backend fences whose data those show.
const INTERNAL_ONLY = new Set([STAGES.LIBRARY, STAGES.COMPARE, STAGES.PERSONAS,
  STAGES.LEXICON_REVIEW, STAGES.ROLE_LEXICONS, STAGES.MEETING_ARCS,
  STAGES.TASKS, STAGES.UNIVERSE, STAGES.GUIDE, STAGES.DESIGN]);
export const isInternalStage = (stage) => INTERNAL_ONLY.has(stage);

// Internal tools trimmed from the LIVE site (admin-live-deploy Phase 2): the Test engine
// (paid persona runs — the Phase-1 backend fence already 403s the start) and the build
// Tasks board. Hidden from the nav and bounced on deep link when appEnv is "live". Cosmetic
// on top of the backend fence; local dev shows them as before.
const LIVE_HIDDEN = new Set([STAGES.PERSONAS, STAGES.TASKS]);
export const isLiveHiddenStage = (stage) => LIVE_HIDDEN.has(stage);

// The plain-member destinations (member-view: only-runs): a member can view their own
// past 1:1s and open one — nothing else. They can't start or run a 1:1, and Home/Team are
// gone from their app. Used by boot + back/forward to honor these deep links, bounce the rest.
const MEMBER_ONLY = new Set([STAGES.RUNS, STAGES.RUN_DETAIL]);
export const isMemberStage = (stage) => MEMBER_ONLY.has(stage);

// Any-audience content pages (009 Phase 3+): reachable by admins and members alike — the
// privacy note, the About one-pager, and the Feedback form. (Privacy is also reachable
// logged-out from the signup screen — see boot in main.js.) Boot honors these deep links
// for a member instead of bouncing them to Home.
const SHARED = new Set([STAGES.PRIVACY, STAGES.ABOUT, STAGES.FEEDBACK]);
export const isSharedStage = (stage) => SHARED.has(stage);

// The guest lane (guest-run Phase 2): a visitor with NO account may take a run —
// intake plus the run stages — and nothing else. Deliberately its own set (not
// SHARED, which is content pages): the internal QA debrief (RUN_DEBRIEF) and the
// lexicon review are excluded, so a guest's run ends at the briefing.
const GUEST_OK = new Set([STAGES.INTAKE, ...FLOW]);
GUEST_OK.delete(STAGES.RUN_DEBRIEF);
export const isGuestStage = (stage) => GUEST_OK.has(stage);

export function parseLocation() {
  const p = stripBase(window.location.pathname).replace(/\/+$/, "") || "/";
  if (STAGE_FOR[p]) return { stage: STAGE_FOR[p] };
  // A member re-opening one of their own runs: /runs/:id (checked after the exact-path
  // map, so bare /runs still resolves to the list above).
  const mine = p.match(/^\/runs\/([^/]+)$/);
  if (mine) return { stage: STAGES.RUN_DETAIL, params: { myRunId: decodeURIComponent(mine[1]) } };
  // A superadmin drilling into one user: /admin/users/:id (after the exact-path map, so
  // /admin/registered still resolves above). The segment is the user id.
  const adminUser = p.match(/^\/admin\/users\/([^/]+)$/);
  if (adminUser) return { stage: STAGES.ADMIN_USER, params: { adminUserId: decodeURIComponent(adminUser[1]) } };
  // An emailed password-reset link: /reset-password/:token. Public — the token IS the
  // credential (the user is logged out). Bare /reset-password resolves via STAGE_FOR? No —
  // it's token-only, so a missing token falls through to null and the screen shows "invalid".
  const reset = p.match(/^\/reset-password\/([^/]+)$/);
  if (reset) return { stage: STAGES.RESET_PASSWORD, params: { resetToken: decodeURIComponent(reset[1]) } };
  const m = p.match(/^\/run\/([^/]+)$/);
  if (m) return { stage: STAGES.REVIEW_RUN, params: { reviewRunId: decodeURIComponent(m[1]) } };
  if (p === "/run") return { stage: STAGES.REVIEW_RUN }; // no id -> caller redirects
  return null; // unknown -> caller treats as home
}

export function urlForState(s) {
  const build = PATH_FOR[s.stage];
  return build ? build(s) : null;
}

let suppress = false;
export function syncUrl(s) {
  if (suppress) return;                            // don't echo a popstate-driven change
  const next = urlForState(s);
  if (next == null) return;                        // ERROR etc. -> leave URL as-is
  const nextUrl = withBase(next);                  // prefix the base so live URLs sit under /admin/
  if (nextUrl === window.location.pathname) return; // compare-before-write: no dup entry / no loop
  window.history.pushState(null, "", nextUrl);
}

export function startPopstate(apply) {
  window.addEventListener("popstate", () => {
    const parsed = parseLocation() || { stage: STAGES.START };
    suppress = true;
    try { apply(parsed); } finally { suppress = false; }
  });
}
