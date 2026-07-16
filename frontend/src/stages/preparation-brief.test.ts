import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VARIANTS,
  VARIANT_STORAGE_KEY,
  confidenceCopy,
  ctaRowHtml,
  extractSlots,
  parseConfidenceLevel,
  readVariant,
  renderBrief,
  variantSwitchHtml,
  writeVariant,
  type PrepBrief,
  type StorageLike,
} from "./preparation-brief.ts";
import { escapeCopy } from "../../../admin/src/ui/html.js";

// One canonical payload — every field a distinct sentence so the duplicate
// check below can't be fooled by coincidence. Shape mirrors
// PreparationResult["brief"] (backend/shared/session.types.ts).
const BRIEF: PrepBrief = {
  coreIssue: "Priya may be weighing an internal move.",
  openingQuestion: "What part of the new project has your attention right now?",
  listenFor: [
    "Mentions of the platform team",
    "Energy when she talks about mentoring",
    "Hesitation around the roadmap",
  ],
  avoid: ["Promising a title change", "Comparing her to Sam"],
  goodOutcome: "You leave knowing what would make her stay for the next year.",
  suggestedAction: "Let her finish before offering solutions.",
  confidence: "Medium, based on your note and her seniority",
  dontAssume: "That the internal move is about money",
};

const SLOTS = extractSlots(BRIEF, "Priya");

/* ---------------------------------------------------------------------------
   Confidence mapping — exact copy fixed by the spec
--------------------------------------------------------------------------- */

const LOW_COPY =
  "This brief is based on the role and meeting type only — you haven't added notes yet. Treat it as a starting point, not a read on Priya.";
const MEDIUM_COPY =
  "This brief uses your notes plus role defaults. The more specific parts come from what you wrote.";
const HIGH_COPY = "This brief is grounded in your notes and recent context.";

test("confidence: level parses from the leading word, case-insensitive", () => {
  assert.equal(parseConfidenceLevel("Low, role defaults only"), "low");
  assert.equal(parseConfidenceLevel("MEDIUM, from your note"), "medium");
  assert.equal(parseConfidenceLevel("high, grounded in notes"), "high");
  assert.equal(parseConfidenceLevel("Somewhat sure"), "unknown");
  // Word boundary: "Lowering" must not read as "low".
  assert.equal(parseConfidenceLevel("Lowering expectations here"), "unknown");
  assert.equal(parseConfidenceLevel(""), "unknown");
});

test("confidence: mapping produces the exact spec copy", () => {
  assert.equal(confidenceCopy("Low, role defaults only", "Priya"), LOW_COPY);
  assert.equal(confidenceCopy("Medium, based on your note", "Priya"), MEDIUM_COPY);
  assert.equal(confidenceCopy("High, grounded in your notes", "Priya"), HIGH_COPY);
});

test("confidence: unreadable level falls back to the raw sentence, never masked", () => {
  assert.equal(confidenceCopy("  Somewhat sure, hard to say  ", "Priya"), "Somewhat sure, hard to say");
});

test("confidence: missing name falls back to 'them' in the low copy", () => {
  assert.ok(confidenceCopy("Low, nothing to go on", "").endsWith("not a read on them."));
});

/* ---------------------------------------------------------------------------
   Slot extraction
--------------------------------------------------------------------------- */

test("slots: dontAssume merges the don't-assume line with the avoid items", () => {
  assert.deepEqual(SLOTS.dontAssume, [
    "That the internal move is about money",
    "Promising a title change",
    "Comparing her to Sam",
  ]);
});

test("slots: merge dedupes and drops blanks; listenFor caps at 3", () => {
  const slots = extractSlots(
    {
      ...BRIEF,
      dontAssume: "Promising a title change",
      avoid: ["Promising a title change", "  "],
      listenFor: ["a", "b", "c", "d"],
    },
    "Priya",
  );
  assert.deepEqual(slots.dontAssume, ["Promising a title change"]);
  assert.deepEqual(slots.listenFor, ["a", "b", "c"]);
});

test("slots: confidence is the rewritten statement, not the engine sentence", () => {
  assert.equal(SLOTS.confidence, MEDIUM_COPY);
  assert.equal(SLOTS.confidenceLevel, "medium");
});

/* ---------------------------------------------------------------------------
   Every variant renders all 7 slots, nothing twice
--------------------------------------------------------------------------- */

// Text nodes of the rendered HTML, normalised: tags stripped, whitespace
// collapsed, lowercased.
function textNodes(html: string): string[] {
  return html
    .replace(/<[^>]*>/g, "\n")
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean);
}

for (const { id, label } of VARIANTS) {
  test(`variant ${id} (${label}): renders all 7 slots`, () => {
    const html = renderBrief(id, SLOTS);
    const expected = [
      SLOTS.confidence,
      SLOTS.theme,
      SLOTS.opener,
      ...SLOTS.listenFor,
      ...SLOTS.dontAssume,
      SLOTS.yourMove,
      SLOTS.leaveWith,
    ];
    for (const text of expected) {
      assert.ok(html.includes(escapeCopy(text)), `${id} carries: ${text}`);
    }
  });

  test(`variant ${id} (${label}): no normalised text node appears twice`, () => {
    const nodes = textNodes(renderBrief(id, SLOTS));
    const seen = new Set<string>();
    for (const node of nodes) {
      assert.ok(!seen.has(node), `duplicate text in variant ${id}: "${node}"`);
      seen.add(node);
    }
  });

  test(`variant ${id} (${label}): truthful labels, no retired strings`, () => {
    const html = renderBrief(id, SLOTS);
    assert.ok(html.includes("During the 1:1"), "your-move slot labelled for during the meeting");
    assert.ok(!html.includes("Before you go in"), "old mislabel gone");
    assert.ok(!/prep brief ready/i.test(html), "ready label gone");
    assert.ok(!/at a glance/i.test(html), "at-a-glance block gone");
    assert.ok(!/full brief/i.test(html), "full-brief block gone");
  });
}

/* ---------------------------------------------------------------------------
   CTA + switcher persistence
--------------------------------------------------------------------------- */

test("CTA: renamed to 1:1 questions", () => {
  const html = ctaRowHtml();
  assert.ok(html.includes("Generate 1:1 questions"));
  assert.ok(!/interview/i.test(html));
});

function fakeStorage(init?: Record<string, string>): StorageLike {
  const m = new Map(Object.entries(init || {}));
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => {
      m.set(k, v);
    },
  };
}

test("switcher: defaults to L (Arc) with no storage or no saved value", () => {
  assert.equal(readVariant(null), "L");
  assert.equal(readVariant(fakeStorage()), "L");
});

test("switcher: dropdown lists layouts alphabetically", () => {
  const labels = VARIANTS.map((v) => v.label);
  assert.deepEqual(labels, [...labels].sort());
});

test("switcher: renders a trigger chip showing the current layout, closed", () => {
  const html = variantSwitchHtml("J");
  assert.match(html, /js-variant-trigger/, "has a trigger button");
  assert.match(html, /aria-expanded="false"/, "starts closed");
  assert.ok(html.includes("Contrast"), "trigger shows the current layout label");
});

test("switcher: popover holds one tile per variant, current one marked", () => {
  const html = variantSwitchHtml("J");
  for (const v of VARIANTS) {
    assert.ok(
      html.includes(`data-id="${v.id}"`),
      `tile present for ${v.label}`,
    );
    assert.ok(html.includes(`>${v.label}<`), `label present for ${v.label}`);
  }
  const tiles = (html.match(/js-variant-tile/g) || []).length;
  assert.equal(tiles, VARIANTS.length, "one tile per variant");
  assert.match(html, /data-id="J"[^>]*aria-checked="true"/, "current variant marked checked");
});

test("switcher: persists the chosen variant and reads it back", () => {
  const storage = fakeStorage();
  writeVariant(storage, "E");
  assert.equal(storage.getItem(VARIANT_STORAGE_KEY), "E");
  assert.equal(readVariant(storage), "E");
});

test("switcher: invalid saved value falls back to L", () => {
  assert.equal(readVariant(fakeStorage({ [VARIANT_STORAGE_KEY]: "Z" })), "L");
});

test("switcher: a throwing storage never throws out", () => {
  const broken: StorageLike = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(readVariant(broken), "L");
  assert.doesNotThrow(() => writeVariant(broken, "B"));
});
