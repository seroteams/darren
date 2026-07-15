#!/usr/bin/env node
// build-repo-map.js — regenerate docs/reference/repo-map.md, the file-level index
// the AI opens first. Free, offline, no API. Run: npm run build-map
//
// What it does:
//   1. Lists tracked files (git ls-files), skipping generated/noisy paths.
//   2. Buckets each file into a FEATURE section (product-first — sign-in, the 1:1
//      pipeline, people, content, …). SECTIONS is ordered; first match wins.
//   3. Collapses named bulk directories to a single line (e.g. the ~890
//      content/questions/q_*.yaml → one folder line).
//   4. Writes one line per file: `path` — description [tags]
//      - Hand-written descriptions are preserved verbatim across runs.
//      - Auto-seeded descriptions (from a file's first prose comment / heading) are
//        refreshed when the seeder improves — tracked via repo-map.seeds.json so an
//        untouched seed can be told apart from a line you edited by hand.
//      - A file with no usable comment shows `_(no summary yet)_` — fill it in.
//   5. Adds a 📄 marker to any line that has a deep note in file-notes/.

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MAP_PATH = path.join(ROOT, "docs/reference/repo-map.md");
const SEEDS_PATH = path.join(ROOT, "docs/reference/repo-map.seeds.json");
const NOTES_DIR = path.join(ROOT, "docs/reference/file-notes");
const PLACEHOLDER = "_(no summary yet)_";

// --- what to leave out entirely (generated / not worth indexing) --------------
const EXCLUDE_PREFIXES = [
  "logs/", // run artifacts, mostly git-ignored
  "node_modules/",
  "images/",
  "admin/public/",
  "frontend/public/",
];

// --- directories represented by ONE folder line instead of per-file -----------
const COLLAPSE_DIRS = [
  {
    prefix: "content/questions/",
    line: "the question bank (~890 `q_*.yaml`), indexed by `_index.json`; rebuild with `npm run rebuild-question-index`",
    tags: ["question-bank", "content"],
  },
  {
    prefix: "content/data/people/",
    line: "per-person runtime state (generated/cached)",
    tags: ["content", "runtime"],
  },
  {
    prefix: ".claude/skills/",
    line: "auto-loaded rulebooks (backend-conventions, darren-method, phase-close, …) — one SKILL.md per skill",
    tags: ["skills", "meta"],
  },
];

// --- feature sections, ordered; first matching test wins ----------------------
// Product-facing surfaces first, then engine/infra, then content/docs/tooling.
// Grep a [tag] to find a feature that spans sections.
const has = (p, s) => p.includes(s);
const svc = (p, name) => p.includes(`backend/api/services/${name}/`);
const stageRe = (p, re) => new RegExp(`^admin/src/stages/(${re})(\\.|/|$)`).test(p);

const SECTIONS = [
  {
    title: "🔑 Sign in, accounts & access",
    test: (p) =>
      svc(p, "auth") || svc(p, "superadmin") ||
      stageRe(p, "login|register|forgot-password|reset-password") ||
      p.startsWith("admin/src/guest"),
  },
  {
    title: "🗣️ The 1:1 pipeline (engine)",
    test: (p) => p.startsWith("backend/engine/"),
  },
  {
    title: "▶️ Running a 1:1 (sessions & API)",
    test: (p) => svc(p, "sessions") || svc(p, "pipeline") || svc(p, "guided-sessions") || svc(p, "runs"),
  },
  {
    title: "🖥️ 1:1 screens (admin console)",
    test: (p) =>
      stageRe(p, "focus-points|preparation|bank|briefing|eval|questioning|compare|run-detail|run-debrief|review-run|start|start-core|onepage|intake|intake-firstrun|stage\\.types"),
  },
  {
    title: "👥 People, team & invites",
    test: (p) =>
      svc(p, "team") || svc(p, "invites") || svc(p, "role-lexicons") || svc(p, "lexicon") ||
      stageRe(p, "admin-registered|admin-user-detail|personas|job-lexicons|lexicon-review"),
  },
  {
    title: "📚 Content — prompts, questions, lexicons",
    test: (p) => p.startsWith("content/"),
  },
  {
    title: "🩺 Feedback, errors & health",
    test: (p) =>
      ["feedback", "error-log", "health", "heartbeat", "trackers", "regression", "checks", "suggest-fix"].some((s) => svc(p, s)) ||
      stageRe(p, "admin-error-log|admin-feedback|admin-pulse|error"),
  },
  {
    title: "🔔 Notifications & email",
    test: (p) => svc(p, "notifications"),
  },
  {
    title: "🗂️ Catalog, library & meeting arcs",
    test: (p) =>
      ["catalog", "library", "arcs", "suggest"].some((s) => svc(p, s)) ||
      stageRe(p, "library|meeting-arcs|universe|guide|about|privacy|design|test|tasks|admin-guest-runs"),
  },
  {
    title: "🧩 Admin console — shell & remaining screens",
    test: (p) => p.startsWith("admin/"),
  },
  {
    title: "🗄️ Database & persistence",
    test: (p) => p.startsWith("backend/db/"),
  },
  {
    title: "⚙️ Backend — API platform & shared",
    test: (p) => p.startsWith("backend/"),
  },
  {
    title: "🌐 Frontend (future customer app)",
    test: (p) => p.startsWith("frontend/"),
  },
  {
    title: "🔗 Shared (cross-app helpers)",
    test: (p) => p.startsWith("shared/"),
  },
  {
    title: "🛠️ Scripts & tooling",
    test: (p) => p.startsWith("scripts/"),
  },
  {
    title: "✅ Evals (engine-correctness checks)",
    test: (p) => p.startsWith("evals/"),
  },
  {
    title: "📖 Docs — reference (rulebooks & maps)",
    test: (p) => p.startsWith("docs/reference/"),
  },
  {
    title: "📓 Docs — plans (workstream history)",
    test: (p) => p.startsWith("docs/plans/"),
  },
  {
    title: "📄 Docs — other",
    test: (p) => p.startsWith("docs/"),
  },
  {
    title: "🧪 Testing (tester packs & results)",
    test: (p) => p.startsWith("testing/"),
  },
  {
    title: "🤖 Claude Code config (skills & hooks)",
    test: (p) => p.startsWith(".claude/"),
  },
  {
    title: "📌 Root & config",
    test: () => true,
  },
];

// -----------------------------------------------------------------------------
function listTrackedFiles() {
  const out = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

const isExcluded = (p) => EXCLUDE_PREFIXES.some((pre) => p.startsWith(pre));
const collapseFor = (p) => COLLAPSE_DIRS.find((c) => p.startsWith(c.prefix)) || null;
const noteBasename = (p) => p.replace(/\//g, "__") + ".md";

// Pick the first *prose* comment/heading — skip dividers, rule tags, ALL-CAPS banners.
function seedDescription(p) {
  const abs = path.join(ROOT, p);
  let lines;
  try {
    lines = fs.readFileSync(abs, "utf8").split("\n").slice(0, 30);
  } catch {
    return PLACEHOLDER;
  }
  const ext = path.extname(p);

  if ([".ts", ".mts", ".js", ".mjs", ".cjs"].includes(ext)) {
    for (const raw of lines) {
      const m = raw.match(/^\s*\/\/+\s?(.*)$/);
      if (!m) continue;
      const t = m[1].trim();
      if (!t) continue;
      if (/^[-=*]{2,}/.test(t)) continue;              // divider ---- ==== ****
      if (/^H\d\b/.test(t)) continue;                   // rule tag "H2 — …"
      if (/^(eslint|@ts|prettier|todo|fixme|note:|xxx|istanbul)/i.test(t)) continue;
      if (!/\s/.test(t)) continue;                      // single token
      if (/[A-Z]/.test(t) && t === t.toUpperCase()) continue; // ALL-CAPS banner
      return t.replace(/\s+/g, " ").slice(0, 160);
    }
    return PLACEHOLDER;
  }

  if (ext === ".md") {
    const h1 = lines.find((l) => /^#\s+\S/.test(l));
    if (h1) return h1.replace(/^#\s+/, "").trim().slice(0, 160);
    return PLACEHOLDER;
  }

  return PLACEHOLDER;
}

// Parse the existing map so descriptions survive regeneration.
// Matches:  - `path` — description [tags] 📄
function parseExistingDescriptions() {
  const map = new Map();
  if (!fs.existsSync(MAP_PATH)) return map;
  const re = /^[-*]?\s*`([^`]+)`\s+—\s+(.*)$/;
  for (const line of fs.readFileSync(MAP_PATH, "utf8").split("\n")) {
    const m = line.match(re);
    if (!m) continue;
    map.set(m[1], m[2].trim().replace(/\s*📄\s*$/, "").trim());
  }
  return map;
}

function loadSeeds() {
  try {
    return JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function main() {
  const files = listTrackedFiles().filter((p) => !isExcluded(p));
  const existing = parseExistingDescriptions();
  const recordedSeeds = loadSeeds();
  const nextSeeds = {};
  const notesExist = fs.existsSync(NOTES_DIR) ? new Set(fs.readdirSync(NOTES_DIR)) : new Set();

  const buckets = new Map(SECTIONS.map((s) => [s.title, []]));
  const seenCollapse = new Set();
  let placeholderCount = 0;

  for (const p of files) {
    const collapse = collapseFor(p);
    const displayPath = collapse ? collapse.prefix : p;
    if (collapse) {
      if (seenCollapse.has(collapse.prefix)) continue;
      seenCollapse.add(collapse.prefix);
    }

    const section = SECTIONS.find((s) => s.test(displayPath)) || SECTIONS[SECTIONS.length - 1];

    const seedNow = collapse
      ? `${collapse.line} [${collapse.tags.join(", ")}]`
      : seedDescription(p);

    const prev = existing.get(displayPath);
    let desc;
    if (prev === undefined || prev === PLACEHOLDER) {
      desc = seedNow; // brand new (or still blank) → seed it
    } else if (prev === recordedSeeds[displayPath]) {
      desc = seedNow; // untouched auto-seed → refresh with the better seed
    } else {
      desc = prev; // hand-edited → keep verbatim
    }

    // Remember the seed only while the line is still an (untouched) auto-seed.
    if (desc === seedNow) nextSeeds[displayPath] = seedNow;
    else if (recordedSeeds[displayPath] !== undefined) nextSeeds[displayPath] = recordedSeeds[displayPath];

    if (desc === PLACEHOLDER) placeholderCount++;

    const hasNote = !collapse && notesExist.has(noteBasename(p));
    const marker = hasNote ? " 📄" : "";
    buckets.get(section.title).push({ displayPath, line: `- \`${displayPath}\` — ${desc}${marker}` });
  }

  const total = [...buckets.values()].reduce((n, arr) => n + arr.length, 0);

  const header = `# Sero repo map — one line per file

**Open this first.** The file-level index for finding things without reading the whole
repo. Scan to the feature section, read the one-liner, open the file (or its deeper note
in [\`file-notes/\`](file-notes/), marked 📄) only if you need more.

- **Folder-level view:** [\`structure.md\`](structure.md) — what each folder is for.
- **Engine deep-dive:** [\`engine-map.md\`](engine-map.md) — the 5-stage pipeline & couplings.
- This map is **file-level** and grouped **by feature** (product surfaces first); it links
  to those two instead of repeating them.

> Descriptions + \`[tags]\` are editable — grep a tag to find a feature across sections.
> The **file list** is auto-maintained: run \`npm run build-map\` after adding/moving files.
> Hand-written descriptions are kept; auto-seeded ones (lifted from each file's first
> comment/heading) refresh automatically. New/blank files show \`${PLACEHOLDER}\`.

_${total} entries · ${total - placeholderCount} described · ${placeholderCount} to fill · \`npm run build-map\`._

`;

  let body = "";
  for (const s of SECTIONS) {
    const items = buckets.get(s.title);
    if (!items.length) continue;
    items.sort((a, b) => a.displayPath.localeCompare(b.displayPath));
    body += `## ${s.title}\n\n${items.map((i) => i.line).join("\n")}\n\n`;
  }

  fs.mkdirSync(path.dirname(MAP_PATH), { recursive: true });
  fs.writeFileSync(MAP_PATH, header + body, "utf8");
  fs.writeFileSync(SEEDS_PATH, JSON.stringify(nextSeeds, null, 0) + "\n", "utf8");

  console.log(`repo-map.md written: ${total} entries (${total - placeholderCount} described, ${placeholderCount} to fill).`);
}

main();
