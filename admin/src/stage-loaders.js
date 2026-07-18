// The single stage → module registry for the admin app. Extracted verbatim from
// main.js so BOTH the boot/render cycle (main.js) and the Screen Gallery
// (stages/gallery/) read the same list — add a screen here and it appears in the
// gallery automatically, with nothing to keep in sync.
//
// Each value is a lazy () => import(...) so HMR + code-splitting keep working.

export const loaders = {
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
  // Team + person pages are customer-app stages, cross-imported so the local Engine app's
  // manager rail matches live (Carl: live and local should look the same).
  TEAM:            () => import("../../frontend/src/stages/team.ts"),
  PERSON_DETAIL:   () => import("../../frontend/src/stages/person-detail.ts"),
  RUNS:            () => import("./stages/runs.ts"),
  RUN_DETAIL:      () => import("./stages/run-detail.ts"),
  GUIDED:          () => import("../../frontend/src/stages/guided/guided.page.ts"), // Monthly Check-in runner (customer-owned so Phase 7 can reuse it)
  INTAKE:          () => import("./stages/intake.js"),
  ONEPAGE:         () => import("./stages/onepage.js"),
  FOCUS_POINTS:    () => import("./stages/focus-points.js"),
  PREPARATION:     () => import("../../frontend/src/stages/preparation.ts"), // customer-owned rebuild (prepare-variants)
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
  ADMIN_PULSE:     () => import("./stages/admin-pulse.ts"),
  ADMIN_GATE1:     () => import("./stages/admin-gate1.ts"),
  ADMIN_RUNS:      () => import("./stages/admin-runs.ts"),
  ADMIN_RATINGS:   () => import("./stages/admin-ratings.ts"),
  ADMIN_REGISTERED: () => import("./stages/admin-registered.ts"),
  ADMIN_USER:      () => import("./stages/admin-user-detail.ts"),
  ADMIN_ERROR_LOG: () => import("./stages/admin-error-log.ts"),
  ADMIN_FEEDBACK:  () => import("./stages/admin-feedback.ts"),
  ADMIN_GUEST_RUNS: () => import("./stages/admin-guest-runs.ts"),
  DESIGN:          () => import("./stages/design.js"),
  TEST:            () => import("./stages/test.js"),
  GALLERY:         () => import("./stages/gallery/gallery.js"),
  ERROR:           () => import("./stages/error.ts"),
};
