// Prototype → Production checklist (internal). Eight phases, each a collapsible
// card of checkable steps ending in an amber sign-off gate. Ticks persist in
// localStorage (same KEY as the standalone HTML it was ported from), so progress
// carries over. Static content, no API calls. Modeled on guide.js: build
// innerHTML, Back button + Esc -> Home, clean up on unmount.

import { STAGES, setState } from "../state.js";

let keyHandler = null;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const DATA = [
  { num: "001", name: "Tidy the project", tag: "Monorepo Reorg",
    goal: "Pure spring-cleaning: every file moves into a clearly labelled room. Nothing your users see changes.",
    steps: [
      { f: "Labelled rooms", m: "Five named rooms: backend (brain), admin (your screens), frontend (future app), content (words/questions), docs (plans). Junk drawer to labelled drawers.", have: "Five named folders", c: "Folders exist and the tests still pass", s: "done" },
      { f: "One address book for data", m: "Every file location written once in a single file. Change an address once and everything follows.", have: "One file listing where data lives", c: "App and command-line tool both read locations from that one file", s: "done" },
      { f: "The brain moves house", m: "The core engine moves into the backend room and every signpost is updated.", have: "Engine in its proper room", c: "Tests green, no broken links", s: "done" },
      { f: "The content moves house", m: "All the product's words (questions, prompts, scenarios) move into the content room.", have: "Questions and prompts in the content room", c: "A run still loads its questions and tests stay green", s: "done" },
      { f: "Two apps get their own rooms", m: "The customer server and your internal screens are separated so product and tool stop being tangled.", have: "Server and screens separated", c: "App starts and one full run works", s: "done" },
      { f: "The paperwork gets filed", m: "All plans, notes and references move into the docs room.", have: "Everything filed under docs", c: "Docs are under docs/ and nothing points at old spots", s: "done" },
      { f: "Throw out the junk", m: "Delete leftover clutter and update the build settings to match the new layout.", have: "A clean project", c: "Tests green, build runs, code checker passes", s: "done" },
    ],
    signoff: "Tests green (same count as before) · app starts and a full run works · the command-line replay runs clean · the product behaves identically to before." },

  { num: "002", name: "House rules", tag: "Conventions & Skills",
    goal: "Teach the AI our standards once, written as skills it reads automatically. From here on all new code is in a safer language and tested before it's trusted.",
    steps: [
      { f: "Shop around for proven rules", m: "Look at the best community rulebooks and decide what to borrow versus write ourselves. No reinventing wheels.", have: "A borrow-vs-build decision", c: "The decision is written in the progress log" },
      { f: "Install the quality skills", m: "Install the test-first skill and security skills. The safety gear goes on the shelf.", have: "Skills installed and ready", c: "All installed skills load without error" },
      { f: "Write our own rulebooks", m: "Two plain rulebooks (backend and frontend): naming, structure, how the parts connect.", have: "Two house-rule skills", c: "Both load and cover naming, structure and layout" },
      { f: "Set up the safety tooling", m: "Stricter tooling and a test runner so mistakes get caught before the app runs.", have: "Early-warning tooling", c: "Strict settings build, the runner runs, test folders mirror the code" },
      { f: "Point the AI at the rules", m: "Wire the project guide so the AI opens the right rulebook automatically.", have: "AI self-serving the right rules", c: "Every guide link opens the correct skill" },
    ],
    signoff: "Every skill loads without error · a small test-first change lands in correctly-named files · all guide links resolve." },

  { num: "003", name: "Make the code safer", tag: "TypeScript Conversion",
    goal: "Upgrade the code to a stricter language that flags mistakes before the app runs — like spell-check for code. Nothing behaves differently.",
    steps: [
      { f: "Turn on strict mode", m: "The backend switches to the most thorough safety checks from the start.", have: "Backend under strict checks", c: "The strict settings build cleanly" },
      { f: "Agree the shapes of our data", m: "Define the exact shape of core things (session, question, briefing) so every part agrees.", have: "Agreed core definitions", c: "Definitions compile and the code uses them" },
      { f: "Convert piece by piece", m: "Convert from the outside in, keeping every test green at each step.", have: "The whole engine converted", c: "Tests green after each piece is converted" },
      { f: "Tighten the loose ends", m: "Tidy up any vague spots the conversion reveals.", have: "No soft edges left", c: "No loose or untyped spots remain" },
    ],
    signoff: "Safety build passes with no loose spots · tests green · the app and command-line behave identically to before." },

  { num: "004", name: "A proper engine room", tag: "Backend API v1",
    goal: "Reshape the backend into clean layers behind a versioned doorway (an API) so it can grow without becoming spaghetti. The product does the same thing today.",
    steps: [
      { f: "Draw the menu of services", m: "List every service and write the official menu (contract): what you can ask for and what you get back.", have: "A written service menu", c: "The contract lists every request and its response" },
      { f: "Build the shared plumbing", m: "The shared path every request flows through: error handling, who-you-are context, a slot for the login check later.", have: "Consistent request handling", c: "Errors come back in one consistent shape" },
      { f: "Build each service in clean layers", m: "Each area is three small single-job parts (front desk, logic, data), written test-first.", have: "Small single-job parts", c: "Each service is tested before its code and the routes work" },
      { f: "Lay out the test rooms", m: "Arrange the tests to mirror the code so any test is instantly findable.", have: "A mirrored test layout", c: "Small tests beside the code, bigger ones in a matching tree" },
    ],
    signoff: "Every route follows the standard · each service was tested first · storage could be swapped without touching the logic." },

  { num: "005", name: "A real database", tag: "Postgres Foundation",
    goal: "Move live data (organisations, users, sessions) off loose files into a proper database, so many people can use it safely and nothing is lost on restart.",
    steps: [
      { f: "Pick the database toolkit", m: "Choose the proven tool for managing the database and record the choice.", have: "Toolkit on record", c: "The choice is written in the progress log" },
      { f: "Build the first tables", m: "Create the core tables (orgs, users, sessions, run-history pointer, invitations) as a proper versioned change.", have: "The core tables", c: "The database builds itself from empty with one command" },
      { f: "Plug the backend into the database", m: "Connect the backend and swap session/user storage over, behind the same doorway so the logic doesn't change.", have: "Backend on the database", c: "Services unchanged and now read/write the database" },
      { f: "One-command local setup", m: "Any teammate can spin up the database locally with one documented command.", have: "One-step DB start", c: "A teammate starts the database from the written command" },
    ],
    signoff: "Database builds from clean in one command · a session survives a server restart · tests green and a teammate can start the DB." },

  { num: "006", name: "The front door", tag: "Auth",
    goal: "A real front door — register and log in with strong passwords. Because it's HR, signing up also creates the company, so data belongs to the organisation, not a lone person.",
    steps: [
      { f: "Finalise the accounts tables", m: "Finalise the tables for companies, people, sign-in methods and invitations.", have: "Account tables ready", c: "The tables exist with every field they need" },
      { f: "Register and login with safe passwords", m: "Passwords are stored as a strong scramble — the real password is never kept, even we can't see it.", have: "Working register and login", c: "Passwords stored scrambled, the raw password never kept" },
      { f: "Keep people in, guard the doors", m: "A secure pass on login and a guard that turns logged-out visitors away from protected pages.", have: "Guarded pages", c: "A protected page is refused when you're logged out" },
      { f: "Signup creates the company", m: "Signing up creates the org, makes the first person the owner, and fences all data to their company.", have: "Company auto-created on signup", c: "Registering creates a person and their company, with that person as owner" },
    ],
    signoff: "Signup creates a person and a company · login works and logged-out access is refused · two companies cannot see each other's data." },

  { num: "007", name: "The customer app", tag: "Frontend App",
    goal: "The visible payoff — a real customer-facing app with register/login wired to the secure backend. Your current screens stay as the internal admin tool.",
    steps: [
      { f: "Stand up the new app", m: "Create the new customer app and its build setup — the shell the experience lives in.", have: "New app running", c: "The app builds and runs" },
      { f: "Build register and login screens", m: "The actual screens a new customer sees.", have: "Register and login screens", c: "Both screens appear correctly" },
      { f: "Wire the screens to the backend", m: "Connect the screens to the secure backend so signup and login really work and the app remembers you.", have: "Screens that really work", c: "Register a new company in the browser, log in, reach the signed-in screen" },
      { f: "A simple home screen", m: "A minimal home showing the company name and a button to start a prep run — proves the loop.", have: "A home screen", c: "Shows your company name and a start button" },
    ],
    signoff: "Register and log in in the browser and see the home screen · a refresh keeps you logged in · logout returns you to login." },

  { num: "008", name: "Keep it safe", tag: "Security",
    goal: "A dedicated safety pass before real staff data flows: protect personal data and make sure AI keys can never leak. Automated checks are the floor — a human expert signs off before real data flows.",
    steps: [
      { f: "Run the security checks", m: "Install the security skills, run their checks, and fix anything flagged until all green.", have: "A clean bill of health", c: "The security checks are all green" },
      { f: "Protect personal data", m: "Map where personal/HR data lives and lock it down — fenced by company and role, encrypted in transit, kept out of logs.", have: "Fenced personal data", c: "Reaching another company or role's data is blocked" },
      { f: "Lock away the AI keys", m: "Prove the AI keys live only on the server — never in a browser, a response, or a log. Critical.", have: "Server-only keys", c: "No key appears in the app, a response, or a log anywhere" },
      { f: "Human expert sign-off", m: "A security-literate human reviews everything and signs off on the record.", have: "A named expert's sign-off", c: "A named human expert has reviewed and signed off in the log" },
    ],
    signoff: "Checks green · no key leaks anywhere · personal-data access fenced by company and role · a named expert has signed off." },
];

const KEY = "sero-p2p-checklist-v1";
const TICK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const CHEV = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

// Ready-to-paste CONTINUE prompt per phase — drop into a fresh thread to pick
// the phase up from where it actually stands. Shared house-rules preamble + a
// live status snapshot (built from each step's committed status) + the
// phase-specific brief, so the prompt stays accurate all the way through.
const PREAMBLE = (pi) =>
  `Phase ${DATA[pi].num} — ${DATA[pi].name} · ${DATA[pi].tag} (Prototype → Production checklist).\n\n` +
  `Continue this with the Darren Method: there's already a plan folder docs/todo/<slug>/ — read its PLAN.md "Current state" first and pick up from there. Do ONE step at a time and stop for my green light before anything risky or before the next phase. You don't self-certify; I walk the QA scenarios and approve. The moment I approve a step, commit locally (no push/PR unless I ask).\n\n` +
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
  // 007 The customer app
  `Goal: stand up a real customer-facing app (register/login wired to the secure backend); the current screens stay as the internal admin tool.\nFirst move (before any code): scaffold plan — the new app shell, its build setup, and how it talks to the backend (auth/session handling), plus what stays in the admin tool — for my review before scaffolding.\nOut of scope: no new product features inside the app beyond the home screen + start button; don't touch backend auth logic from Phase 6; don't fold the admin tool into the new app.\nWatch out for: session/login state that doesn't survive refresh, and accidentally exposing admin-only screens to customers. Keep the two apps clearly separate.\nDone when:\n• Agent-verified: new app builds; npm test green; admin tool still runs.\n• Owner-walked: register + log in in the browser → home screen showing company name + a start button; refresh keeps me logged in; logout returns to login.`,
  // 008 Keep it safe
  `Goal: a dedicated safety pass before real staff data flows — security-skill checks to green, personal data fenced by company + role, and AI keys proven server-only (never in a browser, response, or log).\nFirst move (before any code): install/run the security checks and post exactly what they flag — a triage list (issue → severity → fix plan) for my review before fixing.\nOut of scope: no new features, no broad refactors — fix only what the checks and the data-fencing/key-leak review surface. Park anything bigger.\nWatch out for: AI keys ending up in the client bundle, an API response, or a log line — check the built frontend bundle specifically, not just the source. Confirm role-level fencing, not just company-level.\nDone when:\n• Agent-verified: security-skill checks green; grep of built bundle/responses/logs shows no key leak; tests prove personal-data access is fenced by company + role.\n• Owner-walked: a named human expert has reviewed and signed off (record the name in PLAN.md).`,
];

// Ready-to-paste VERIFY prompt for a phase whose every step is already built.
// At that point there's nothing left to build — the job is to confirm it was
// done right and hand the owner their by-hand checks — so the prompt flips from
// "continue building" to "verify and sign off".
const VERIFY = (pi) => {
  const ph = DATA[pi];
  return `Phase ${ph.num} — ${ph.name} · ${ph.tag} (Prototype → Production checklist).\n\n` +
    `This phase is built — every step is marked done. Your job now is to VERIFY it was done right, not to build more. Don't change code unless verification turns up a real problem; if it does, stop and tell me before fixing.\n\n` +
    `Run the free checks first and report each result plainly: npm test (expect the same pass count as the pre-work baseline) and node scripts/replay-scenario.js <id> --fixtures-only. No paid runs (anything hitting the OpenAI API — gate/smoke/eval/live replays, ~$0.35/case up to ~$3) without my explicit yes for that run, cost stated first.\n\n` +
    `Then read the plan folder docs/todo/<slug>/ PLAN.md to confirm what was claimed matches what shipped, and walk me through the owner checks I do by hand. Wait for my go on the sign-off gate before touching the next phase — you don't self-certify.\n\n` +
    `What "done right" means for this phase:\n${KICK[pi]}\n\n` +
    `Owner sign-off gate: ${ph.signoff}\n\n` +
    `First, tell me plainly whether the free checks passed and exactly what I need to check by hand — then wait. End with a short "In simple terms:" line.`;
};

// True when every step of a phase is built (agent status done) — i.e. the phase
// is ready to verify rather than continue.
const isBuilt = (ph) => ph.steps.every((st) => (st.s || "todo") === "done");

// A live snapshot of the phase's progress + which step to resume at, built from
// each step's committed status (st.s). Updated whenever a step's status flips.
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

let state = {};
function loadState() {
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { state = {}; }
}
function saveState() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
const cid = (p, s) => `p${p}s${s}`;

// Status pill shown next to a step title. Two inputs decide what it shows:
//   • st.s — the build status I (the agent) maintain in DATA + commit as work
//     lands ("done" | "doing" | "todo"). This is the "has Claude done it?" signal.
//   • your tick (localStorage) — your own sign-off; a tick always shows Done.
// Effective status: a tick wins (Done); otherwise the committed build status.
const BADGE_LABEL = { done: "Done", doing: "In progress", todo: "To do" };
const effStatus = (id, codeStatus) => (state[id] ? "done" : codeStatus || "todo");
const stepBadge = (id, codeStatus) => {
  const eff = effStatus(id, codeStatus);
  return `<span class="cl-badge cl-badge--${eff}" data-badge="${id}" data-status="${codeStatus || "todo"}">${BADGE_LABEL[eff]}</span>`;
};

function rowHtml(id, on, label, means, meta, gate, codeStatus) {
  const done = on ? "done" : "";
  return `<div class="cl-row ${gate ? "cl-row--gate" : ""} ${done}" id="row-${id}">
    <label class="cl-cb">
      <input type="checkbox" data-id="${id}" ${on ? "checked" : ""}>
      <span class="cl-tick">${TICK}</span>
    </label>
    <div class="cl-row__body">
      <div class="cl-feat">${label}${gate ? "" : stepBadge(id, codeStatus)}</div>
      <div class="cl-means">${means}</div>
      ${meta || ""}
    </div>
  </div>`;
}

function phaseHtml(ph, pi) {
  const steps = ph.steps.map((st, si) => {
    const id = cid(pi, si);
    const meta = `<div class="cl-meta">
        <div><span class="cl-k">You'll have:</span><span class="cl-have">${esc(st.have)}</span></div>
        <div><span class="cl-k">Check:</span><span class="cl-check">${esc(st.c)}</span></div>
      </div>`;
    const label = `<span class="cl-step-no">${si + 1}</span>${esc(st.f)}`;
    return rowHtml(id, !!state[id], label, esc(st.m), meta, false, st.s);
  }).join("");

  const gid = cid(pi, "gate");
  const gateLabel = `Sign-off — your approval gate<span class="cl-tag">your call</span>`;
  const gate = rowHtml(gid, !!state[gid], gateLabel, esc(ph.signoff), "", true);

  const built = isBuilt(ph);
  const kickLede = built
    ? "This phase is built. Copy the prompt to check it was done right — it runs the free checks and walks you through your sign-off."
    : "Continuing this phase? Copy the prompt — it captures where we are and picks up from the next unfinished step.";
  const kickBtn = built ? "Copy verify prompt" : "Copy continue prompt";
  const kick = `<div class="cl-kick">
    <div class="cl-kick__lede">${kickLede}</div>
    <div class="cl-kick__actions">
      <button type="button" class="btn btn--sm js-kick" data-kick="${pi}">${kickBtn}</button>
      <span class="cl-kick__saved" id="kick-saved-${pi}">Copied ✓</span>
    </div>
    <details class="cl-kick__preview"><summary>Preview the prompt</summary><pre>${esc(CONTINUES[pi])}</pre></details>
  </div>`;

  return `<section class="cl-phase is-collapsed" id="phase-${pi}">
    <div class="cl-phase-head" data-toggle="${pi}">
      <span class="cl-num">${esc(ph.num)}</span>
      <div class="cl-phase-title">
        <h3>${esc(ph.name)} <span class="cl-phase-tag">· ${esc(ph.tag)}</span><span class="cl-badge cl-badge--todo" id="pbadge-${pi}">To do</span></h3>
        <div class="cl-goal">${esc(ph.goal)}</div>
        <div class="cl-phase-meter">
          <div class="cl-bar"><span id="pbar-${pi}"></span></div>
          <div class="cl-count" id="pcount-${pi}"></div>
        </div>
      </div>
      <span class="cl-chev">${CHEV}</span>
    </div>
    <div class="cl-steps">${kick}${steps}${gate}</div>
  </section>`;
}

function updateMeters(root) {
  let total = 0, done = 0;
  DATA.forEach((ph, pi) => {
    const ids = ph.steps.map((_, si) => cid(pi, si)).concat([cid(pi, "gate")]);
    const d = ids.filter((x) => state[x]).length;
    const t = ids.length;
    total += t; done += d;
    const pct = Math.round((d / t) * 100);
    const bar = root.querySelector("#pbar-" + pi);
    if (bar) bar.style.width = pct + "%";
    const cnt = root.querySelector("#pcount-" + pi);
    if (cnt) cnt.textContent = `${d}/${t} done`;
    root.querySelector("#phase-" + pi)?.classList.toggle("is-done", d === t);
    const pb = root.querySelector("#pbadge-" + pi);
    if (pb) {
      const effs = ph.steps.map((st, si) => effStatus(cid(pi, si), st.s));
      const [cls, txt] = effs.every((e) => e === "done")
        ? ["done", "Done"]
        : effs.some((e) => e !== "todo")
          ? ["doing", "In progress"]
          : ["todo", "To do"];
      pb.className = "cl-badge cl-badge--" + cls;
      pb.textContent = txt;
    }
  });
  const opct = total ? Math.round((done / total) * 100) : 0;
  const obar = root.querySelector("#cl-overall-bar");
  if (obar) obar.style.width = opct + "%";
  const opctEl = root.querySelector("#cl-overall-pct");
  if (opctEl) opctEl.textContent = opct + "%";
}

export function mount(root) {
  loadState();

  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8 checklist">
      <header class="page-header">
        <div class="page-header__row">
          <h1 class="h1">Prototype → Production</h1>
          <button class="btn btn--ghost js-back" type="button">Back</button>
        </div>
        <div class="page-header__lede">Eight phases, one checkable step at a time. Tick each step as you confirm it works — progress is saved in this browser. Each phase ends with an amber sign-off gate: only tick that once you're happy to move on.</div>
        <div class="cl-overall">
          <div class="cl-bar cl-bar--lg"><span id="cl-overall-bar"></span></div>
          <div class="cl-overall__pct" id="cl-overall-pct">0%</div>
          <button class="btn btn--ghost btn--sm js-reset" type="button">Reset</button>
        </div>
      </header>
      <div class="cl-phases">${DATA.map(phaseHtml).join("")}</div>
    </div>
  `;

  // Wire checkboxes
  root.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) state[id] = true; else delete state[id];
      saveState();
      root.querySelector("#row-" + id)?.classList.toggle("done", e.target.checked);
      const sb = root.querySelector('[data-badge="' + id + '"]');
      if (sb) {
        const eff = e.target.checked ? "done" : sb.dataset.status || "todo";
        sb.className = "cl-badge cl-badge--" + eff;
        sb.textContent = BADGE_LABEL[eff];
      }
      updateMeters(root);
    });
  });

  // Copy kickoff prompt for a phase to the clipboard, with a brief "Copied ✓" flash
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
      const saved = root.querySelector("#kick-saved-" + i);
      if (saved) {
        saved.classList.add("is-show");
        setTimeout(() => saved.classList.remove("is-show"), 1400);
      }
    });
  });

  // Wire collapse — ignore clicks on the checkbox itself
  root.querySelectorAll("[data-toggle]").forEach((h) => {
    h.addEventListener("click", (e) => {
      if (e.target.closest("label.cl-cb")) return;
      root.querySelector("#phase-" + h.dataset.toggle)?.classList.toggle("is-collapsed");
    });
  });

  // Reset
  root.querySelector(".js-reset").addEventListener("click", () => {
    if (confirm("Clear all your ticks? This can't be undone.")) {
      state = {};
      saveState();
      root.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
      root.querySelectorAll(".cl-row.done").forEach((r) => r.classList.remove("done"));
      root.querySelectorAll(".cl-badge[data-badge]").forEach((b) => {
        const eff = b.dataset.status || "todo";
        b.className = "cl-badge cl-badge--" + eff;
        b.textContent = BADGE_LABEL[eff];
      });
      updateMeters(root);
    }
  });

  updateMeters(root);

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
