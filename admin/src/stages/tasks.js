// Tasks board (internal) — a clean re-think of the Build plan checklist with the
// two signals cleanly split: I (the agent) set each step's BUILD STATUS in the
// data below and commit it (✅ Built / 🔵 Building / ⚪ Not started); YOU tick a
// separate verdict ("I've checked this") that never touches my status chip. Your
// ticks live under their OWN localStorage key, so this page and the older Build
// plan page never clash. A top banner warns if you're on the wrong web-address
// (the thing that made ticks look "wiped").
//
// Each step's check is split into two plain parts:
//   • auto — a FREE, offline command that proves it + what a pass looks like.
//     (A one-click "run this for me" button lands in Phase 3.)
//   • eye  — the by-hand bit: open a screen and look.
// Either can be null when it doesn't apply.
// Each phase also offers a paste-ready Copy continue/verify prompt (ported from
// the old Build plan page), built from the build statuses below — never your ticks.

import { STAGES, setState } from "../state.js";
import { runFreeCheck } from "../../../shared/api.js";
import { escapeHtml as esc } from "../ui/html.js";

let keyHandler = null;

// Phases + steps. `s` is MY build status: "done" | "doing" | "todo" (default).
// This is the only thing that drives the status chip — your tick never changes it.
const DATA = [
  { num: "001", name: "Tidy the project", tag: "Monorepo Reorg",
    goal: "Pure spring-cleaning: every file moves into a clearly labelled room. Nothing your users see changes.",
    steps: [
      { f: "Labelled rooms", m: "Five named rooms: backend (brain), admin (your screens), frontend (future app), content (words/questions), docs (plans).", have: "Five named folders",
        auto: "Run `npm test` — expect all 30 tests passing, same as before the move.", eye: "You can see five folders: backend, admin, frontend, content, docs.", s: "done" },
      { f: "One address book for data", m: "Every file location written once in a single file. Change an address once and everything follows.", have: "One file listing where data lives",
        auto: "Run `npm test` — green.", eye: "Open the single paths/config file — every data location is listed there once, not scattered.", s: "done" },
      { f: "The brain moves house", m: "The core engine moves into the backend room and every signpost is updated.", have: "Engine in its proper room",
        auto: "Run `npm test` — green, no broken-import errors.", eye: "Start the app and run one session — it still works end to end.", s: "done" },
      { f: "The content moves house", m: "All the product's words (questions, prompts, scenarios) move into the content room.", have: "Questions and prompts in the content room",
        auto: "Run `node scripts/replay-scenario.js <id> --fixtures-only` — it runs clean.", eye: "A run still loads its questions.", s: "done" },
      { f: "Two apps get their own rooms", m: "The customer server and your internal screens are separated so product and tool stop being tangled.", have: "Server and screens separated",
        auto: "Run `npm run build` — it builds with no errors.", eye: "The app starts and one full run completes.", s: "done" },
      { f: "The paperwork gets filed", m: "All plans, notes and references move into the docs room.", have: "Everything filed under docs",
        auto: null, eye: "Plans and notes live under docs/, and nothing links to old spots.", s: "done" },
      { f: "Throw out the junk", m: "Delete leftover clutter and update the build settings to match the new layout.", have: "A clean project",
        auto: "Run `npm test` and `npm run build` — both clean; `npm run lint` passes.", eye: null, s: "done" },
    ],
    signoff: "Tests green (same count as before) · app starts and a full run works · the command-line replay runs clean · the product behaves identically to before." },

  { num: "002", name: "House rules", tag: "Conventions & Skills",
    goal: "Teach the AI our standards once, written as skills it reads automatically. From here on all new code is in a safer language and tested before it's trusted.",
    steps: [
      { f: "Shop around for proven rules", m: "Look at the best community rulebooks and decide what to borrow versus write ourselves.", have: "A borrow-vs-build decision",
        auto: null, eye: "The borrow-vs-build decision is written down in the plan/progress log.", s: "done" },
      { f: "Install the quality skills", m: "Install the test-first skill and security skills.", have: "Skills installed and ready",
        auto: null, eye: "Each installed skill opens without error when you trigger it.", s: "done" },
      { f: "Write our own rulebooks", m: "Two plain rulebooks (backend and frontend): naming, structure, how the parts connect.", have: "Two house-rule skills",
        auto: null, eye: "Open the backend and frontend rulebooks — both cover naming, structure and layout.", s: "done" },
      { f: "Set up the safety tooling", m: "Stricter tooling and a test runner so mistakes get caught before the app runs.", have: "Early-warning tooling",
        auto: "Run `npm run typecheck` (strict build) and `npm test` (the runner) — both green.", eye: "The test folders mirror the code layout.", s: "done" },
      { f: "Point the AI at the rules", m: "Wire the project guide so the AI opens the right rulebook automatically.", have: "AI self-serving the right rules",
        auto: null, eye: "Each link in the guide opens the correct rulebook/skill.", s: "done" },
    ],
    signoff: "Every skill loads without error · a small test-first change lands in correctly-named files · all guide links resolve." },

  { num: "003", name: "Make the code safer", tag: "TypeScript Conversion",
    goal: "Upgrade the code to a stricter language that flags mistakes before the app runs — like spell-check for code. Nothing behaves differently.",
    steps: [
      { f: "Turn on strict mode", m: "The backend switches to the most thorough safety checks from the start.", have: "Backend under strict checks",
        auto: "Run `npm run typecheck` — passes with the strict settings on.", eye: null, s: "done" },
      { f: "Agree the shapes of our data", m: "Define the exact shape of core things (session, question, briefing) so every part agrees.", have: "Agreed core definitions",
        auto: "Run `npm run typecheck` — the core types compile and the code uses them.", eye: null, s: "done" },
      { f: "Convert piece by piece", m: "Convert the whole backend outside-in — engine first, then the API server, then the command-line tool — keeping every test green at each step.", have: "Whole backend converted — 0 backend .js left",
        auto: "Run `npm test` — expect 30/30, same as before the conversion.", eye: "Done: engine, API server and command-line all converted. App + command-line still behave the same.", s: "done" },
      { f: "Tighten the loose ends", m: "Tidy up any vague spots the conversion reveals.", have: "No soft edges left",
        auto: "Run `npm run typecheck` — no loose/untyped escapes left (no stray `any` or ignores).", eye: null, s: "done" },
    ],
    signoff: "Safety build passes with no loose spots · tests green · the app and command-line behave identically to before." },

  { num: "004", name: "A proper engine room", tag: "Backend API v1",
    goal: "Reshape the backend into clean layers behind a versioned doorway (an API) so it can grow without becoming spaghetti. The product does the same thing today.",
    steps: [
      { f: "Draw the menu of services", m: "List every service and write the official menu (contract): what you can ask for and what you get back.", have: "A written service menu",
        auto: null, eye: "Once built: the contract doc lists every request and its response shape.", s: "done" },
      { f: "Build the shared plumbing", m: "The shared path every request flows through: error handling, who-you-are context, a slot for the login check later.", have: "Consistent request handling",
        auto: "Once built: `npm test` covers the shared error shape.", eye: "Once built: a forced error comes back in one consistent shape.", s: "done" },
      { f: "Build each service in clean layers", m: "Each area is three small single-job parts (front desk, logic, data), written test-first.", have: "Small single-job parts",
        auto: "Once built: `npm test` — each service's test was written before its code and passes.", eye: "Once built: the routes respond as the contract says.", s: "done" },
      { f: "Lay out the test rooms", m: "Arrange the tests to mirror the code so any test is instantly findable.", have: "A mirrored test layout",
        auto: null, eye: "Once built: small tests sit beside the code, bigger ones in a matching tree.", s: "done" },
    ],
    signoff: "Every route follows the standard · each service was tested first · storage could be swapped without touching the logic." },

  { num: "005", name: "A real database", tag: "Postgres Foundation",
    goal: "Move live data (organisations, users, sessions) off loose files into a proper database, so many people can use it safely and nothing is lost on restart.",
    steps: [
      { f: "Pick the database toolkit", m: "Choose the proven tool for managing the database and record the choice.", have: "Toolkit on record",
        auto: null, eye: "Once built: the choice is written in the progress log.", s: "done" },
      { f: "Build the first tables", m: "Create the core tables (orgs, users, sessions, run-history pointer, invitations) as a proper versioned change.", have: "The core tables",
        auto: "Once built: one command builds the database from empty.", eye: "Once built: you can run that one command and the tables appear.", s: "done" },
      { f: "Plug the backend into the database", m: "Connect the backend and swap session/user storage over, behind the same doorway so the logic doesn't change.", have: "Backend on the database",
        auto: "Once built: `npm test` — services unchanged, now reading/writing the database.", eye: "Once built: a session survives a server restart.", s: "done" },
      { f: "One-command local setup", m: "Any teammate can spin up the database locally with one documented command.", have: "One-step DB start",
        auto: null, eye: "Once built: a teammate starts the database from the one written command.", s: "done" },
    ],
    signoff: "Database builds from clean in one command · a session survives a server restart · tests green and a teammate can start the DB." },

  { num: "006", name: "The front door", tag: "Auth",
    goal: "A real front door — register and log in with strong passwords. Because it's HR, signing up also creates the company, so data belongs to the organisation, not a lone person.",
    steps: [
      { f: "Finalise the accounts tables", m: "Finalise the tables for companies, people, sign-in methods and invitations.", have: "Account tables ready",
        auto: null, eye: "Once built: the tables exist with every field they need.", s: "done" },
      { f: "Register and login with safe passwords", m: "Passwords are stored as a strong scramble — the real password is never kept, even we can't see it.", have: "Working register and login",
        auto: "Once built: `npm test` proves the raw password is never stored (only the scramble).", eye: "Once built: you can register and log in.", s: "done" },
      { f: "Keep people in, guard the doors", m: "A secure pass on login and a guard that turns logged-out visitors away from protected pages.", have: "Guarded pages",
        auto: "Once built: `npm test` proves a protected page is refused when logged out.", eye: "Once built: logged out, a protected page turns you away.", s: "done" },
      { f: "Signup creates the company", m: "Signing up creates the org, makes the first person the owner, and fences all data to their company.", have: "Company auto-created on signup",
        auto: "Once built: `npm test` proves company A can't read company B's data.", eye: "Once built: registering creates a person + their company, with that person as owner.", s: "done" },
    ],
    signoff: "Signup creates a person and a company · login works and logged-out access is refused · two companies cannot see each other's data." },

  { num: "007", name: "The login screen", tag: "Folded into the admin console",
    goal: "The visible payoff — login made real in the app you can click. Folded into your existing admin console (no separate app), then the console's data re-pointed to your real company so two companies can't see each other's runs.",
    steps: [
      { f: "Fold login into the console", m: "The admin console gets a real front door: opened logged-out it asks you to log in before any screen shows; logged-in it lets you straight in; a refresh keeps you in.", have: "A login-gated console",
        auto: "Run `npm test` — green (49/49) — and `npm run typecheck` — clean.", eye: "Open the console logged out — you get a login screen, no nav rail.", s: "done" },
      { f: "Register and login screens", m: "The actual screens: register creates your account + company and drops you in; login signs you back in; a wrong password shows a plain message.", have: "Register and login screens",
        auto: null, eye: "Both screens appear correctly; a wrong password shows a readable message.", s: "done" },
      { f: "Wire the screens to the backend", m: "Connect the screens to the secure Phase-006 backend so signup and login really work, a refresh keeps you in, and logout returns you to login for real.", have: "Screens that really work",
        auto: null, eye: "Register a company, log in, reach the app; a refresh keeps you in; logout returns you to login.", s: "done" },
      { f: "Point the console's data at your company", m: "Switch the console off the shared placeholder data onto your logged-in company's fenced data, so two companies can't see each other's sessions or runs.", have: "Per-company data isolation",
        auto: "Once built: `npm test` — green — proving company A can't read company B's data.", eye: "As company A you see only A's runs; B's runs never appear; opening B's run by id is refused.", s: "done" },
    ],
    signoff: "Log in and out in the admin console (no separate app) · a refresh keeps you logged in · the console shows only your company's runs · two companies cannot see each other's data." },

  { num: "008", name: "Keep it safe", tag: "Security",
    goal: "A dedicated safety pass before real staff data flows: protect personal data and make sure AI keys can never leak. Automated checks are the floor — a human expert signs off before real data flows.",
    steps: [
      { f: "Run the security checks", m: "Install the security skills, run their checks, and fix anything flagged until all green.", have: "A clean bill of health",
        auto: "Once built: the security-skill checks all come back green.", eye: null, s: "done" },
      { f: "Protect personal data", m: "Map where personal/HR data lives and lock it down — fenced by company and role, encrypted in transit, kept out of logs.", have: "Fenced personal data",
        auto: "Once built: `npm test` proves reaching another company or role's data is blocked.", eye: "Once built: you confirm the data map matches reality.", s: "done" },
      { f: "Lock away the AI keys", m: "Prove the AI keys live only on the server — never in a browser, a response, or a log. Critical.", have: "Server-only keys",
        auto: "Once built: a search of the built app, responses and logs finds no key anywhere.", eye: null, s: "done" },
      { f: "Human expert sign-off", m: "A security-literate human reviews everything and signs off on the record.", have: "A named expert's sign-off",
        auto: null, eye: "Once built: a named human expert has reviewed and signed off in the log." },
    ],
    signoff: "Checks green · no key leaks anywhere · personal-data access fenced by company and role · a named expert has signed off." },

  // ── Pre-go-live track (docs/pre-go-live/) — make Sero a tool managers come back to.
  // All not-started; state lives in docs/pre-go-live/PROGRESS.md, not a todo PLAN.md.
  { num: "PG1", name: "Past 1:1s list", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "Your Runs page stops being a placeholder and shows your OWN past 1:1s, newest first — so you can actually come back to them.",
    steps: [
      { f: "Load your own 1:1s", m: "Wire the page to the member-safe endpoint that returns only your finished 1:1s (it already exists).", have: "Your real 1:1s listed",
        auto: "Run `npm test` + `npm run typecheck` — both green.", eye: "Open Past 1:1s — your finished 1:1s show, newest first.", s: "done" },
      { f: "Empty + error states", m: "No 1:1s yet → a friendly start-your-first message; a failed load → a plain retry, not a broken screen.", have: "Every state handled",
        auto: null, eye: "With no 1:1s you see the empty state; nothing looks half-built.", s: "done" },
      { f: "Only ever your own", m: "You never see a colleague's list or the admin whole-company view.", have: "Fenced to you",
        auto: "Run `npm test` — a different member sees only their own.", eye: "Log in as another member — a different list.", s: "done" },
    ],
    signoff: "Your finished 1:1s show newest-first · a member with none sees the empty state · you never see another member's 1:1s." },

  { num: "PG2", name: "Reopen a 1:1", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "Click any past 1:1 and re-read it — a clean, read-only version of the briefing Sero prepared.",
    steps: [
      { f: "Open one read-only", m: "A detail page showing the briefing you saw after that meeting — no admin verdict tools.", have: "A re-readable briefing",
        auto: "Run `npm test` + `npm run typecheck` — green.", eye: "Click a 1:1 → its briefing opens; Back returns to the list.", s: "done" },
      { f: "Show what you agreed", m: "Put 'what you agreed' and 'what to watch for' up front — the parts the next meeting builds on.", have: "Carry-forward parts prominent",
        auto: null, eye: "The agreed actions + watch-fors are easy to spot.", s: "done" },
      { f: "Only your own", m: "Typing someone else's 1:1 id is refused.", have: "Fenced",
        auto: "Run `npm test` — opening another member's id → not found.", eye: null, s: "done" },
    ],
    signoff: "Any past 1:1 opens read-only and returns cleanly · you can't open one that isn't yours." },

  { num: "PG3", name: "Rate a 1:1", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "Say how useful each 1:1 was — a one-tap 1–5 star right after the meeting, plus an optional note — so the tool learns and Carl gets an honest read.",
    steps: [
      { f: "Save a rating", m: "A member-safe endpoint stores your stars + optional note alongside the run (a simple file, written safely).", have: "Ratings saved safely",
        auto: "Run `npm test` — covers the endpoint (bad stars → 400, logged-out → 401, not-yours → 404).", eye: "Rate a 1:1, reload — the stars stick.", s: "done" },
      { f: "Ask at the right moment", m: "A gentle one-tap rating at the END of a 1:1 (with Skip), plus on the detail later; a low score reveals a one-line 'what missed?'. Never an 'unrated' nag.", have: "In-flow, no nagging",
        auto: null, eye: "Finish a 1:1 → gently asked to rate; skipping is easy; no guilt-y unrated count anywhere.", s: "done" },
      { f: "Accessible + private", m: "Stars work by keyboard/screen-reader and stay ≥14px; the note is a private manager field — never shown to staff, never logged.", have: "Accessible + private",
        auto: null, eye: "You can set the rating with the keyboard.", s: "done" },
    ],
    signoff: "Rate a 1:1 at the end and later · it persists · a low score invites a note · nothing nags · the note never leaves your view." },

  { num: "PG4", name: "Your Team, built for you", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "The Team page fills itself in — the people you've met with, grouped from your past 1:1s: how often, how recently, how useful on average.",
    steps: [
      { f: "Group your people", m: "One card per person from your own 1:1s (names differing only by case/spacing merge automatically).", have: "People cards appear",
        auto: "Run `npm test` + `npm run typecheck` — green.", eye: "Two 1:1s about the same person → one card, count 2, right average.", s: "done" },
      { f: "Team is the main way in", m: "Team becomes the primary surface; the flat list is relabelled 'Past 1:1s'. (Clicking a person → their page lands in PG5.)", have: "Person-first framing",
        auto: null, eye: "The nav + page read 'Past 1:1s' (not 'Runs'); admin screens unchanged.", s: "done" },
      { f: "Honest first-timer states", m: "A one-meeting card doesn't imply history it lacks; an empty state for no 1:1s.", have: "Honest early states",
        auto: null, eye: "With one 1:1 the card reads '1 meeting · not yet rated'.", s: "done" },
    ],
    signoff: "People appear grouped from your 1:1s with correct counts/averages · case/spacing duplicates merge · Team is the primary way in." },

  { num: "PG5", name: "A person in one place", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "Click a person and see all your 1:1s with them, their ratings, and — the key bit — 'Since last time: what you agreed and what to watch for' when you prep the next one.",
    steps: [
      { f: "The person page", m: "All your 1:1s with that person, newest first, each openable, with its rating and a summary header.", have: "One place per person",
        auto: "Run `npm test` + `npm run typecheck` — green.", eye: "Open a person → their 1:1s + a '3.0 avg · 4 rated' header.", s: "done" },
      { f: "Since last time", m: "A block pulling the last meeting's agreed actions + watch-fors (already in the data) so returning actually HELPS, not just reminds.", have: "It remembers for you",
        auto: null, eye: "The person page shows 'Since last time' from the most recent 1:1.", s: "done" },
      { f: "Prep the next one", m: "A 'Prep next 1:1' button pre-fills the person. Note: this is the only paid path, and only if you run the full pipeline.", have: "Straight into the next prep",
        auto: null, eye: "Prep next 1:1 starts intake pre-filled.", s: "done" },
    ],
    signoff: "A person shows all their 1:1s + ratings + a correct average · 'Since last time' surfaces last meeting's actions · prep-next pre-fills." },

  { num: "PG6", name: "Carl's master key (safe)", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "Give ONLY Carl a read-only key to see across all alpha companies — built and proven safe behind the scenes, no screens yet.",
    steps: [
      { f: "A safe, read-only key", m: "Identity checked server-side from the login (never the browser); the code can only ever read; every use is logged.", have: "A tightly-gated key",
        auto: "Run `npm test` — superadmin sees all; a normal owner → 403; no route can change anything; tests run with the dev shortcut off.", eye: null, s: "done" },
      { f: "Cross-company reads", m: "Read-only endpoints that loop the real companies/users and reuse the existing per-company run walk.", have: "The data reachable",
        auto: "Run `npm test` + `npm run typecheck` — green.", eye: null, s: "done" },
    ],
    signoff: "Only Carl's account reads across companies · everyone else refused · nothing is writable · each access is logged · tests green with the dev shortcut off." },

  { num: "PG7", name: "Who's using Sero", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "A screen for Carl: every alpha company and its people — roles, join dates, 1:1 counts — plus whether they're coming back, and how ratings look overall.",
    steps: [
      { f: "Companies → people", m: "List every company and its users (name, role, joined, 1:1 count).", have: "The alpha at a glance",
        auto: "Run `npm test` + `npm run typecheck` — green; a normal owner is refused.", eye: "As Carl the page lists every company + users; a normal owner can't reach it.", s: "todo" },
      { f: "Are they coming back?", m: "Per-user last-active + 1:1s-over-time — the return-visit signal the whole track exists to prove.", have: "Return-visit signal",
        auto: null, eye: "Each user shows last-active + recent activity.", s: "todo" },
      { f: "How ratings look overall", m: "An alpha-wide summary: average stars + a count of low scores.", have: "Honest signal in one glance",
        auto: null, eye: "The page shows the alpha-wide rating summary.", s: "todo" },
    ],
    signoff: "Carl sees every company + users with join dates, run counts, return-visit signal and an alpha-wide rating summary · normal owners refused." },

  { num: "PG8", name: "Drill into a person's work", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "From that screen, Carl clicks a user and sees their people, their 1:1s and ratings, and can open any briefing read-only.",
    steps: [
      { f: "User → people + 1:1s", m: "Drill from a user into their people (same grouping) and their 1:1s with ratings.", have: "The full picture",
        auto: "Run `npm test` + `npm run typecheck` — green; still refused for normal owners.", eye: "As Carl, open a user → their people + 1:1s + ratings.", s: "todo" },
      { f: "Open a briefing read-only", m: "Reuse the member-safe read-only view; never the richer admin readers.", have: "See what they saw",
        auto: null, eye: "A 1:1 opens read-only.", s: "todo" },
    ],
    signoff: "Carl drills user → people → 1:1s → ratings and opens briefings read-only · normal owners refused · no cross-company leak for anyone else." },

  { num: "PG9", name: "Tidy the people list", tag: "Pre-go-live", track: "Pre-go-live", folder: "docs/pre-go-live/", stateFile: "PROGRESS.md",
    goal: "Once there's real history: merge duplicate people and see simple rating roll-ups. (Manual roster + charts stay parked for after the alpha.)",
    steps: [
      { f: "Merge duplicates", m: "Merge two cards that are the same person, and edit a name; history combines and sticks.", have: "One card per real person",
        auto: "Run `npm test` + `npm run typecheck` — green; the merge survives a reload.", eye: "Merge 'Priya' + 'Priya S.' → one card with combined history.", s: "todo" },
      { f: "Rating roll-ups", m: "Per-person average usefulness with its count.", have: "Simple roll-ups",
        auto: null, eye: "A person shows a combined average with its count.", s: "todo" },
    ],
    signoff: "Duplicate people merge into one card with combined history · the merge persists · per-person roll-ups read correctly." },
];

// Your verdicts live here — their own key, kept separate from my build statuses
// so a tick never changes what I report as built.
const KEY = "sero-tasks-verdicts-v1";
const CHEV = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
const TICK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;

// MY build status -> the read-only chip. Never affected by your verdict.
const STATUS = {
  done: { cls: "done", label: "✅ Built" },
  doing: { cls: "doing", label: "🔵 Building" },
  todo: { cls: "todo", label: "⚪ Not started" },
};
const statusOf = (s) => STATUS[s] || STATUS.todo;

// ── Ready-to-paste CONTINUE / VERIFY prompt per phase ───────────────────────
// Ported from the old Build plan page. Built purely from each step's build
// status (st.s) — never from your verdict ticks — so the handoff prompt stays
// accurate as work lands. Drop one into a fresh thread to pick a phase up from
// exactly where it stands.
// Track/folder/state-file are per-phase, defaulting to the Prototype → Production
// track so the original phases are unchanged; the pre-go-live phases override them.
const trackOf = (ph) => ph.track || "Prototype → Production";
const folderOf = (ph) => ph.folder || "docs/todo/<slug>/";
const stateOf = (ph) => ph.stateFile || "PLAN.md";

const PREAMBLE = (pi) =>
  `Phase ${DATA[pi].num} — ${DATA[pi].name} · ${DATA[pi].tag} (${trackOf(DATA[pi])} checklist).\n\n` +
  `Continue this with the Darren Method: there's already a plan folder ${folderOf(DATA[pi])} — read its ${stateOf(DATA[pi])} "Current state" first and pick up from there. Do ONE step at a time and stop for my green light before anything risky or before the next phase. You don't self-certify; I walk the QA scenarios and approve. The moment I approve a step, commit locally (no push/PR unless I ask).\n\n` +
  `Before continuing: run npm test (free/offline) and tell me the result, so you're building on a known-good baseline, not pinning old failures on this work.\n\n` +
  `Rules: Surgical changes only — touch what the task needs, match existing style, don't refactor what isn't broken; if you spot dead code, mention it, don't delete it. Engine honesty — surface raw model output; flag problems, never hardcode text to hide them. No paid runs (anything hitting the OpenAI API — gate/smoke/eval/live replays, ~$0.35/case up to ~$3) without my explicit yes for that run, cost stated first; default to free checks (npm test, node scripts/replay-scenario.js <id> --fixtures-only).\n\n` +
  `First, tell me plainly where things stand and what the next step is — then continue. End with a short "In simple terms:" line.`;

const KICK = [
  // 001 Tidy the project
  `Goal: move every file into five named rooms (backend, admin, frontend, content, docs) plus one address-book file for where data lives — pure spring-cleaning, nothing users see changes.\nFirst move (before any code): a move-map — current path → new path for every file/folder — plus the proposed tree and where the address-book file sits. I approve the map before anything moves.\nOut of scope: no renaming for "clarity", no logic edits, no dependency upgrades, no splitting files. Moves and reference-path updates only.\nWatch out for: broken references after moving — relative imports, hardcoded/absolute paths, config globs, script paths in package.json, fixture/log paths. Grep for the old paths; don't assume the test runner caught them all.\nDone when:\n• Agent-verified: npm test green with the SAME count as the pre-move baseline; CLI replay (node scripts/replay-scenario.js <id> --fixtures-only) runs clean.\n• Owner-walked: app starts and a full run works; product behaves identically.`,
  // 002 House rules
  `Goal: teach the agent our standards once as auto-loaded skills — install a test-first skill + security skill(s), write two plain rulebooks (backend + frontend), and wire the project guide so the right rulebook opens automatically.\nFirst move (before any code): a borrow-vs-build survey — proven community rulebooks/skills worth adopting vs what we write ourselves — written into PLAN.md for my pick.\nOut of scope: don't apply the new conventions across the codebase yet (that's later phases). Skills, rulebooks, wiring, and one tiny proof change only.\nWatch out for: dead links and skills that silently don't load — verify each skill actually triggers, and that every guide link resolves to a real file.\nDone when:\n• Agent-verified: every skill loads/triggers without error; all guide links resolve; one small test-first change lands in correctly-named files following the new rulebook.\n• Owner-walked: I open the guide and the right rulebook surfaces for backend vs frontend work.`,
  // 003 Make the code safer
  `Goal: convert the backend to TypeScript in strict mode — define core data shapes (session, question, briefing) first, then convert outside-in keeping every test green.\nFirst move (before any code): turn on strict mode and post the conversion order (which files, in what sequence, outside-in) plus the three core shapes as types, for my review.\nOut of scope: no behaviour changes, no redesign, no new features. Same logic, now typed. Don't touch frontend.\nWatch out for: any / as / @ts-ignore creeping in to silence errors — that defeats the point. If a real shape is unclear, flag it to me rather than papering over it.\nDone when:\n• Agent-verified: strict build passes with no loose/untyped escapes (no stray any/ignores); npm test green.\n• Owner-walked: app + CLI behave identically.`,
  // 004 A proper engine room
  `Goal: reshape the backend into clean layers behind a versioned API — service contract first, then shared plumbing (consistent errors, who-you-are context, a slot for the login check), then each service as three small test-first parts.\nFirst move (before any code): the service menu/contract — every route, its request and response shape, and the error format — as a written doc for my review before building.\nOut of scope: no real auth yet (just the slot), no database yet (keep current storage behind the layer), no new product features. Structure only.\nWatch out for: logic leaking into routes, or storage details bleeding into business logic — the swap-storage-without-touching-logic test is the real check. Write each service's test before its code.\nDone when:\n• Agent-verified: every route follows the standard; each service has its test committed before its implementation; npm test green.\n• Owner-walked: you can describe swapping storage with no logic change; routes respond in the contracted shape.`,
  // 005 A real database
  `Goal: move live data (orgs, users, sessions) off loose files into Postgres, behind the same API doorway so the logic doesn't change.\nFirst move (before any code): pick and record the DB toolkit (driver/ORM/migration tool) with a one-line why, then propose the first table set (orgs, users, sessions) and the from-empty build command — for my review.\nOut of scope: no schema for later features (auth tables, etc.), no data-model redesign, no API behaviour change. Just relocate today's data.\nWatch out for: hidden file-store assumptions (ordering, IDs, "read the whole file") leaking into queries; and an undocumented local setup a teammate can't reproduce. Keep the migration runnable from empty, repeatably.\nDone when:\n• Agent-verified: DB builds from empty in ONE command; npm test green.\n• Owner-walked: a session survives a server restart; a teammate starts the DB from one documented command.`,
  // 006 The front door
  `Goal: real register/login with strong passwords stored scrambled (raw password never kept); because it's HR, signup also creates the company so data belongs to the org, not a person.\nFirst move (before any code): finalise the accounts tables (companies, people, sign-in methods, invitations) and the signup→owner→org-ownership flow, as a written design for my review.\nOut of scope: no customer-facing UI yet (that's Phase 7), no roles/permissions beyond first-user-is-owner, no password reset/SSO/email flows unless I ask. Core auth + org fencing only.\nWatch out for: leaking secrets — never log or return the password, the hash, or tokens; confirm org-fencing actually blocks cross-company reads (not just hides them in the UI). Never enter real credentials yourself — build the flow and let me test sign-in.\nDone when:\n• Agent-verified: npm test green incl. tests that logged-out access is refused and company A can't read company B's data; no secret appears in logs/responses.\n• Owner-walked: signup creates a person + company (first user = owner); login works; logged-out access refused.`,
  // 007 The login screen (folded into the admin console)
  `Goal: make login real in the app you can click by FOLDING it into the existing admin console (no separate app) — register/login/logout screens + a boot gate wired to the secure Phase-006 backend — then re-point the console's data to the logged-in company so two companies can't see each other's runs.\nFirst move (before any code): read docs/todo/login-screen/PLAN.md "Current state" — Phase 1 (login gate + screens) is built and approved; pick up at Phase 2 (re-point data). Verify the generic v1 routes fence by the cookie's orgId BEFORE migrating the client; if any still fall back to DEFAULT_ORG_ID, flag it as the first task — don't paper over it (engine-honesty rule).\nOut of scope: no separate customer-facing app (decided with Carl: fold into admin); no new product features beyond parity with today's console; org-name display parked.\nWatch out for: a v1 route that silently serves the placeholder org; client call sites where the id moves into the path; session/login state surviving refresh.\nDone when:\n• Agent-verified: npm test + npm run typecheck green incl. a test that company A can't read company B's data.\n• Owner-walked: log in/out in the console; a refresh keeps you in; logout returns to login; as company A you see only A's runs and can't open B's.`,
  // 008 Keep it safe
  `Goal: a dedicated safety pass before real staff data flows — security-skill checks to green, personal data fenced by company + role, and AI keys proven server-only (never in a browser, response, or log).\nFirst move (before any code): install/run the security checks and post exactly what they flag — a triage list (issue → severity → fix plan) for my review before fixing.\nOut of scope: no new features, no broad refactors — fix only what the checks and the data-fencing/key-leak review surface. Park anything bigger.\nWatch out for: AI keys ending up in the client bundle, an API response, or a log line — check the built frontend bundle specifically, not just the source. Confirm role-level fencing, not just company-level.\nDone when:\n• Agent-verified: security-skill checks green; grep of built bundle/responses/logs shows no key leak; tests prove personal-data access is fenced by company + role.\n• Owner-walked: a named human expert has reviewed and signed off (record the name in PLAN.md).`,

  // ── Pre-go-live KICK prompts (indexes 8–16, one per PG1–PG9) ────────────────
  // PG1 Past 1:1s list
  `Goal: turn the member Runs page from a placeholder into the manager's own past 1:1s, newest first, wired to the member-safe /api/v1/runs/mine (already built + tested).\nFirst move (before any code): read docs/pre-go-live/001-manager-runs-list/00-phase-overview.md and PROGRESS.md, then add listMyRuns() to shared/api.js and sketch the list markup for my ok.\nOut of scope: no reopen/detail yet (that's PG2), no rating, no team grouping. Just the list + its states.\nWatch out for: the fence — a member must see ONLY their own runs; and pre-login/dev/anonymous runs carry no userId so they're intentionally invisible (documented cutover, no backfill).\nDone when:\n• Agent-verified: npm test + npm run typecheck green; a different member sees only their own.\n• Owner-walked: your finished 1:1s list newest-first; none → the empty state; a failed load → a plain retry.`,
  // PG2 Reopen a 1:1
  `Goal: click a past 1:1 and re-read it read-only, via /api/v1/runs/mine/:id, reusing review-run.js's briefing render minus the admin verdict tools.\nFirst move (before any code): read docs/pre-go-live/002-reopen-a-run/00-phase-overview.md, add getMyRun(id) to shared/api.js, register a member run-detail stage.\nOut of scope: no rating widget yet (PG3), no editing — read-only only.\nWatch out for: memberRunView is briefing-only (no raw prep/focus/transcript) — render the briefing shape, never fall through to the admin readers; opening another member's id must 404. Surface next_actions + watch_for prominently (they power PG5).\nDone when:\n• Agent-verified: npm test + npm run typecheck green; another member's id → not found.\n• Owner-walked: any past 1:1 opens read-only and Back returns cleanly.`,
  // PG3 Rate a 1:1
  `Goal: let the manager rate a 1:1 (1–5 stars 'Did this help you run the 1:1?' + optional note), stored as a rating.json sidecar written atomically; surfaced on the list + detail; Carl sees all ratings.\nFirst move (before any code): read docs/pre-go-live/003-rate-a-1-1/00-phase-overview.md; write the endpoint test FIRST (bad stars → 400, logged-out → 401, not-owner → 404).\nOut of scope: no DB columns (sidecar stays — CTO-review decision); no team averages yet (PG4/PG5).\nWatch out for: the note is a PRIVATE manager field — never in employee-facing output, never logged, add **/rating.json to .gitignore. In-flow one-tap rating at the END of a 1:1 with Skip; NEVER an 'unrated' nag. Stars keyboard/screen-reader operable, ≥14px.\nDone when:\n• Agent-verified: npm test covers the endpoint; typecheck green; rating persists to the file (verify the destination, not the code).\n• Owner-walked: rate at the end + later; a low score invites a note; nothing nags.`,
  // PG4 Your Team, built for you
  `Goal: fill the Team page automatically — one card per person, grouped from the manager's own 1:1s, with times-met / last-met / average usefulness.\nFirst move (before any code): read docs/pre-go-live/004-team-auto-built/00-phase-overview.md; group client-side over the /runs/mine payload by a normalized name key (trim + lower-case), and factor the grouping into a shared function PG8 can reuse server-side.\nOut of scope: no add/edit/merge (that's PG9), no charts. Grouping + cards only.\nWatch out for: keep the display name separate from the grouping key; design the one-meeting card so it doesn't imply history it lacks. Relabel the member 'Runs' nav item/page to 'Past 1:1s' and link every row to its person; Team is the primary way in.\nDone when:\n• Agent-verified: npm test + npm run typecheck green.\n• Owner-walked: two 1:1s about one person → one card (count 2, right average); 'Priya'/'priya' merge; empty + one-meeting states read cleanly.`,
  // PG5 A person in one place
  `Goal: a person page — all your 1:1s with them (openable, with ratings), a summary header, and the make-or-break 'Since last time' block (last meeting's next_actions + watch_for, already in the payload).\nFirst move (before any code): read docs/pre-go-live/005-person-detail/00-phase-overview.md; register a person-detail stage, reuse PG1 rows + PG2 detail + PG4 grouping.\nOut of scope: no cross-session engine 'remembering' (that stays deferred) — 'Since last time' is just a read-only composed block over existing data.\nWatch out for: hide the block if the latest run has neither field (no empty scaffolding). 'Prep next 1:1' is the ONLY paid path and only if the full pipeline runs — flag it in QA so a paid run isn't triggered by accident.\nDone when:\n• Agent-verified: npm test + npm run typecheck green.\n• Owner-walked: a person shows their 1:1s + ratings + a correct 'N avg · M rated'; 'Since last time' appears; prep-next pre-fills.`,
  // PG6 Carl's master key (safe)
  `Goal: a read-only superadmin key that ONLY Carl can use to read across companies — proven by tests, no screens yet.\nFirst move (before any code): read docs/pre-go-live/006-superadmin-gate/00-phase-overview.md; write the 403 tests FIRST (with DEV_AUTOLOGIN off). Resolve the caller's email SERVER-SIDE from the authenticated userId (the users join in findIdentityByToken) — never from a header/cookie/body; match a normalized SUPERADMIN_EMAILS.\nOut of scope: no admin UI yet (PG7/PG8). Gate + read-only endpoints + audit only.\nWatch out for: make the superadmin service STRUCTURALLY read-only — no write/delete imports, GET-only routes through one requireSuperadmin funnel; log one line per superadmin request (who/when/route/target). The dev side-door has no allowlisted email and must never satisfy the gate.\nDone when:\n• Agent-verified: npm test — superadmin sees all, normal owner → 403, no route accepts a mutating method, no cross-org leak; typecheck green.\n• Owner-walked: n/a (backend only) — I read the test results.`,
  // PG7 Who's using Sero
  `Goal: a superadmin-only screen listing every alpha company + its users (name, role, joined, 1:1 count), the return-visit signal (last-active + 1:1s-over-time), and an alpha-wide rating summary.\nFirst move (before any code): read docs/pre-go-live/007-admin-registered/00-phase-overview.md; register an admin stage via the 6-step pattern; fetch the PG6 cross-company endpoint.\nOut of scope: no per-user drill-down yet (PG8). The list + the two summaries only.\nWatch out for: the frontend admin-only nav guard is cosmetic (every owner passes it) — security rests on the backend requireSuperadmin 403; keep the plain-owner→403 test. All counts/signal derive from existing run timestamps — no new tracking infra.\nDone when:\n• Agent-verified: npm test + npm run typecheck green; a normal owner is refused.\n• Owner-walked: as Carl the page lists every company + users with join dates, run counts, return-visit signal and the alpha-wide rating summary; a normal owner can't reach it.`,
  // PG8 Drill into a person's work
  `Goal: from the registered screen, Carl clicks a user and sees their people (same grouping as PG4), their 1:1s + ratings, and can open any briefing read-only.\nFirst move (before any code): read docs/pre-go-live/008-admin-user-drilldown/00-phase-overview.md; extend the PG6 superadmin service with read-only per-user reads; reuse the shared grouping function from PG4.\nOut of scope: no writes/edits from the admin view — read-only. No new person store.\nWatch out for: still superadmin-gated (normal owner → 403); reuse the member-safe read-only briefing view, never the richer admin readers; no cross-company leak for anyone but the superadmin.\nDone when:\n• Agent-verified: npm test + npm run typecheck green; refused for normal owners.\n• Owner-walked: as Carl, open a user → their people + 1:1s + ratings; a 1:1 opens read-only.`,
  // PG9 Tidy the people list
  `Goal: once there's real history — merge duplicate people (an alias remap on the PG4 normalized key), edit a name, and show per-person rating roll-ups.\nFirst move (before any code): read docs/pre-go-live/009-roster-polish/00-phase-overview.md; propose the smallest person-identity store (light people record vs per-manager alias map) with 2–3 options for my pick BEFORE building.\nOut of scope (PARKED post-alpha): manual 'add a person' roster, search/filter, trend sparklines/charts. Merge + roll-ups only.\nWatch out for: the merge must STICK after reload (verify the destination); re-point grouping at the resolved person without re-architecting PG4.\nDone when:\n• Agent-verified: npm test + npm run typecheck green; the merge survives a reload.\n• Owner-walked: merge 'Priya' + 'Priya S.' → one card with combined history; per-person roll-ups read correctly.`,
];

// VERIFY prompt for a phase whose every step is already built — flips the brief
// from "continue building" to "confirm it was done right and hand over checks".
const VERIFY = (pi) => {
  const ph = DATA[pi];
  return `Phase ${ph.num} — ${ph.name} · ${ph.tag} (${trackOf(ph)} checklist).\n\n` +
    `This phase is built — every step is marked done. Your job now is to VERIFY it was done right, not to build more. Don't change code unless verification turns up a real problem; if it does, stop and tell me before fixing.\n\n` +
    `Run the free checks first and report each result plainly: npm test (expect the same pass count as the pre-work baseline) and node scripts/replay-scenario.js <id> --fixtures-only. No paid runs (anything hitting the OpenAI API — gate/smoke/eval/live replays, ~$0.35/case up to ~$3) without my explicit yes for that run, cost stated first.\n\n` +
    `Then read the plan folder ${folderOf(ph)} ${stateOf(ph)} to confirm what was claimed matches what shipped, and walk me through the owner checks I do by hand. Wait for my go on the sign-off gate before touching the next phase — you don't self-certify.\n\n` +
    `What "done right" means for this phase:\n${KICK[pi]}\n\n` +
    `Owner sign-off gate: ${ph.signoff}\n\n` +
    `First, tell me plainly whether the free checks passed and exactly what I need to check by hand — then wait. End with a short "In simple terms:" line.`;
};

// True when every step of a phase is built (status done) — ready to verify.
const isBuilt = (ph) => ph.steps.every((st) => (st.s || "todo") === "done");

// A live snapshot of the phase's progress + which step to resume at, built from
// each step's committed status (st.s).
const STATUS_WORD = { done: "DONE", doing: "IN PROGRESS", todo: "TO DO" };
function buildContinue(pi) {
  const ph = DATA[pi];
  if (isBuilt(ph)) return VERIFY(pi);
  const lines = ph.steps
    .map((st, si) => `  ${si + 1}. ${st.f} — ${STATUS_WORD[st.s || "todo"]}`)
    .join("\n");
  const nextIdx = ph.steps.findIndex((st) => (st.s || "todo") !== "done");
  const next =
    nextIdx === -1
      ? "All steps are marked done — verify the whole phase against its sign-off, then check with me before the next phase."
      : `Pick up at step ${nextIdx + 1} ("${ph.steps[nextIdx].f}") and keep going one step at a time. Don't redo steps already marked DONE.`;
  return `${PREAMBLE(pi)}\n\nWhere this phase stands right now:\n${lines}\n${next}\n\nThis phase — ${ph.name}:\n${KICK[pi]}`;
}
const CONTINUES = DATA.map((_, pi) => buildContinue(pi));

let verdicts = {};
function loadVerdicts() {
  try { verdicts = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { verdicts = {}; }
}
function saveVerdicts() {
  try { localStorage.setItem(KEY, JSON.stringify(verdicts)); } catch {}
}
const vid = (p, s) => `p${p}s${s}`;

// True only when the address isn't the one your ticks are saved against. Empty
// port (e.g. a built/prod deploy) is treated as fine — the warning is really for
// the 3000-vs-3002 dev mix-up that made ticks look wiped.
function onWrongAddress() {
  const port = window.location.port;
  return port !== "" && port !== "3000";
}

// Code-formatted helper so `commands` read clearly inside the check lines.
function fmtCode(text) {
  return esc(text).replace(/`([^`]+)`/g, '<code class="tk-code">$1</code>');
}

function checkMeta(st, id) {
  const auto = st.auto
    ? `<div class="tk-check tk-check--auto"><span class="cl-k">App runs (free check):</span><span>${fmtCode(st.auto)}</span>
        <span class="tk-run">
          <button type="button" class="btn btn--sm js-run-check" data-run="${id}">Run the free checks</button>
          <span class="tk-run__result text-sm" id="tk-run-${id}" role="status" aria-live="polite"></span>
        </span></div>`
    : "";
  const eye = st.eye
    ? `<div class="tk-check tk-check--eye"><span class="cl-k">You check (by eye):</span><span>${fmtCode(st.eye)}</span></div>`
    : (st.auto ? `<div class="tk-check tk-check--eye"><span class="cl-k">You check (by eye):</span><span>Nothing by eye — the free check covers it.</span></div>` : "");
  return `<div class="cl-meta tk-meta">
      <div><span class="cl-k">You'll have:</span><span class="cl-have">${esc(st.have)}</span></div>
      ${auto}${eye}
    </div>`;
}

function stepRow(pi, si, st) {
  const id = vid(pi, si);
  const checked = !!verdicts[id];
  const st2 = statusOf(st.s);
  return `<div class="tk-row ${checked ? "is-verified" : ""}" id="tkrow-${id}">
    <div class="tk-row__head">
      <span class="tk-step-no">${si + 1}</span>
      <span class="tk-feat">${esc(st.f)}</span>
      <span class="cl-badge cl-badge--${st2.cls} tk-status">${st2.label}</span>
    </div>
    <div class="tk-means">${esc(st.m)}</div>
    ${checkMeta(st, id)}
    <label class="tk-verdict">
      <input type="checkbox" data-id="${id}" ${checked ? "checked" : ""}>
      <span class="tk-verdict__box">${TICK}</span>
      <span class="tk-verdict__text">I've checked this — looks good</span>
    </label>
  </div>`;
}

function phaseHtml(ph, pi) {
  const steps = ph.steps.map((st, si) => stepRow(pi, si, st)).join("");
  // Phase-level chip: Built only if every step is built; Building if any started.
  const all = ph.steps.map((st) => st.s || "todo");
  const phEff = all.every((s) => s === "done") ? "done" : all.some((s) => s !== "todo") ? "doing" : "todo";
  const phSt = statusOf(phEff);

  // Copy-prompt block — a paste-ready handoff for a fresh thread. Says "verify"
  // once the phase is fully built, "continue" while it's still in progress.
  const built = isBuilt(ph);
  const kickLede = built
    ? "This phase is built. Copy the prompt to check it was done right — it runs the free checks and walks you through your sign-off."
    : "Continuing this phase? Copy the prompt — it captures where we are and picks up from the next unfinished step.";
  const kickBtn = built ? "Copy verify prompt" : "Copy continue prompt";
  const kick = `<div class="cl-kick">
    <div class="cl-kick__lede">${kickLede}</div>
    <div class="cl-kick__actions">
      <button type="button" class="btn btn--sm js-kick" data-kick="${pi}">${kickBtn}</button>
      <span class="cl-kick__saved" id="tk-kick-saved-${pi}">Copied ✓</span>
    </div>
    <details class="cl-kick__preview"><summary>Preview the prompt</summary><pre>${esc(CONTINUES[pi])}</pre></details>
  </div>`;

  return `<section class="tk-phase is-collapsed" id="tkphase-${pi}">
    <div class="tk-phase-head" data-toggle="${pi}">
      <span class="tk-num">${esc(ph.num)}</span>
      <div class="tk-phase-title">
        <h3>${esc(ph.name)} <span class="tk-phase-tag">· ${esc(ph.tag)}</span>
          <span class="cl-badge cl-badge--${phSt.cls}">${phSt.label}</span></h3>
        <div class="tk-goal">${esc(ph.goal)}</div>
      </div>
      <span class="tk-chev">${CHEV}</span>
    </div>
    <div class="tk-steps">${kick}${steps}
      <div class="tk-signoff">
        <span class="cl-k">Sign-off gate:</span><span>${esc(ph.signoff)}</span>
      </div>
    </div>
  </section>`;
}

export function mount(root) {
  loadVerdicts();

  const banner = onWrongAddress()
    ? `<div class="tk-warn">⚠️ You're on the wrong address (<b>${esc(window.location.host)}</b>). Your check-marks are saved against <b>localhost:3000</b> — open <a href="http://localhost:3000/tasks">localhost:3000/tasks</a> so they show up. Nothing is lost.</div>`
    : "";

  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8 tasks">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Tasks</h1>
          <button class="btn btn--ghost js-back" type="button">Back</button>
        </div>
        <div class="page-header__lede"><b>I mark what's built; you tick what you've checked.</b> Each step shows my status (✅ Built / 🔵 Building / ⚪ Not started) — set in the code, can't be wiped — plus how to check it: a free check the app runs for you at the press of a button, and the bit you eyeball. Your tick is your own sign-off, saved in this browser.</div>
      </header>
      ${banner}
      <div class="tk-phases">${DATA.map(phaseHtml).join("")}</div>
    </div>
  `;

  // Your verdict ticks — toggle the row's verified style ONLY. The status chip
  // is never touched here, on purpose.
  root.querySelectorAll('.tk-verdict input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) verdicts[id] = true; else delete verdicts[id];
      saveVerdicts();
      root.querySelector("#tkrow-" + id)?.classList.toggle("is-verified", e.target.checked);
    });
  });

  // "Run the free checks" — call the allow-listed endpoint (runs the test suite,
  // never anything paid) and show ✅ pass count / ❌ what failed, right on the step.
  // A green result is information only; your verdict tick stays your own call.
  root.querySelectorAll(".js-run-check").forEach((b) => {
    b.addEventListener("click", async () => {
      const id = b.dataset.run;
      const out = root.querySelector("#tk-run-" + id);
      b.disabled = true;
      b.textContent = "Running…";
      if (out) { out.textContent = "Running the test suite…"; out.className = "tk-run__result text-sm is-running"; }
      try {
        const r = await runFreeCheck("tests");
        if (out) {
          out.textContent = (r.ok ? "✅ " : "❌ ") + (r.summary || (r.ok ? "Passed" : "Failed"));
          out.className = "tk-run__result text-sm " + (r.ok ? "is-pass" : "is-fail");
        }
      } catch (e) {
        if (out) { out.textContent = "❌ Couldn't run — " + (e.message || e); out.className = "tk-run__result text-sm is-fail"; }
      } finally {
        b.disabled = false;
        b.textContent = "Run the free checks";
      }
    });
  });

  // Copy the continue/verify prompt for a phase, with a brief "Copied ✓" flash.
  root.querySelectorAll(".js-kick").forEach((b) => {
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      const i = b.dataset.kick;
      const text = CONTINUES[i];
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        ta.remove();
      }
      const saved = root.querySelector("#tk-kick-saved-" + i);
      if (saved) {
        saved.classList.add("is-show");
        setTimeout(() => saved.classList.remove("is-show"), 1400);
      }
    });
  });

  // Collapse/expand a phase — ignore clicks on a verdict checkbox.
  root.querySelectorAll("[data-toggle]").forEach((h) => {
    h.addEventListener("click", (e) => {
      if (e.target.closest("label.tk-verdict")) return;
      root.querySelector("#tkphase-" + h.dataset.toggle)?.classList.toggle("is-collapsed");
    });
  });

  const back = () => setState({ stage: STAGES.START });
  root.querySelector(".js-back").addEventListener("click", back);
  keyHandler = (e) => {
    if (e.key === "Escape" && !/^(input|textarea|select)$/i.test(e.target.tagName)) back();
  };
  window.addEventListener("keydown", keyHandler);
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}
