// Build plan — the prototype → production roadmap as a tickable to-do page.
// Internal tool, styled like guide.js: build innerHTML, Back + Esc -> Home,
// clean up on unmount. Each step is a checkbox; ticks persist in localStorage
// (key SERO_TODO_KEY) so progress survives reloads and restarts. No API calls.

import { STAGES, setState } from "../state.js";

const SERO_TODO_KEY = "seroBuildPlanChecklist-v1";

let keyHandler = null;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// The eight phases, in plain language: goal, the small steps (feature / what it
// means / what you'll have / how to check), and the founder sign-off gate.
const PHASES = [
  { num: "001", name: "Tidy the project", tag: "Monorepo Reorg",
    goal: "Pure spring-cleaning: every file moves into a clearly labelled room. Nothing your users see changes.",
    steps: [
      { f: "Labelled rooms", m: "Five named rooms: backend (brain), admin (your screens), frontend (future app), content (words/questions), docs (plans). Junk drawer to labelled drawers.", have: "Five named folders", c: "Folders exist and the tests still pass" },
      { f: "One address book for data", m: "Every file location written once in a single file. Change an address once and everything follows.", have: "One file listing where data lives", c: "App and command-line tool both read locations from that one file" },
      { f: "The brain moves house", m: "The core engine moves into the backend room and every signpost is updated.", have: "Engine in its proper room", c: "Tests green, no broken links" },
      { f: "The content moves house", m: "All the product's words (questions, prompts, scenarios) move into the content room.", have: "Questions and prompts in the content room", c: "A run still loads its questions and tests stay green" },
      { f: "Two apps get their own rooms", m: "The customer server and your internal screens are separated so product and tool stop being tangled.", have: "Server and screens separated", c: "App starts and one full run works" },
      { f: "The paperwork gets filed", m: "All plans, notes and references move into the docs room.", have: "Everything filed under docs", c: "Docs are under docs/ and nothing points at old spots" },
      { f: "Throw out the junk", m: "Delete leftover clutter and update the build settings to match the new layout.", have: "A clean project", c: "Tests green, build runs, code checker passes" },
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

const TICK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const CHEVRON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

function loadState() {
  try { return JSON.parse(localStorage.getItem(SERO_TODO_KEY) || "{}"); } catch { return {}; }
}
function saveState(state) {
  try { localStorage.setItem(SERO_TODO_KEY, JSON.stringify(state)); } catch { /* private mode — skip */ }
}

const idFor = (pi, si) => `p${pi}s${si}`;
const gateIdFor = (pi) => `p${pi}gate`;
const idsForPhase = (ph, pi) => ph.steps.map((_, si) => idFor(pi, si)).concat([gateIdFor(pi)]);

function rowHtml(cid, on, label, body, meta) {
  return `<div class="todo-row${on ? " is-done" : ""}${meta ? "" : " todo-row--gate"}" data-row="${cid}">
      <label class="todo-cb">
        <input type="checkbox" data-id="${cid}" ${on ? "checked" : ""} />
        <span class="todo-tick">${TICK_SVG}</span>
      </label>
      <div class="todo-row__body">
        <div class="todo-row__feat">${label}</div>
        <p class="todo-row__means">${esc(body)}</p>
        ${meta || ""}
      </div>
    </div>`;
}

function phaseHtml(ph, pi, state) {
  const ids = idsForPhase(ph, pi);
  const done = ids.filter((x) => state[x]).length;
  const total = ids.length;
  const pct = Math.round((done / total) * 100);

  const steps = ph.steps.map((st, si) => {
    const cid = idFor(pi, si);
    const meta = `<div class="todo-row__meta">
        <div><span class="todo-k">You'll have</span><span class="todo-v">${esc(st.have)}</span></div>
        <div><span class="todo-k">Check</span><span class="todo-v todo-v--check">${esc(st.c)}</span></div>
      </div>`;
    return rowHtml(cid, !!state[cid], `<span class="todo-step-no">${si + 1}</span>${esc(st.f)}`, st.m, meta);
  }).join("");

  const gate = rowHtml(gateIdFor(pi), !!state[gateIdFor(pi)],
    `Sign-off — your approval gate <span class="todo-gate-tag">your call</span>`, ph.signoff, "");

  return `<section class="todo-phase${done === total ? " is-complete" : ""}" data-phase="${pi}">
      <button type="button" class="todo-phase__head js-phase-toggle" aria-expanded="false">
        <span class="todo-phase__num">${esc(ph.num)}</span>
        <span class="todo-phase__title">
          <span class="todo-phase__name">${esc(ph.name)} <span class="todo-phase__tag">· ${esc(ph.tag)}</span></span>
          <span class="todo-phase__goal">${esc(ph.goal)}</span>
          <span class="todo-phase__meter">
            <span class="todo-bar"><i style="width:${pct}%"></i></span>
            <span class="todo-phase__count">${done}/${total} done</span>
          </span>
        </span>
        <span class="todo-phase__chev">${CHEVRON}</span>
      </button>
      <div class="todo-phase__steps">${steps}<div class="todo-gate-wrap">${gate}</div></div>
    </section>`;
}

export function mount(root) {
  let state = loadState();

  function totals() {
    let total = 0, done = 0;
    PHASES.forEach((ph, pi) => {
      const ids = idsForPhase(ph, pi);
      total += ids.length;
      done += ids.filter((x) => state[x]).length;
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function draw() {
    const t = totals();
    root.innerHTML = `
      <div class="stage-medium l-stack l-stack--6 todo">
        <header class="page-header">
          <div class="page-header__row">
            <h1 class="h1">Build plan</h1>
            <button class="btn btn--ghost js-back" type="button">Back</button>
          </div>
          <div class="page-header__lede">Prototype → Production, one checkable step at a time. Tick each step as you confirm it works — your ticks are saved in this browser and stay after you close it. Each phase ends with a sign-off gate: only tick that when you're ready to move on.</div>
          <div class="todo-overall">
            <span class="todo-bar todo-bar--lg"><i style="width:${t.pct}%"></i></span>
            <span class="todo-overall__pct">${t.pct}%</span>
            <button class="btn btn--ghost btn--sm js-reset" type="button">Reset</button>
          </div>
        </header>
        <div class="todo-phases">
          ${PHASES.map((ph, pi) => phaseHtml(ph, pi, state)).join("")}
        </div>
      </div>`;
    wire();
  }

  function wire() {
    root.querySelector(".js-back").addEventListener("click", back);
    root.querySelector(".js-reset").addEventListener("click", () => {
      if (window.confirm("Clear all your ticks? This can't be undone.")) {
        state = {}; saveState(state); draw();
      }
    });
    root.querySelectorAll(".js-phase-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (e.target.closest(".todo-cb")) return;
        const phase = btn.closest(".todo-phase");
        const open = phase.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
    root.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) state[id] = true; else delete state[id];
        saveState(state);
        e.target.closest(".todo-row").classList.toggle("is-done", e.target.checked);
        refreshMeters();
      });
    });
  }

  // Update progress bars + counts in place, without re-rendering (keeps panels open).
  function refreshMeters() {
    PHASES.forEach((ph, pi) => {
      const ids = idsForPhase(ph, pi);
      const done = ids.filter((x) => state[x]).length;
      const total = ids.length;
      const phase = root.querySelector(`.todo-phase[data-phase="${pi}"]`);
      phase.querySelector(".todo-bar > i").style.width = Math.round((done / total) * 100) + "%";
      phase.querySelector(".todo-phase__count").textContent = `${done}/${total} done`;
      phase.classList.toggle("is-complete", done === total);
    });
    const t = totals();
    root.querySelector(".todo-overall .todo-bar > i").style.width = t.pct + "%";
    root.querySelector(".todo-overall__pct").textContent = t.pct + "%";
  }

  draw();

  keyHandler = (e) => {
    if (e.key === "Escape" && !/^(input|textarea|select)$/i.test(e.target.tagName)) back();
  };
  window.addEventListener("keydown", keyHandler);
}

function back() {
  setState({ stage: STAGES.START });
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}
