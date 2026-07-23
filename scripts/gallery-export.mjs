// Screen-gallery static export (screen-gallery Phase 2 v2).
//
// Regenerates docs/screen-gallery/ — one self-contained HTML snapshot per screen plus an
// index tree — that Carl opens directly from disk (file://, no server, no login). Each page
// is the REAL screen as rendered, with sample data, CSS inlined and scripts stripped (a static
// picture, not an app), under a soft-yellow strip carrying the screen name, its source file, a
// "Copy design prompt" button and the generation date.
//
// HOW IT WORKS (no app code involved — the app stays 100% clean of gallery logic):
//   1. The Vite dev server must be running (`npm run dev` → admin app on :3000/admin/). The
//      backend is NOT needed: every /api/** GET is answered from scripts/gallery/fixtures/*.json
//      via Playwright route interception, so /auth/me (a superadmin) and every list are ours to
//      control. Non-GETs are stubbed; a no-op EventSource is injected for streaming screens.
//   2. Flow screens (Briefing, Interview, …) are driven by injecting localStorage.seroSessionId
//      and serving GET /sessions/:id from the snapshot fixture, so the app's own boot
//      (rehydrateById) fills the store. One snapshot drives every flow screen — its `stage` is
//      overridden per route.
//   3. Per screen: navigate the real route → wait settled → freeze animations & force reveals
//      visible → capture documentElement.outerHTML → inline fonts, strip scripts → wrap with the
//      strip → write the file. index.html is built from the metadata below.
//
// Run it:  (dev server up)  node scripts/gallery-export.mjs
// Refresh ritual: re-run after any design work lands; the date stamp on every page shows staleness.
//
// $0 — no OpenAI anywhere. Exits non-zero if any expected fixture missed (a stale fixture is loud).

import { chromium } from "playwright";
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const FIXTURES = resolve(__dirname, "gallery/fixtures");
const OUT = resolve(REPO, "docs/screen-gallery");

const ADMIN = "http://localhost:3000/admin";
const CUSTOMER = "http://localhost:3002";
const DEMO_SESSION = "demo-amira-perf-1to1"; // must match fixtures/session.json .sessionId

const STAMP = new Date().toISOString().slice(0, 10); // generation date, shown on every page

// ---- the screen registry (metadata mirrored from admin/src/stages/gallery/screens.js +
// the real routes from admin/src/router.js — copied here so the app no longer holds it). ----

const GROUPS = [
  { id: "auth",       label: "Auth & entry" },
  { id: "manager",    label: "Manager home & team" },
  { id: "flow",       label: "1:1 prep flow" },
  { id: "member",     label: "Member view" },
  { id: "content",    label: "Content pages" },
  { id: "superadmin", label: "Superadmin" },
  { id: "internal",   label: "Internal tools" },
];

// key, label, group, url (real route), file (source path), and optional:
//   session   → inject seroSessionId + drive from the snapshot; `stage` = override served snapshot stage
//   me        → per-screen partial merged over fixtures/me.json (e.g. drop superadmin for the manager Home)
//   needsData → tagged in the tree
//   app       → "customer" screens live on the :3002 server (skipped if it isn't running)
const SCREENS = [
  // Auth & entry
  { key: "LOGIN",            label: "Login",              group: "auth",    url: "/login",            file: "admin/src/stages/login.js" },
  { key: "REGISTER",         label: "Register",           group: "auth",    url: "/register",         file: "admin/src/stages/register.js" },
  { key: "FORGOT_PASSWORD",  label: "Forgot password",    group: "auth",    url: "/forgot-password",  file: "admin/src/stages/forgot-password.js" },
  { key: "RESET_PASSWORD",   label: "Reset password",     group: "auth",    url: "/reset-password/demo-token", file: "admin/src/stages/reset-password.js" },
  { key: "WELCOME",          label: "Welcome",            group: "auth",    url: "/",                 file: "frontend/src/stages/welcome.ts", app: "customer", loggedOut: true, pending: "customer-app capture — renders live, batch snapshot WIP" },
  { key: "JOIN",             label: "Join",               group: "auth",    url: "/join/demo-token",  file: "frontend/src/stages/join.js", app: "customer", loggedOut: true, pending: "customer-app capture — renders live, batch snapshot WIP" },

  // Manager home & team
  { key: "START",            label: "Start (manager home)", group: "manager", url: "/",               file: "admin/src/stages/start.js", me: { isSuperadmin: false } },
  { key: "TEAM",             label: "Team",               group: "manager", url: "/team",             file: "frontend/src/stages/team.ts" },
  { key: "PERSON_DETAIL",    label: "Person detail",      group: "manager", url: "/team/amira-khan",  file: "frontend/src/stages/person-detail.ts", needsData: true },
  { key: "MEMBERS",          label: "Members",            group: "manager", url: "/members",          file: "frontend/src/stages/members.ts", app: "customer", me: { isSuperadmin: false, roles: ["manager"] }, pending: "customer-app capture — renders live, batch snapshot WIP" },
  { key: "RUNS",             label: "Runs",               group: "manager", url: "/runs",             file: "admin/src/stages/runs.ts" },
  { key: "RUN_DETAIL",       label: "Run detail",         group: "manager", url: "/runs/demo-run-1",  file: "admin/src/stages/run-detail.ts", needsData: true },

  // 1:1 prep flow (walking order) — all driven by the one snapshot, stage overridden per screen
  { key: "INTAKE",           label: "Intake",             group: "flow",    url: "/new",              file: "admin/src/stages/intake.js" },
  { key: "ONEPAGE",          label: "One-page",           group: "flow",    url: "/flow",             file: "admin/src/stages/onepage.js",      session: { stage: "ONEPAGE" } },
  { key: "FOCUS_POINTS",     label: "Focus points",       group: "flow",    url: "/focus",            file: "admin/src/stages/focus-points.js", session: { stage: "FOCUS_POINTS" } },
  { key: "PREPARATION",      label: "Preparation",        group: "flow",    url: "/prepare",          file: "frontend/src/stages/preparation.ts", session: { stage: "PREPARATION" } },
  { key: "BANK",             label: "Question bank",      group: "flow",    url: "/bank",             file: "admin/src/stages/bank.js",         session: { stage: "BANK" } },
  { key: "QUESTIONING",      label: "Interview",          group: "flow",    url: "/interview",        file: "admin/src/stages/questioning.js",   session: { stage: "QUESTIONING" } },
  { key: "EVAL",             label: "Evaluate",           group: "flow",    url: "/evaluate",         file: "admin/src/stages/eval.js",          session: { stage: "EVAL" } },
  { key: "BRIEFING",         label: "Briefing",           group: "flow",    url: "/briefing",         file: "admin/src/stages/briefing.js",      session: { stage: "BRIEFING" } },
  { key: "RUN_DEBRIEF",      label: "Debrief",            group: "flow",    url: "/debrief",          file: "admin/src/stages/run-debrief.js",   session: { stage: "RUN_DEBRIEF" } },
  { key: "GUIDED",           label: "Guided session",     group: "flow",    url: "/guided/demo-guided-1", file: "frontend/src/stages/guided/guided.page.ts", needsData: true },

  // Member view
  { key: "MEMBER_HOME",      label: "Member home",        group: "member",  url: "/home",             file: "frontend/src/stages/member-home.js" },

  // Content pages
  { key: "ABOUT",            label: "About",              group: "content", url: "/about",            file: "admin/src/stages/about.js" },
  { key: "PRIVACY",          label: "Privacy",            group: "content", url: "/privacy",          file: "admin/src/stages/privacy.js" },
  { key: "FEEDBACK",         label: "Feedback",           group: "content", url: "/feedback",         file: "admin/src/stages/feedback.js" },
  { key: "GUIDE",            label: "Guide",              group: "content", url: "/guide",            file: "admin/src/stages/guide.js" },

  // Superadmin
  { key: "ADMIN_PULSE",      label: "Pulse",              group: "superadmin", url: "/pulse",             file: "admin/src/stages/admin-pulse.ts" },
  { key: "ADMIN_GATE1",      label: "Gate 1",             group: "superadmin", url: "/admin/gate1",       file: "admin/src/stages/admin-gate1.ts" },
  { key: "ADMIN_RUNS",       label: "All runs",           group: "superadmin", url: "/admin/runs",        file: "admin/src/stages/admin-runs.ts" },
  { key: "ADMIN_RATINGS",    label: "Ratings",            group: "superadmin", url: "/admin/ratings",     file: "admin/src/stages/admin-ratings.ts" },
  { key: "ADMIN_REGISTERED", label: "Registered users",   group: "superadmin", url: "/admin/registered",  file: "admin/src/stages/admin-registered.ts" },
  { key: "ADMIN_USER",       label: "User detail",        group: "superadmin", url: "/admin/users/u-amira", file: "admin/src/stages/admin-user-detail.ts", needsData: true },
  { key: "ADMIN_ERROR_LOG",  label: "Error log",          group: "superadmin", url: "/admin/errors",      file: "admin/src/stages/admin-error-log.ts" },
  { key: "ADMIN_FEEDBACK",   label: "Feedback inbox",     group: "superadmin", url: "/admin/feedback",    file: "admin/src/stages/admin-feedback.ts" },
  { key: "ADMIN_GUEST_RUNS", label: "Guest runs",         group: "superadmin", url: "/admin/guests",      file: "admin/src/stages/admin-guest-runs.ts" },

  // Internal tools
  { key: "LIBRARY",          label: "Library",            group: "internal", url: "/library",          file: "admin/src/stages/library.js" },
  { key: "COMPARE",          label: "Compare",            group: "internal", url: "/compare",          file: "admin/src/stages/compare.js" },
  { key: "PERSONAS",         label: "Personas",           group: "internal", url: "/personas",         file: "admin/src/stages/personas.js" },
  { key: "LEXICON_REVIEW",   label: "Lexicon review",     group: "internal", url: "/lexicon",          file: "admin/src/stages/lexicon-review.js", needsData: true },
  { key: "ROLE_LEXICONS",    label: "Job lexicons",       group: "internal", url: "/job-lexicons",     file: "admin/src/stages/job-lexicons.js" },
  { key: "MEETING_ARCS",     label: "Meeting arcs",       group: "internal", url: "/meeting-arcs",     file: "admin/src/stages/meeting-arcs.js" },
  { key: "REVIEW_RUN",       label: "Review a run",       group: "internal", url: "/run/demo-run-1",   file: "admin/src/stages/review-run.js", needsData: true },
  { key: "DESIGN",           label: "Design system sheet", group: "internal", url: "/design",          file: "admin/src/stages/design.js" },
  { key: "TEST",             label: "Test prototypes",    group: "internal", url: "/test",             file: "admin/src/stages/test.js" },
];

// ---- the "Copy design prompt" text (mirrored from screens.js designPrompt) ----
function designPrompt({ label, file, url }) {
  return `I want to improve the design of the "${label}" screen in Sero.

- See it live: ${url}
- Its code: ${file}

Please:
1. Open the screen at the URL above and look at it (take a screenshot first).
2. Interview me ONE question at a time about what I want improved — don't dump a list.
3. Suggest your own improvement ideas too, grounded in what you can see on the screen.
4. Follow DESIGN.md (the Sero design system): design tokens only (no hex), 14px text floor, one blue action per screen, Lucide icons.
5. Screenshot before and after so I can see the change.
6. Only touch this screen's own files — don't change other screens.`;
}

// ---- fixtures: match a request path to a fixture file (first match wins). ----
// Ordered most-specific first so /sessions/:id/question isn't shadowed by the bare snapshot.
const FIXTURE_ROUTES = [
  [/\/api\/v1\/auth\/me$/,                          "me.json"],
  [/\/api\/version$/,                               "version.json"],
  [/\/api\/v1\/regression\/run$/,                   "regression.json"],
  [/\/api\/v1\/meeting-types$/,                     "meeting-types.json"],
  [/\/api\/v1\/heartbeat$/,                         "heartbeat.json"],
  [/\/api\/v1\/persona-runs\/current$/,             "persona-run-current.json"],
  [/\/api\/v1\/personas$/,                          "personas.json"],
  [/\/api\/v1\/arcs$/,                              "arcs.json"],
  [/\/api\/v1\/role-lexicons$/,                     "role-lexicons.json"],
  [/\/api\/v1\/lexicon\/promotions\/pending$/,      "lexicon-pending.json"],
  [/\/api\/v1\/pipeline\/status/,                   "pipeline-status.json"],

  [/\/api\/v1\/team\/people$/,                      "people.json"],
  [/\/api\/v1\/team\/aliases$/,                     "team-aliases.json"],
  [/\/api\/v1\/team\/linkable-users$/,              "linkable-users.json"],
  [/\/api\/v1\/members$/,                           "members.json"],

  [/\/api\/v1\/runs\/finished$/,                    "runs-finished.json"],
  [/\/api\/v1\/runs\/mine\/[^/]+$/,                 "my-run.json"],
  [/\/api\/v1\/runs\/mine/,                         "runs-mine.json"],
  [/\/api\/v1\/runs\/recent/,                       "runs-recent.json"],
  [/\/api\/v1\/runs\/clonable$/,                    "runs-clonable.json"],
  [/\/api\/v1\/runs\/[^/]+\/overview$/,             "run-overview.json"],
  [/\/api\/v1\/runs\/[^/]+\/full$/,                 "run-full.json"],
  [/\/api\/v1\/runs\/[^/]+\/stages$/,               "run-stages.json"],

  [/\/api\/v1\/admin\/pulse$/,                      "pulse.json"],
  [/\/api\/v1\/admin\/runs\/[^/]+$/,                "admin-run.json"],
  [/\/api\/v1\/admin\/runs$/,                       "admin-runs.json"],
  [/\/api\/v1\/admin\/ratings$/,                    "admin-ratings.json"],
  [/\/api\/v1\/admin\/gate1$/,                      "admin-gate1.json"],
  [/\/api\/v1\/admin\/registered$/,                 "registered.json"],
  [/\/api\/v1\/admin\/errors$/,                     "errors.json"],
  [/\/api\/v1\/admin\/feedback$/,                   "admin-feedback.json"],
  [/\/api\/v1\/admin\/guest-runs$/,                 "guest-runs.json"],
  [/\/api\/v1\/admin\/users\/[^/]+\/runs$/,         "user-runs.json"],

  [/\/api\/v1\/invites\/[^/]+$/,                    "invite.json"],
  [/\/api\/v1\/guided-sessions\/[^/]+$/,            "guided-session.json"],
  [/\/api\/v1\/sessions\/[^/]+\/question$/,         "question.json"],
  [/\/api\/v1\/sessions\/[^/]+\/suggest-answers$/,  "suggest-answers.json"],
  [/\/api\/v1\/sessions\/[^/]+\/rules$/,            "session-rules.json"],
  [/\/api\/v1\/sessions\/[^/]+\/prior-promises$/,   "prior-promises.json"],
  [/\/api\/v1\/sessions\/[^/]+\/lexicon\/candidates$/, "lexicon-candidates.json"],
  [/\/api\/v1\/sessions\/[^/]+\/lexicon\/scope$/,   "lexicon-scope.json"],
  [/\/api\/v1\/sessions\/[^/]+\/role-profile$/,     "role-profile.json"],
  [/\/api\/v1\/sessions\/[^/]+$/,                   "session.json"], // the snapshot — LAST of the sessions rules
];

// Endpoints served from a literal empty shape (legitimately empty for sample data — the
// monthly-checkin / guided-session lanes). Not a loud miss; keeps those screens from erroring.
const INLINE_ROUTES = [
  [/\/api\/v1\/guided-sessions$/,                  { sessions: [] }],
  [/\/api\/v1\/me\/tracker-items$/,                { requests: [], goals: [] }],
  [/\/api\/v1\/people\/[^/]+\/block-scores$/,      { scores: [] }],
  [/\/api\/v1\/people\/[^/]+\/tracker-items$/,     { promises: [], requests: [], goals: [] }],
  [/\/api\/v1\/runs\/about-me$/,                   { runs: [] }],
];

// Endpoints that legitimately return null / empty for these screens — a miss here is NOT loud.
const SOFT_MISS = [/\/api\/v1\/sessions\/[^/]+\/preview/, /\/suggest-fix/];

function loadFixture(name) {
  const p = resolve(FIXTURES, name);
  if (!existsSync(p)) return undefined;
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { console.error(`  ! fixture ${name} is invalid JSON: ${e.message}`); return undefined; }
}

// ---- capture: freeze animations, force reveals visible, inline fonts, strip scripts ----

const FREEZE_AND_REVEAL = () => {
  const s = document.createElement("style");
  s.textContent = `*,*::before,*::after{animation:none!important;transition:none!important;
    animation-duration:0s!important;caret-color:transparent!important}
    .reveal,.reveal-soft,[class*="reveal"]{opacity:1!important;transform:none!important;filter:none!important}`;
  document.head.appendChild(s);
  // Remove full-screen overlays that sit above the captured screen: celebration washes and
  // the customer app's boot-splash (its removal is tied to a boot event we freeze past, so it
  // otherwise stays up as an opaque cover).
  document.querySelectorAll(".celebration-wash,.confetti,.wash,#boot-splash,.boot-splash").forEach((n) => n.remove());
  window.scrollTo(0, 0);
};

const fontCache = new Map(); // url -> data URI (shared across pages)
async function inlineFonts(html, origin) {
  const urls = new Set();
  for (const m of html.matchAll(/url\((["']?)([^"')]+\.(?:woff2|woff|ttf))\1\)/g)) urls.add(m[2]);
  for (const raw of urls) {
    let dataUri = fontCache.get(raw);
    if (!dataUri) {
      try {
        const abs = raw.startsWith("http") ? raw : origin.replace(/\/admin$/, "") + (raw.startsWith("/") ? raw : "/" + raw);
        const res = await fetch(abs);
        if (!res.ok) { fontCache.set(raw, null); continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        const type = raw.endsWith(".woff2") ? "font/woff2" : raw.endsWith(".woff") ? "font/woff" : "font/ttf";
        dataUri = `data:${type};base64,${buf.toString("base64")}`;
        fontCache.set(raw, dataUri);
      } catch { fontCache.set(raw, null); continue; }
    }
    if (dataUri) html = html.split(raw).join(dataUri);
  }
  return html;
}

function stripScripts(html) {
  return html
    // Comments first: index.html's boot-splash note contains the literal text
    // "<script>", and the script regex below would otherwise match from inside
    // that comment to the first real closer, swallowing #root and the whole page.
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/<link\b[^>]*rel=["']?modulepreload["']?[^>]*>/gi, "");
}

function headerStrip(screen) {
  const liveUrl = (screen.app === "customer" ? CUSTOMER : ADMIN) + (screen.url === "/" ? "" : screen.url);
  const prompt = designPrompt({ label: screen.label, file: screen.file, url: liveUrl }).replace(/</g, "&lt;");
  return `
<div id="sg-strip">
  <style>
    #sg-strip{position:sticky;top:0;z-index:2147483000;display:flex;align-items:center;gap:16px;
      flex-wrap:wrap;padding:10px 20px;background:#fffbf4;border-bottom:1px solid #e8c766;
      box-shadow:0 2px 10px rgba(80,60,0,.08);font-family:Inter,system-ui,sans-serif}
    #sg-strip .sg-back{font-size:14px;font-weight:600;color:#7a5c00;text-decoration:none;white-space:nowrap}
    #sg-strip .sg-name{font-family:'Bricolage Grotesque',Inter,sans-serif;font-size:18px;font-weight:700;color:#4a3800}
    #sg-strip .sg-file{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#8a6d10;word-break:break-all}
    #sg-strip .sg-stamp{font-size:13px;color:#8a6d10;margin-left:auto;white-space:nowrap}
    #sg-strip .sg-copy{font:inherit;font-size:14px;font-weight:600;color:#4a3800;background:#f6de9b;
      border:1px solid #e0b84b;border-radius:8px;padding:7px 14px;cursor:pointer}
    #sg-strip .sg-copy:hover{background:#f0d47f}
    #sg-strip textarea.sg-ta{position:absolute;left:-9999px;top:0}
  </style>
  <a class="sg-back" href="index.html">← All screens</a>
  <span class="sg-name">${screen.label}</span>
  <span class="sg-file">${screen.file}</span>
  <button class="sg-copy" type="button">Copy design prompt</button>
  <span class="sg-stamp">Snapshot · ${STAMP} · sample data</span>
  <textarea class="sg-ta" readonly aria-hidden="true">${prompt}</textarea>
  <script>
    (function(){var s=document.getElementById('sg-strip');var b=s.querySelector('.sg-copy');
      var t=s.querySelector('.sg-ta');b.addEventListener('click',function(){
        var ok=function(){b.textContent='Copied \\u2713';setTimeout(function(){b.textContent='Copy design prompt';},1600);};
        if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t.value).then(ok,function(){t.select();try{document.execCommand('copy');ok();}catch(e){b.textContent='Select the text';}});}
        else{t.select();try{document.execCommand('copy');ok();}catch(e){b.textContent='Select the text';}}
      });})();
  </script>
</div>`;
}

// ---- index tree ----
function buildIndex(results) {
  // A screen is "captured" if a file was written (OK or OK*); only SKIP/FAIL are absent.
  const okKeys = new Set(results.filter((r) => r.status.startsWith("OK")).map((r) => r.key));
  const rows = GROUPS.map((g) => {
    const items = SCREENS.filter((s) => s.group === g.id).map((s) => {
      const disabled = !okKeys.has(s.key);
      const tag = s.needsData ? `<span class="tag">sample</span>` : "";
      const skip = disabled ? `<span class="tag tag--off">not captured</span>` : "";
      return disabled
        ? `<li class="off"><span>${s.label}</span>${skip}</li>`
        : `<li><a href="${s.key.toLowerCase()}.html">${s.label}</a>${tag}</li>`;
    }).join("");
    return items ? `<section class="grp"><h2>${g.label}</h2><ul>${items}</ul></section>` : "";
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sero — screen gallery</title>
<style>
  :root{color-scheme:light}
  body{margin:0;font-family:Inter,system-ui,sans-serif;color:#1f1a10;background:#fffdf8}
  header{background:#fffbf4;border-bottom:1px solid #e8c766;padding:22px 28px}
  header h1{font-family:'Bricolage Grotesque',Inter,sans-serif;margin:0;font-size:26px;color:#4a3800}
  header p{margin:6px 0 0;color:#8a6d10;font-size:14px}
  main{max-width:920px;margin:0 auto;padding:28px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:22px}
  .grp h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#a07d15;margin:0 0 8px}
  .grp ul{list-style:none;margin:0;padding:0;border:1px solid #eee2c0;border-radius:12px;overflow:hidden;background:#fff}
  .grp li{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid #f2ead2;font-size:15px}
  .grp li:first-child{border-top:0}
  .grp li a{color:#1f4fd8;text-decoration:none;font-weight:500}
  .grp li a:hover{text-decoration:underline}
  .grp li.off{color:#b6ab90}
  .tag{margin-left:auto;font-size:12px;color:#8a6d10;background:#fff4d6;border:1px solid #ecd28a;border-radius:999px;padding:1px 9px}
  .tag--off{color:#b06a6a;background:#fbeeee;border-color:#eccaca}
</style></head><body>
<header>
  <h1>Sero — every screen, in one place</h1>
  <p>Snapshots with sample data · generated ${STAMP} · open any screen, click “Copy design prompt”, paste into a chat to restyle it. Editing a snapshot does not change the real site — a chat re-runs the export to resync.</p>
</header>
<main>${rows}</main>
</body></html>`;
}

// ---- main ----
async function reachable(url) {
  try { const r = await fetch(url, { method: "GET" }); return r.ok || r.status === 200; } catch { return false; }
}

async function run() {
  if (!existsSync(resolve(FIXTURES, "session.json"))) {
    console.error("Missing fixtures/session.json — cannot run."); process.exit(1);
  }
  const adminUp = await reachable(ADMIN + "/");
  if (!adminUp) {
    console.error(`\nAdmin dev server not reachable at ${ADMIN}/ — start it first:\n  npm run dev\n`);
    process.exit(1);
  }
  const customerUp = await reachable(CUSTOMER + "/");

  // fresh output dir
  if (existsSync(OUT)) for (const f of readdirSync(OUT)) if (f.endsWith(".html")) rmSync(resolve(OUT, f));
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // No-op EventSource so streaming screens don't hang on a live connection.
  await context.addInitScript(() => {
    class NoopES { constructor(){ this.readyState=0; } addEventListener(){} removeEventListener(){} close(){} onmessage(){} onerror(){} }
    // @ts-ignore
    window.EventSource = NoopES;
  });

  // one shared miss tracker per navigation
  let currentScreen = null;
  const misses = new Set();

  const page = await context.newPage();

  await context.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (req.method() !== "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    // Logged-out front-door screens (customer Welcome/Join): make /auth/me 401 so the app boots
    // as a guest and shows the guest screen instead of routing a logged-in user away.
    if (currentScreen?.loggedOut && /\/api\/v1\/auth\/me$/.test(path)) {
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "unauthorized" }) });
    }
    for (const [re, file] of FIXTURE_ROUTES) {
      if (re.test(path)) {
        let data = loadFixture(file);
        if (data === undefined) { misses.add(`${file} (${path})`); data = {}; }
        // per-screen overrides: the session snapshot's stage + the me identity
        if (file === "session.json" && currentScreen?.session?.stage) data = { ...data, stage: currentScreen.session.stage };
        if (file === "me.json" && currentScreen?.me) data = { ...data, ...currentScreen.me };
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
      }
    }
    for (const [re, obj] of INLINE_ROUTES) {
      if (re.test(path)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(obj) });
    }
    if (SOFT_MISS.some((re) => re.test(path))) return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    misses.add(`UNMAPPED ${path}`);
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  const results = [];
  for (const screen of SCREENS) {
    const base = screen.app === "customer" ? CUSTOMER : ADMIN;
    if (screen.pending) {
      results.push({ key: screen.key, status: "SKIP", note: screen.pending });
      continue;
    }
    if (screen.app === "customer" && !customerUp) {
      results.push({ key: screen.key, status: "SKIP", note: "customer server (:3002) not running" });
      continue;
    }
    currentScreen = screen;
    const before = misses.size;
    try {
      // Seed (or clear) the session id on this origin BEFORE the real navigation, so the app's
      // own boot reads it. localStorage is per-origin and persists across same-origin gotos, so
      // land on the origin root first only when we're not already there.
      const originRoot = base + "/";
      if (!page.url().startsWith(base)) await page.goto(originRoot, { timeout: 20000 }).catch(() => {});
      await page.evaluate((sid) => {
        try { sid ? localStorage.setItem("seroSessionId", sid) : localStorage.removeItem("seroSessionId"); } catch {}
      }, screen.session ? DEMO_SESSION : null);

      await page.goto(base + screen.url, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
      await page.waitForSelector("#root", { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1400);          // let reveal sequences + async mounts settle
      await page.evaluate(FREEZE_AND_REVEAL);
      await page.waitForTimeout(150);

      let html = await page.evaluate(() => "<!doctype html>\n" + document.documentElement.outerHTML);
      html = stripScripts(html);
      html = await inlineFonts(html, base);
      // Inject the strip AFTER the real <body> — anchored past </head>, because a component's
      // head CSS can contain the literal text "<body>" and a naive regex would split that
      // <style> block (dumping raw CSS onto the page).
      const headEnd = html.indexOf("</head>");
      const bodyOpen = html.indexOf("<body", headEnd >= 0 ? headEnd : 0);
      if (bodyOpen >= 0) {
        const tagEnd = html.indexOf(">", bodyOpen) + 1;
        html = html.slice(0, tagEnd) + "\n" + headerStrip(screen) + html.slice(tagEnd);
      }
      writeFileSync(resolve(OUT, `${screen.key.toLowerCase()}.html`), html, "utf8");

      const newMiss = misses.size > before;
      results.push({ key: screen.key, status: newMiss ? "OK*" : "OK", note: newMiss ? "some fixtures missing" : "" });
    } catch (e) {
      results.push({ key: screen.key, status: "FAIL", note: e.message });
    }
  }

  writeFileSync(resolve(OUT, "index.html"), buildIndex(results), "utf8");
  await browser.close();

  // report
  console.log("\n  screen                     status");
  console.log("  " + "-".repeat(46));
  for (const r of results) console.log(`  ${r.key.toLowerCase().padEnd(26)} ${r.status}${r.note ? "  · " + r.note : ""}`);
  const ok = results.filter((r) => r.status.startsWith("OK")).length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n  ${ok} captured · ${skip} skipped · ${fail} failed · ${SCREENS.length} total`);
  if (misses.size) {
    console.log(`\n  MISSING FIXTURES (${misses.size}) — author these under scripts/gallery/fixtures/:`);
    for (const m of [...misses].sort()) console.log("   - " + m);
  }
  console.log(`\n  → ${OUT}\\index.html\n`);
  process.exit(fail > 0 || misses.size > 0 ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
