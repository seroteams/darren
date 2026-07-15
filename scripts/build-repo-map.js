#!/usr/bin/env node
// build-repo-map.js — regenerate docs/reference/repo-map.md, the file-level index
// the AI opens first. Free, offline, no API. Run: npm run build-map
//
// What it does:
//   1. Lists tracked files (git ls-files), skipping generated/noisy paths.
//   2. Buckets each file into a SECTION (Phase 1: by "room" — backend/engine,
//      admin, content, docs/plans, …). SECTIONS is ordered; first match wins.
//   3. Collapses named bulk directories to a single line (e.g. the ~892
//      content/questions/q_*.yaml → one folder line).
//   4. Writes one line per file: `path` — description [tags]
//      - Descriptions are HAND-WRITTEN and preserved verbatim across runs.
//      - A brand-new file gets a seeded description (its first comment/heading)
//        or the `_(no summary yet)_` placeholder, so it's easy to spot & fill in.
//   5. Adds a 📄 marker to any line that has a deep note in file-notes/.
//
// The file LIST stays true automatically; the words stay yours.

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MAP_PATH = path.join(ROOT, "docs/reference/repo-map.md");
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
// Keeps the map readable; these are bulk/curated data indexed elsewhere.
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

// --- section buckets, ordered; first matching test wins -----------------------
// Phase 1 = by room. To move to feature grouping later, edit these tests.
const SECTIONS = [
  { title: "Backend — engine (the pipeline)", test: (p) => p.startsWith("backend/engine/") },
  { title: "Backend — API & services", test: (p) => p.startsWith("backend/api/") },
  { title: "Backend — database", test: (p) => p.startsWith("backend/db/") },
  { title: "Backend — shared types & other", test: (p) => p.startsWith("backend/") },
  { title: "Admin console (internal UI)", test: (p) => p.startsWith("admin/") },
  { title: "Frontend (future customer app)", test: (p) => p.startsWith("frontend/") },
  { title: "Shared (cross-app helpers)", test: (p) => p.startsWith("shared/") },
  { title: "Content (prompts, questions, lexicons, config)", test: (p) => p.startsWith("content/") },
  { title: "Scripts & tooling", test: (p) => p.startsWith("scripts/") },
  { title: "Evals (engine-correctness checks)", test: (p) => p.startsWith("evals/") },
  { title: "Docs — reference (rulebooks & maps)", test: (p) => p.startsWith("docs/reference/") },
  { title: "Docs — plans (workstream history)", test: (p) => p.startsWith("docs/plans/") },
  { title: "Docs — other", test: (p) => p.startsWith("docs/") },
  { title: "Testing (tester packs & results)", test: (p) => p.startsWith("testing/") },
  { title: "Claude Code config (skills & hooks)", test: (p) => p.startsWith(".claude/") },
  { title: "Root & config", test: () => true },
];

// -----------------------------------------------------------------------------
function listTrackedFiles() {
  const out = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

function isExcluded(p) {
  return EXCLUDE_PREFIXES.some((pre) => p.startsWith(pre));
}

function collapseFor(p) {
  return COLLAPSE_DIRS.find((c) => p.startsWith(c.prefix)) || null;
}

function noteFileFor(p) {
  return path.join(NOTES_DIR, p.replace(/\//g, "__") + ".md");
}

// Seed a description for a NEW file from its first comment / heading.
function seedDescription(p) {
  const abs = path.join(ROOT, p);
  let head = "";
  try {
    head = fs.readFileSync(abs, "utf8").split("\n").slice(0, 20).join("\n");
  } catch {
    return PLACEHOLDER;
  }
  const ext = path.extname(p);
  if ([".ts", ".mts", ".js", ".mjs", ".cjs"].includes(ext)) {
    const m = head.match(/^\s*\/\/\s?(.+)$/m);
    if (m && m[1].trim()) return m[1].trim().replace(/\s+/g, " ").slice(0, 140);
  }
  if (ext === ".md") {
    const m = head.match(/^#\s+(.+)$/m);
    if (m && m[1].trim()) return m[1].trim().slice(0, 140);
  }
  return PLACEHOLDER;
}

// Parse the existing map so hand-written descriptions survive regeneration.
// Matches lines like:  `path/to/file.ts` — some description [tag, tag] 📄
function parseExistingDescriptions() {
  const map = new Map();
  if (!fs.existsSync(MAP_PATH)) return map;
  const text = fs.readFileSync(MAP_PATH, "utf8");
  const re = /^[-*]?\s*`([^`]+)`\s+—\s+(.*)$/;
  for (const line of text.split("\n")) {
    const m = line.match(re);
    if (!m) continue;
    let desc = m[2].trim();
    desc = desc.replace(/\s*📄\s*$/, "").trim(); // strip auto marker
    map.set(m[1], desc);
  }
  return map;
}

function buildLine(displayPath, desc, hasNote) {
  const marker = hasNote ? " 📄" : "";
  return "- `" + displayPath + "` — " + desc + marker;
}

function main() {
  const files = listTrackedFiles().filter((p) => !isExcluded(p));
  const existing = parseExistingDescriptions();
  const notesExist = fs.existsSync(NOTES_DIR)
    ? new Set(fs.readdirSync(NOTES_DIR))
    : new Set();

  // Bucket files; fold collapsed dirs into a single synthetic entry each.
  const buckets = new Map(SECTIONS.map((s) => [s.title, []]));
  const seenCollapse = new Set();
  let newCount = 0;

  for (const p of files) {
    const collapse = collapseFor(p);
    const displayPath = collapse ? collapse.prefix : p;
    if (collapse) {
      if (seenCollapse.has(collapse.prefix)) continue;
      seenCollapse.add(collapse.prefix);
    }

    const section = SECTIONS.find((s) => s.test(displayPath)) || SECTIONS[SECTIONS.length - 1];

    let desc = existing.get(displayPath);
    if (!desc || desc === PLACEHOLDER) {
      if (collapse) {
        desc = collapse.line + " [" + collapse.tags.join(", ") + "]";
      } else {
        desc = seedDescription(p);
        if (desc === PLACEHOLDER) newCount++;
      }
    }

    const hasNote = !collapse && notesExist.has(path.basename(noteFileFor(p)));
    buckets.get(section.title).push({ displayPath, line: buildLine(displayPath, desc, hasNote) });
  }

  const totalListed = [...buckets.values()].reduce((n, arr) => n + arr.length, 0);

  // --- assemble the document -------------------------------------------------
  const header = `# Sero repo map — one line per file

**Open this first.** It's the file-level index for finding things in the repo without
reading everything. Scan to the right section, read the one-liner, open the file (or its
deeper note in [\`file-notes/\`](file-notes/), marked 📄) only if you need more.

- **Folder-level view:** [\`structure.md\`](structure.md) — what each folder is for.
- **Engine deep-dive:** [\`engine-map.md\`](engine-map.md) — the 5-stage pipeline & couplings.
- **This map is file-level** and links to those instead of repeating them.

> Descriptions and \`[tags]\` are hand-written — grep a tag to find a feature across sections.
> The **file list** is auto-maintained: run \`npm run build-map\` after adding/moving files
> and it refreshes the list while keeping every hand-written description. New files show up
> as \`${PLACEHOLDER}\` — fill those in.

_${totalListed} entries. Regenerate with \`npm run build-map\`._

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

  const filled = totalListed - newCount;
  console.log(`repo-map.md written: ${totalListed} entries (${filled} described, ${newCount} need a summary).`);
}

main();
