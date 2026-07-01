// Path-based routing for the SPA. Maps store.stage <-> location.pathname so every
// screen has its own URL (/, /compare, /run/:id, /interview, ...). No deps on the
// store: main.js injects behavior via the exported helpers. Two guards prevent a
// setState<->popstate loop — a suppress flag and a compare-before-write in syncUrl.

import { STAGES } from "./state.js";

// stage -> path
const PATH_FOR = {
  [STAGES.LOGIN]:          () => "/login",
  [STAGES.REGISTER]:       () => "/register",
  [STAGES.START]:          () => "/",
  [STAGES.MEMBER_HOME]:    () => "/home",
  [STAGES.TEAM]:           () => "/team",
  [STAGES.RUNS]:           () => "/runs",
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
  [STAGES.REGRESSION]:     () => "/regression",
  [STAGES.PERSONAS]:       () => "/personas",
  [STAGES.GUIDE]:          () => "/guide",
  [STAGES.TASKS]:          () => "/tasks",
  [STAGES.REVIEW_RUN]:     (s) => (s.reviewRunId ? `/run/${encodeURIComponent(s.reviewRunId)}` : "/run"),
  // ERROR intentionally absent -> urlForState returns null -> no URL write
};

// path -> stage (exact paths). /run/:id handled separately.
const STAGE_FOR = {
  "/login": STAGES.LOGIN, "/register": STAGES.REGISTER,
  "/": STAGES.START, "/home": STAGES.MEMBER_HOME, "/team": STAGES.TEAM, "/runs": STAGES.RUNS,
  "/new": STAGES.INTAKE, "/flow": STAGES.ONEPAGE, "/focus": STAGES.FOCUS_POINTS,
  "/prepare": STAGES.PREPARATION, "/bank": STAGES.BANK, "/interview": STAGES.QUESTIONING,
  "/evaluate": STAGES.EVAL, "/briefing": STAGES.BRIEFING, "/debrief": STAGES.RUN_DEBRIEF,
  "/lexicon": STAGES.LEXICON_REVIEW, "/compare": STAGES.COMPARE, "/library": STAGES.LIBRARY,
  "/job-lexicons": STAGES.ROLE_LEXICONS, "/meeting-arcs": STAGES.MEETING_ARCS,
  "/regression": STAGES.REGRESSION, "/personas": STAGES.PERSONAS, "/guide": STAGES.GUIDE,
  "/tasks": STAGES.TASKS,
};

const FLOW = new Set([STAGES.FOCUS_POINTS, STAGES.PREPARATION, STAGES.BANK,
  STAGES.QUESTIONING, STAGES.EVAL, STAGES.BRIEFING, STAGES.RUN_DEBRIEF]);
export const isFlowStage = (stage) => FLOW.has(stage);

// Screens reserved for owners/admins — the internal tooling + the run-history dashboard
// (admin-access-guard Phase 2). A member deep-linking here is bounced to the prep flow.
const ADMIN_ONLY = new Set([STAGES.START, STAGES.LIBRARY, STAGES.COMPARE, STAGES.REGRESSION,
  STAGES.PERSONAS, STAGES.LEXICON_REVIEW, STAGES.ROLE_LEXICONS, STAGES.MEETING_ARCS,
  STAGES.TASKS, STAGES.GUIDE, STAGES.REVIEW_RUN]);
export const isAdminStage = (stage) => ADMIN_ONLY.has(stage);

// The plain-member destinations (member-nav Phase 1): Home, Team, Runs. Used by boot +
// back/forward to honor a member's own deep links rather than bouncing them.
const MEMBER_ONLY = new Set([STAGES.MEMBER_HOME, STAGES.TEAM, STAGES.RUNS]);
export const isMemberStage = (stage) => MEMBER_ONLY.has(stage);

export function parseLocation() {
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  if (STAGE_FOR[p]) return { stage: STAGE_FOR[p] };
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
  if (next === window.location.pathname) return;   // compare-before-write: no dup entry / no loop
  window.history.pushState(null, "", next);
}

export function startPopstate(apply) {
  window.addEventListener("popstate", () => {
    const parsed = parseLocation() || { stage: STAGES.START };
    suppress = true;
    try { apply(parsed); } finally { suppress = false; }
  });
}
