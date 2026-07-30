// Unit tests for the recap-PDF document builder (pure — no pdfmake import).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRecapDocDefinition, recapPdfFilename, PRINT, PRINT_RUNGS } from "./recap-pdf.ts";

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
  assert.match(s, /Wellbeing. Not enough signal/);
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

test("a locked-empty list suppresses the suggestions too. The manager's call stands", () => {
  const doc = buildRecapDocDefinition(FULL, { name: "Amira" }, []);
  const s = flat(doc);
  assert.doesNotMatch(s, /WHAT YOU AGREED|SUGGESTIONS/);
});

test("filename slugs the name and stamps the completed date", () => {
  assert.equal(recapPdfFilename("Amira Khan", "2026-07-18T10:00:00Z"), "sero-recap-amira-khan-2026-07-18.pdf");
  assert.equal(recapPdfFilename("", null).startsWith("sero-recap-1-1-"), true);
});

/* -----------------------------------------------------------------------------
   The print ladder (type-system P6).

   This file is allowlisted out of the CSS guard (scripts/lint-design-tokens.js)
   because pdfmake cannot read a CSS variable, so a lint rule can never hold it.
   These three tests are the only thing that can. Before them the builder held
   eight free-floating pt values and nothing anywhere checked a single one.
   ----------------------------------------------------------------------------- */

// Walk the whole document definition, not just `content`: defaultStyle and the
// footer carry sizes too, and the footer is a FUNCTION, so it has to be called.
function everyNode(doc: Record<string, unknown>): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visit);
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    out.push(o);
    for (const v of Object.values(o)) visit(v);
  };
  visit(doc.content);
  visit(doc.defaultStyle);
  const footer = doc.footer as ((p: number, c: number) => unknown) | undefined;
  if (typeof footer === "function") visit(footer(1, 2));
  return out;
}

const DOC = () =>
  buildRecapDocDefinition(
    FULL,
    { name: "Amira", role: "Junior Product Designer", meetingType: "Performance & feedback", notes: "Needs review rounds." },
    [{ owner: "manager", action: "Book the buddy", when: "next 1:1" }]
  ) as unknown as Record<string, unknown>;

test("every fontSize in the document is a print rung", () => {
  const sizes = everyNode(DOC())
    .map((n) => n.fontSize)
    .filter((v): v is number => typeof v === "number");
  assert.ok(sizes.length > 0, "the walker found no sizes at all, so it is not walking");
  const off = [...new Set(sizes)].filter((s) => !(PRINT_RUNGS as readonly number[]).includes(s));
  assert.deepEqual(off, [], `off-ladder pt sizes: ${off.join(", ")}. pt = px x 0.75, see PRINT.`);
});

test("no print size falls below the bottom rung, which is the 14px floor converted", () => {
  const sizes = everyNode(DOC())
    .map((n) => n.fontSize)
    .filter((v): v is number => typeof v === "number");
  const floor = Math.min(...(PRINT_RUNGS as readonly number[]));
  assert.equal(floor, 10.5, "the bottom print rung IS 14px x 0.75");
  assert.equal(sizes.filter((s) => s < floor).length, 0, "something printed below the converted floor");
});

test("the ladder is derived from the screen roles, not hand-picked", () => {
  // pt = px x 0.75 for all seven rungs of design/tokens.css.
  assert.deepEqual([...PRINT_RUNGS].sort((a, b) => a - b), [14, 16, 18, 20, 24, 30, 36].map((px) => px * 0.75));
  // pdfmake's lineHeight is a MULTIPLIER, so each role's is its own pair's ratio.
  assert.equal(PRINT.bodySm.lineHeight, 20 / 14);
  assert.equal(PRINT.headingXl.lineHeight, 36 / 30);
  // characterSpacing is ABSOLUTE POINTS, so it is em x sizePt: 0.08em x 10.5pt.
  assert.equal(PRINT.overline.characterSpacing, 0.84);
});

test("one uppercase label recipe, not four", () => {
  // The three hand-written copies of the eyebrow object are gone: every uppercase
  // section label in the PDF now comes through eyebrow() on .type-overline, so
  // they cannot drift to three different sizes and trackings again.
  const upper = everyNode(DOC()).filter(
    (n) => typeof n.text === "string" && n.text === (n.text as string).toUpperCase() && /[A-Z]{3}/.test(n.text as string)
  );
  assert.ok(upper.length >= 4, `expected several uppercase labels, found ${upper.length}`);
  for (const n of upper) {
    assert.equal(n.fontSize, PRINT.overline.fontSize, `${n.text} is off the overline rung`);
    assert.equal(n.characterSpacing, PRINT.overline.characterSpacing, `${n.text} has its own tracking`);
  }
});
