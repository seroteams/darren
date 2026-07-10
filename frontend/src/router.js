// Path-based routing for the customer app — the customer subset of the admin
// app's router (frontend-admin-split Phase 2). Internal-tool routes (/library,
// /universe, /tasks, /admin/*, …) deliberately don't exist here: an unknown path
// resolves to null and boot lands on the right home. Same guard pattern as the
// admin router — a suppress flag and a compare-before-write in syncUrl.

import { STAGES } from "../../admin/src/state.js";

// stage -> path
const PATH_FOR = {
  // WELCOME and START share "/": the guest-first start screen for a logged-out
  // visitor, the manager home when logged in. parseLocation returns START for
  // "/"; boot/popstate translate that to WELCOME when there's no user.
  [STAGES.WELCOME]:        () => "/",
  [STAGES.LOGIN]:          () => "/login",
  [STAGES.REGISTER]:       () => "/register",
  [STAGES.JOIN]:           (s) => (s.joinToken ? `/join/${encodeURIComponent(s.joinToken)}` : "/login"),
  [STAGES.PRIVACY]:        () => "/privacy",
  [STAGES.ABOUT]:          () => "/about",
  [STAGES.FEEDBACK]:       () => "/feedback",
  [STAGES.START]:          () => "/",
  [STAGES.MEMBER_HOME]:    () => "/home",
  [STAGES.TEAM]:           () => "/team",
  [STAGES.RUNS]:           () => "/runs",
  [STAGES.RUN_DETAIL]:     (s) => (s.myRunId ? `/runs/${encodeURIComponent(s.myRunId)}` : "/runs"),
  [STAGES.PERSON_DETAIL]:  (s) => (s.personKey ? `/team/${encodeURIComponent(s.personKey)}` : "/team"),
  [STAGES.INTAKE]:         () => "/new",
  [STAGES.ONEPAGE]:        () => "/flow",
  [STAGES.FOCUS_POINTS]:   () => "/focus",
  [STAGES.PREPARATION]:    () => "/prepare",
  [STAGES.BANK]:           () => "/bank",
  [STAGES.QUESTIONING]:    () => "/interview",
  [STAGES.EVAL]:           () => "/evaluate",
  [STAGES.BRIEFING]:       () => "/briefing",
  [STAGES.RUN_DEBRIEF]:    () => "/debrief",
  [STAGES.REVIEW_RUN]:     (s) => (s.reviewRunId ? `/run/${encodeURIComponent(s.reviewRunId)}` : "/run"),
  // ERROR intentionally absent -> urlForState returns null -> no URL write
};

// path -> stage (exact paths). /run/:id, /runs/:id, /team/:person handled separately.
const STAGE_FOR = {
  "/login": STAGES.LOGIN, "/register": STAGES.REGISTER, "/privacy": STAGES.PRIVACY,
  "/about": STAGES.ABOUT, "/feedback": STAGES.FEEDBACK,
  "/": STAGES.START, "/home": STAGES.MEMBER_HOME, "/team": STAGES.TEAM, "/runs": STAGES.RUNS,
  "/new": STAGES.INTAKE, "/flow": STAGES.ONEPAGE, "/focus": STAGES.FOCUS_POINTS,
  "/prepare": STAGES.PREPARATION, "/bank": STAGES.BANK, "/interview": STAGES.QUESTIONING,
  "/evaluate": STAGES.EVAL, "/briefing": STAGES.BRIEFING, "/debrief": STAGES.RUN_DEBRIEF,
};

const FLOW = new Set([STAGES.FOCUS_POINTS, STAGES.PREPARATION, STAGES.BANK,
  STAGES.QUESTIONING, STAGES.EVAL, STAGES.BRIEFING, STAGES.RUN_DEBRIEF]);
export const isFlowStage = (stage) => FLOW.has(stage);

// The plain-member destinations (member-view: about-me only): a member sees ONLY the
// list of 1:1s their manager prepped ABOUT them (MEMBER_HOME → getRunsAboutMe, list-only,
// no notes/briefing/ratings — the no-inference ruling). The manager RUNS stage (authored
// runs + private ratings) is deliberately NOT reachable by a member. RUN_DETAIL stays for
// their own runs only — owner-fenced server-side, so it 404s anything not theirs.
// Used by boot + back/forward to honor these deep links, bounce the rest.
const MEMBER_ONLY = new Set([STAGES.MEMBER_HOME, STAGES.RUN_DETAIL]);
export const isMemberStage = (stage) => MEMBER_ONLY.has(stage);

// Any-audience content pages: the privacy note, the About one-pager, Feedback.
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
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  if (STAGE_FOR[p]) return { stage: STAGE_FOR[p] };
  // A member re-opening one of their own runs: /runs/:id (checked after the exact-path
  // map, so bare /runs still resolves to the list above).
  const mine = p.match(/^\/runs\/([^/]+)$/);
  if (mine) return { stage: STAGES.RUN_DETAIL, params: { myRunId: decodeURIComponent(mine[1]) } };
  // A member opening one person's page: /team/:person.
  const person = p.match(/^\/team\/([^/]+)$/);
  if (person) return { stage: STAGES.PERSON_DETAIL, params: { personKey: decodeURIComponent(person[1]) } };
  // An invitee opening their one-time join link: /join/:token (member-onboarding-invites).
  // Public — the whole point is they have no account yet.
  const join = p.match(/^\/join\/([^/]+)$/);
  if (join) return { stage: STAGES.JOIN, params: { joinToken: decodeURIComponent(join[1]) } };
  const m = p.match(/^\/run\/([^/]+)$/);
  if (m) return { stage: STAGES.REVIEW_RUN, params: { reviewRunId: decodeURIComponent(m[1]) } };
  if (p === "/run") return { stage: STAGES.REVIEW_RUN }; // no id -> caller redirects
  return null; // unknown (incl. any admin path) -> caller treats as home
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
