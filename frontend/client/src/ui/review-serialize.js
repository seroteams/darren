// Shared, deterministic serialization for the in-app Run Review (QA tooling).
// Single source of truth for: the 8 verdict dimensions, how reviewStatus is
// derived from marks, and the exact text "Copy all" produces. Keep DIMENSIONS
// in sync with the server's DIM_KEYS in frontend/server/handlers/review.js.

export const DIMENSIONS = [
  { key: "role_aware", label: "Role / seniority / meeting awareness", hint: "Is the prep specific to THIS person & meeting, or generic?" },
  { key: "grounded", label: "Grounded / no over-inference", hint: "Every claim traces to the short note; nothing invented." },
  { key: "useful", label: "Useful & short enough", hint: "Would a real manager walk in more prepared?" },
  { key: "trust", label: "Trust boundary", hint: "No private manager judgement leaked into output." },
  { key: "arc", label: "Right arc for the meeting", hint: "Followed the correct shape for this meeting type." },
  { key: "adapt", label: "Adapts to the person", hint: "Questions shift with role/seniority/notes/answers." },
  { key: "next_q", label: "Questions are useful", hint: "Each question earns its place; not filler." },
  { key: "briefing", label: "Final briefing is evidence-based", hint: "Conclusions backed by what was actually said." },
];

// none → 0 marks decided, complete → all 8 decided, partial → in between.
export function reviewStatusFromMarks(marks) {
  const m = marks && typeof marks === "object" ? marks : {};
  const decided = DIMENSIONS.filter((d) => m[d.key] === "pass" || m[d.key] === "fail").length;
  if (decided === 0) return "none";
  if (decided >= DIMENSIONS.length) return "complete";
  return "partial";
}

function markGlyph(v) {
  if (v === "pass") return "PASS";
  if (v === "fail") return "FAIL";
  return "—";
}

// Deterministic text block for clipboard. Fixed dimension order, no timestamps,
// so repeated copies of the same review are byte-identical.
export function serializeReview(run, review) {
  const ctx = (run && run.ctx) || {};
  const marks = (review && review.marks) || {};
  const note = (review && review.note) || "";
  const status = reviewStatusFromMarks(marks);
  const decided = DIMENSIONS.filter((d) => marks[d.key] === "pass" || marks[d.key] === "fail").length;

  const header = [ctx.name, ctx.role, ctx.seniority, ctx.meetingType]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" · ");

  const lines = [];
  lines.push(`Sero run review — ${(run && run.id) || ""}`);
  if (header) lines.push(header);
  lines.push(`Status: ${status} (${decided}/${DIMENSIONS.length})`);
  lines.push("");
  for (const d of DIMENSIONS) {
    lines.push(`[${markGlyph(marks[d.key])}] ${d.label}`);
  }
  lines.push("");
  lines.push("Note:");
  lines.push(note.trim() ? note.trim() : "(none)");
  return lines.join("\n");
}
