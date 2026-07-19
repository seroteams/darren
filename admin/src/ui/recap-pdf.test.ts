// Unit tests for the recap-PDF document builder (pure — no pdfmake import).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecapDocDefinition, recapPdfFilename } from "./recap-pdf.ts";

const FULL = {
  headline: "Amira's review churn comes from checking screens late.",
  summary_bullets: ["Main screens look fine, review finds missing states.", "Her own fix is clear."],
  understanding_paragraph: "She shares before the flow is settled.",
  axes: [
    { id: "clarity", score: -5, meaning: "Shares before the full flow is settled.", read_status: "read" },
    { id: "wellbeing", score: 0, read_status: "not_read" },
  ],
  brutal_truth_employee: "The draft habit leaves key checks for review.",
  brutal_truth_manager: "You reward speed over completeness.",
  next_actions: [
    { when: "next 1:1", action: "Review one design against the checklist." },
    { when: "today", action: "Ask Amira to write a pre-share checklist." },
  ],
  watch_for: ["Does Amira bring the full flow unprompted?"],
  completedAt: "2026-07-18T10:00:00Z",
};

const flat = (doc: { content: unknown[] }) => JSON.stringify(doc.content);

test("full briefing renders every section with the engine's own words", () => {
  const doc = buildRecapDocDefinition(FULL, {
    name: "Amira",
    role: "Junior Product Designer",
    meetingType: "Performance & feedback",
    notes: "Her recent work needs too many review rounds.",
  });
  const s = flat(doc);
  assert.match(s, /review churn/);
  // Top context block: who it was for + the intake detail, verbatim.
  assert.match(s, /WHO THIS WAS FOR/);
  assert.match(s, /Junior Product Designer/);
  assert.match(s, /Meeting: Performance & feedback/);
  assert.match(s, /WHAT SERO WAS TOLD GOING IN/);
  assert.match(s, /too many review rounds/);
  assert.match(s, /1:1 RECAP/);
  assert.match(s, /WHAT STOOD OUT/);
  assert.match(s, /WHAT WE UNDERSTOOD/);
  assert.match(s, /FINAL READ/);
  assert.match(s, /THE HONEST READ/);
  assert.match(s, /OK to share/);
  assert.match(s, /Private, just for you/);
  assert.match(s, /SERO'S SUGGESTIONS/); // no lock → suggestions, labelled as such
  assert.match(s, /REMINDERS/);
  // Unread axis is a quiet caption, not a fabricated bar.
  assert.match(s, /Wellbeing — not enough signal/);
});

test("actions sort by when (today before next 1:1)", () => {
  const doc = buildRecapDocDefinition(FULL, { name: "Amira" });
  const s = flat(doc);
  assert.ok(s.indexOf("pre-share checklist") < s.indexOf("Review one design"));
});

test("empty sections are dropped, not rendered blank", () => {
  const doc = buildRecapDocDefinition({ headline: "Just a headline." }, { name: "Sam" });
  const s = flat(doc);
  assert.match(s, /Just a headline/);
  assert.doesNotMatch(s, /WHAT STOOD OUT|FINAL READ|HONEST READ|SUGGESTIONS|WHAT YOU AGREED|REMINDERS/);
  // No intake notes → the "what Sero was told" label stays out too.
  assert.match(s, /WHO THIS WAS FOR/);
  assert.doesNotMatch(s, /WHAT SERO WAS TOLD/);
});

// Promises-before-recap: locked agreements replace the suggestions and carry owners.
test("locked promises render owner-grouped, manager first, and beat the suggestions", () => {
  const doc = buildRecapDocDefinition(FULL, { name: "Amira" }, [
    { owner: "report", action: "Track her hours for a week →", when: "before next 1:1" },
    { owner: "manager", action: "Book the onboarding buddy", when: "this week" },
  ]);
  const s = flat(doc);
  assert.match(s, /WHAT YOU AGREED/);
  assert.match(s, /YOU PROMISED/);
  assert.match(s, /AMIRA PROMISED/);
  assert.ok(s.indexOf("YOU PROMISED") < s.indexOf("AMIRA PROMISED"), "manager's own first");
  assert.doesNotMatch(s, /SERO'S SUGGESTIONS/, "suggestions never render alongside the agreement");
  assert.match(s, /Track her hours for a week ->/, "pdfSafe applied to promise text");
});

test("a locked-empty list suppresses the suggestions too — the manager's call stands", () => {
  const doc = buildRecapDocDefinition(FULL, { name: "Amira" }, []);
  const s = flat(doc);
  assert.doesNotMatch(s, /WHAT YOU AGREED|SUGGESTIONS/);
});

test("filename slugs the name and stamps the completed date", () => {
  assert.equal(recapPdfFilename("Amira Khan", "2026-07-18T10:00:00Z"), "sero-recap-amira-khan-2026-07-18.pdf");
  assert.equal(recapPdfFilename("", null).startsWith("sero-recap-1-1-"), true);
});
