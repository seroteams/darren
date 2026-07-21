// Shared, deterministic serialization for the in-app Run Review (QA tooling).
// Single source of truth for: the 8 verdict dimensions, how reviewStatus is
// derived from marks, the library badge, and the exact text "Copy all"
// produces. Keep DIMENSIONS in sync with the server's REVIEW_DIM_KEYS
// (src/run-history.js).

export const DIMENSIONS = [
  { key: "role_aware", label: "Role-aware", hint: "Specific to this person's role/seniority, not generic." },
  { key: "meeting_aware", label: "Meeting-type-aware", hint: "Shaped for this meeting type." },
  { key: "grounded", label: "Grounded in manager input", hint: "Every claim traces to the manager's note." },
  { key: "evidence", label: "Uses evidence from conversation", hint: "Conclusions cite what was actually said." },
  { key: "no_overreach", label: "Does not over-infer", hint: "No diagnosis beyond what the answers support." },
  { key: "trust", label: "No private leak", hint: "Manager's private concern never surfaced in output." },
  { key: "next_actions", label: "Useful next actions", hint: "Concrete, manager-owned next steps." },
  { key: "briefing_usable", label: "Recap short & usable", hint: "A manager could walk in on it as-is." },
];

export const OVERALL_VALUES = ["keep", "fix", "block"];
const OVERALL_LABEL = { keep: "Keep", fix: "Fix", block: "Block" };

// Which engine file owns each dimension — printed in "Suggested fixes" so an
// external AI knows where to change the engine for each failing dimension.
const FIX_MAP = {
  role_aware: ["prompts/preparation.md", "prompts/generate-focus-points.md", "backend/engine/preparation.ts (validateBrief)"],
  meeting_aware: ["prompts/preparation.md", "prompts/generate-questions.md"],
  grounded: ["prompts/preparation.md", "prompts/generate-focus-points.md", "backend/engine/preparation.ts (validateBrief)"],
  evidence: ["prompts/final-evaluation.md", "backend/engine/reviewer.ts"],
  no_overreach: ["prompts/final-evaluation.md", "prompts/generate-focus-points.md", "backend/engine/reviewer.ts"],
  trust: ["prompts/generate-questions.md"],
  next_actions: ["prompts/final-evaluation.md", "backend/engine/reviewer.ts"],
  briefing_usable: ["prompts/final-evaluation.md", "backend/engine/reviewer.ts"],
};

// none → 0 marks decided, complete → all 8 decided, partial → in between.
export function reviewStatusFromMarks(marks) {
  const m = marks && typeof marks === "object" ? marks : {};
  const decided = DIMENSIONS.filter((d) => m[d.key] === "pass" || m[d.key] === "fail").length;
  if (decided === 0) return "none";
  if (decided >= DIMENSIONS.length) return "complete";
  return "partial";
}

export function failedCountFromMarks(marks) {
  const m = marks && typeof marks === "object" ? marks : {};
  return DIMENSIONS.filter((d) => m[d.key] === "fail").length;
}

// Library badge: completeness first, then the manual overall verdict once all
// 8 are judged. { label, tone } where tone drives the colour class.
export function libraryBadge(reviewStatus, overall) {
  if (reviewStatus === "none" || !reviewStatus) return { label: "Unreviewed", tone: "muted" };
  if (reviewStatus === "partial") return { label: "Incomplete", tone: "muted" };
  if (overall === "keep") return { label: "Keep", tone: "keep" };
  if (overall === "fix") return { label: "Fix", tone: "fix" };
  if (overall === "block") return { label: "Block", tone: "block" };
  return { label: "Needs verdict", tone: "muted" };
}

// The run fingerprint is an object ({ promptVersion, modelConfigVersion, … })
// or sometimes a string. Reduce it to a short, stable engine tag.
export function engineTag(fp) {
  if (!fp) return "";
  if (typeof fp === "string") return fp.slice(0, 8);
  return [fp.promptVersion, fp.modelConfigVersion].filter(Boolean).join("/");
}

function markGlyph(v) {
  if (v === "pass") return "PASS";
  if (v === "fail") return "FAIL";
  return "–";
}

// "2026_Jun06_09-30-c6c3192b" → "2026 Jun 06" (deterministic, from the id).
function dateFromId(id) {
  const m = /^(\d{4})_([A-Za-z]{3})(\d{2})/.exec(String(id || ""));
  return m ? `${m[1]} ${m[2]} ${m[3]}` : "";
}

function prepLines(prep) {
  if (!prep) return ["(prep unavailable)"];
  const rows = [
    ["Likely theme", prep.coreIssue],
    ["Say this first", prep.openingQuestion],
    ["Listen for", prep.listenFor],
    ["Avoid", prep.avoid],
    ["Success looks like", prep.goodOutcome],
    ["Suggested action", prep.suggestedAction],
  ];
  const out = [];
  for (const [label, val] of rows) {
    if (val == null || (Array.isArray(val) && !val.length) || (!Array.isArray(val) && !String(val).trim())) continue;
    if (Array.isArray(val)) {
      out.push(`${label}:`);
      for (const v of val) out.push(`  - ${String(v).trim()}`);
    } else {
      out.push(`${label}: ${String(val).trim()}`);
    }
  }
  return out.length ? out : ["(prep unavailable)"];
}

function questionLines(turns) {
  const list = (turns || []).filter((t) => t && (t.name || t.answer));
  if (!list.length) return ["(no questions recorded)"];
  const out = [];
  list.forEach((t, i) => {
    out.push(`${i + 1}. ${t.name ? String(t.name).trim() : "(question)"}`);
    out.push(`   → ${t.skipped ? "(skipped)" : t.answer ? String(t.answer).trim() : "(no answer)"}`);
  });
  return out;
}

function briefingLines(b) {
  if (!b) return ["(no briefing recorded)"];
  const out = [];
  if (b.headline) out.push(`Headline: ${String(b.headline).trim()}`);
  for (const x of b.summary_bullets || []) out.push(`- ${String(x).trim()}`);
  if (b.understanding_paragraph) out.push(`Understanding: ${String(b.understanding_paragraph).trim()}`);
  for (const a of b.next_actions || []) out.push(`Next: ${a.when ? a.when + ", " : ""}${a.action || ""}`.trim());
  return out.length ? out : ["(no briefing recorded)"];
}

// Deterministic Markdown block for clipboard. Fixed sections, fixed dimension
// order, no wall-clock timestamps, so repeated copies of the same review are
// byte-identical.
export function serializeReview(run, review) {
  const ctx = (run && run.ctx) || {};
  const marks = (review && review.marks) || {};
  const overall = OVERALL_VALUES.includes(review && review.overall) ? review.overall : null;
  const note = (review && review.note) || "";
  const status = reviewStatusFromMarks(marks);
  const decided = DIMENSIONS.filter((d) => marks[d.key] === "pass" || marks[d.key] === "fail").length;
  const person = [ctx.name, ctx.role, ctx.seniority].map((s) => String(s || "").trim()).filter(Boolean).join(" · ");

  const L = [];
  L.push("# Sero Run Review");
  L.push("");
  L.push("## Run metadata");
  L.push(`- Run ID: ${(run && run.id) || ""}`);
  L.push(`- Date: ${dateFromId(run && run.id)}`);
  L.push(`- Person: ${person || "(unknown)"}`);
  L.push(`- Meeting: ${String(ctx.meetingType || "").trim() || "(unknown)"}`);
  L.push(`- Engine fingerprint: ${engineTag(run && run.fingerprint) || "(none)"}`);
  L.push("");
  L.push("## Manager setup");
  L.push("> ⚠ PRIVATE MANAGER INPUT. Not surfaced to the employee.");
  L.push(String(ctx.notes || "").trim() || "(none)");
  L.push("");
  L.push("## Prep brief");
  L.push(...prepLines(run && run.prep));
  L.push("");
  L.push("## Live questions and notes");
  L.push(...questionLines(run && run.turns));
  L.push("");
  L.push("## Final recap");
  L.push(...briefingLines(run && run.briefing));
  L.push("");
  L.push("## Verdict");
  L.push(`- Status: ${status} (${decided}/${DIMENSIONS.length})`);
  L.push(`- Overall: ${overall ? OVERALL_LABEL[overall] : "(not set)"}`);
  for (const d of DIMENSIONS) L.push(`- ${markGlyph(marks[d.key])}. ${d.label}`);
  L.push(`- Note: ${note.trim() || "(none)"}`);
  L.push("");
  L.push("## Suggested fixes");
  const failed = DIMENSIONS.filter((d) => marks[d.key] === "fail");
  if (!failed.length) {
    L.push("No failed dimensions.");
  } else {
    L.push("These dimensions failed. Propose concrete edits to the named files to fix them, without regressing the passing dimensions:");
    for (const d of failed) L.push(`- ${d.label} → ${FIX_MAP[d.key].join(", ")}`);
  }
  return L.join("\n");
}
