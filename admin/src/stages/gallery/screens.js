// Screen Gallery — the thin metadata overlay on top of the stage registry.
// The tree, labels and grouping come from here; the actual screen modules come
// from ../../stage-loaders.js. A stage present in the registry but missing from
// SCREENS still shows up — under "New / unsorted" — so a new screen is never
// hidden, just unlabelled until someone adds a line here.

// Group order = tree order. `id` keys the SCREENS entries below; `label` is the heading.
export const GROUPS = [
  { id: "auth",       label: "Auth & entry" },
  { id: "manager",    label: "Manager home & team" },
  { id: "flow",       label: "1:1 prep flow" },
  { id: "member",     label: "Member view" },
  { id: "content",    label: "Content pages" },
  { id: "superadmin", label: "Superadmin" },
  { id: "internal",   label: "Internal tools" },
  { id: "unsorted",   label: "New / unsorted" }, // auto-bucket for un-annotated stages
];

// Stages that never belong in the tree: the gallery itself (would recurse) and the
// bare error screen (needs a manufactured error to show anything).
export const HIDDEN = new Set(["GALLERY", "ERROR"]);

// stageKey -> { label, group, needsData?, file? }
//   needsData: true → shows an empty state until Phase 2 seeds a demo session (tagged in the tree).
//   file: optional override if the source path can't be derived from the loader.
export const SCREENS = {
  // Auth & entry
  LOGIN:            { label: "Login",               group: "auth" },
  REGISTER:         { label: "Register",            group: "auth" },
  FORGOT_PASSWORD:  { label: "Forgot password",     group: "auth" },
  RESET_PASSWORD:   { label: "Reset password",      group: "auth" },
  WELCOME:          { label: "Welcome",             group: "auth" },
  JOIN:             { label: "Join",                group: "auth" },

  // Manager home & team
  START:            { label: "Start (manager home)", group: "manager" },
  TEAM:             { label: "Team",                group: "manager" },
  PERSON_DETAIL:    { label: "Person detail",       group: "manager", needsData: true },
  MEMBERS:          { label: "Members",             group: "manager" },
  RUNS:             { label: "Runs",                group: "manager" },
  RUN_DETAIL:       { label: "Run detail",          group: "manager", needsData: true },

  // 1:1 prep flow (in walking order)
  INTAKE:           { label: "Intake",              group: "flow" },
  FOCUS_POINTS:     { label: "Focus points",        group: "flow", needsData: true },
  PREPARATION:      { label: "Preparation",         group: "flow", needsData: true },
  BANK:             { label: "Question bank",       group: "flow", needsData: true },
  QUESTIONING:      { label: "Interview",           group: "flow", needsData: true },
  EVAL:             { label: "Evaluate",            group: "flow", needsData: true },
  BRIEFING:         { label: "Briefing",            group: "flow", needsData: true },
  RUN_DEBRIEF:      { label: "Debrief",             group: "flow", needsData: true },
  GUIDED:           { label: "Guided session",      group: "flow", needsData: true },

  // Member view
  MEMBER_HOME:      { label: "Member home",         group: "member" },

  // Content pages
  ABOUT:            { label: "About",               group: "content" },
  PRIVACY:          { label: "Privacy",             group: "content" },
  FEEDBACK:         { label: "Feedback",            group: "content" },
  GUIDE:            { label: "Guide",               group: "content" },

  // Superadmin
  ADMIN_PULSE:      { label: "Pulse",               group: "superadmin" },
  ADMIN_GATE1:      { label: "Gate 1",              group: "superadmin" },
  ADMIN_RUNS:       { label: "All runs",            group: "superadmin" },
  ADMIN_RATINGS:    { label: "Ratings",             group: "superadmin" },
  ADMIN_REGISTERED: { label: "Registered users",    group: "superadmin" },
  ADMIN_USER:       { label: "User detail",         group: "superadmin", needsData: true },
  ADMIN_ERROR_LOG:  { label: "Error log",           group: "superadmin" },
  ADMIN_FEEDBACK:   { label: "Feedback inbox",      group: "superadmin" },
  ADMIN_GUEST_RUNS: { label: "Guest runs",          group: "superadmin" },

  // Internal tools
  LIBRARY:          { label: "Library",             group: "internal" },
  COMPARE:          { label: "Compare",             group: "internal" },
  PERSONAS:         { label: "Personas",            group: "internal" },
  LEXICON_REVIEW:   { label: "Lexicon review",      group: "internal" },
  ROLE_LEXICONS:    { label: "Job lexicons",        group: "internal" },
  MEETING_ARCS:     { label: "Meeting arcs",        group: "internal" },
  REVIEW_RUN:       { label: "Review a run",        group: "internal", needsData: true },
  DESIGN:           { label: "Design system sheet", group: "internal" },
  TEST:             { label: "Test prototypes",     group: "internal" },
};

// Customer-app screens that aren't in the admin registry — the gallery loads them directly.
// Paths are relative to THIS file (admin/src/stages/gallery/).
export const EXTRA_LOADERS = {
  WELCOME: () => import("../../../../frontend/src/stages/welcome.ts"),
  JOIN:    () => import("../../../../frontend/src/stages/join.js"),
  MEMBERS: () => import("../../../../frontend/src/stages/members.ts"),
};

// Phase 2: a real completed local run seeds every flow screen. null for now — Phase 1
// leaves flow screens on their empty state.
export const DEMO_SESSION_ID = null;

// The one-click "Copy design prompt" text. Carl pastes it into a fresh chat to start a
// design session on this exact screen — file path + live URL already filled in.
export function designPrompt({ label, file, url }) {
  return `I want to improve the design of the "${label}" screen in Sero.

- See it live: ${url}
- Its code: ${file}

Please:
1. Open the screen at the URL above and look at it (take a screenshot first).
2. Interview me ONE question at a time about what I want improved. Don't dump a list.
3. Suggest your own improvement ideas too, grounded in what you can see on the screen.
4. Follow DESIGN.md (the Sero design system): design tokens only (no hex), 14px text floor, one blue action per screen, Lucide icons.
5. Screenshot before and after so I can see the change.
6. Only touch this screen's own files. Don't change other screens.`;
}
