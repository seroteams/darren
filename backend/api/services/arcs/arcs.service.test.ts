import { test } from "node:test";
import assert from "node:assert/strict";
import { createArcsService } from "./arcs.service.ts";
import type { ArcsRepo, ArcData, DiffResult } from "./arcs.repo.ts";
import type { MeetingType } from "../../../engine/one-on-one-types/_shared/meeting-type.types.ts";
import { isObjectRecord } from "../../../shared/guards.ts";

// One canned type + its merged arc. serialize reads t.slug/t.label from the type
// and tone_register/anti_patterns/arc from getArc, so the two are kept consistent.
const TYPE: MeetingType = {
  slug: "bi_weekly",
  label: "Bi-weekly",
  tone_register: "warm",
  arc: [{ id: "open", label: "Open", intent: "warm up", target_questions: 2 }],
  anti_patterns: ["no surprises"],
  prompts: {},
};
const ARC_DATA: ArcData = {
  slug: "bi_weekly",
  tone_register: "warm",
  arc: [{ id: "open", label: "Open", intent: "warm up", target_questions: 2 }],
  anti_patterns: ["no surprises"],
};
const NO_DIFF: DiffResult = { intro: 0, openers: 0, total: 0, removed_ids: [] };
const VALID_PHASE = { id: "open", label: "Open", intent: "warm up", target_questions: 2 };

interface Calls {
  write: Array<{ slug: string; data: unknown }>;
  remove: string[];
}

// A fake repo records its writes/removes and returns canned reads — proving the
// service's logic (serialise, validate, orphan branch) is independent of storage.
function fakeRepo(over: Partial<ArcsRepo> = {}): { repo: ArcsRepo; calls: Calls } {
  const calls: Calls = { write: [], remove: [] };
  const repo: ArcsRepo = {
    listTypes: () => [TYPE],
    getArc: () => ARC_DATA,
    hasOverlay: () => true,
    writeOverlay: (slug, data) => {
      calls.write.push({ slug, data });
    },
    removeOverlay: (slug) => {
      calls.remove.push(slug);
    },
    diffStageIds: () => NO_DIFF,
    ...over,
  };
  return { repo, calls };
}

// Run fn and report the HTTP status of whatever it throws (undefined if it didn't).
function thrownStatus(fn: () => unknown): number | undefined {
  try {
    fn();
    return undefined;
  } catch (e) {
    return isObjectRecord(e) && typeof e.status === "number" ? e.status : undefined;
  }
}

test("list serialises every type (edited flag + field defaults)", () => {
  const { repo } = fakeRepo();
  assert.deepEqual(createArcsService(repo).list(), {
    arcs: [
      {
        slug: "bi_weekly",
        label: "Bi-weekly",
        edited: true,
        tone_register: "warm",
        anti_patterns: ["no surprises"],
        arc: [{ id: "open", label: "Open", intent: "warm up", target_questions: 2 }],
      },
    ],
  });
});

test("save rejects a non-array arc with 400", () => {
  const { repo } = fakeRepo();
  assert.equal(thrownStatus(() => createArcsService(repo).save("bi_weekly", { arc: "nope" })), 400);
});

test("save rejects an arc that fails validation with 400", () => {
  const { repo } = fakeRepo();
  assert.equal(
    thrownStatus(() =>
      createArcsService(repo).save("bi_weekly", { arc: [{ id: "", label: "", target_questions: -1 }] })
    ),
    400
  );
});

test("save with orphaned questions and no confirm returns needsConfirm (no write)", () => {
  const diff: DiffResult = { intro: 2, openers: 1, total: 3, removed_ids: ["old"] };
  const { repo, calls } = fakeRepo({ diffStageIds: () => diff });
  const out = createArcsService(repo).save("bi_weekly", { arc: [VALID_PHASE] });
  assert.deepEqual(out, {
    needsConfirm: true,
    warning:
      'Removing or renaming "old" would orphan 3 questions (2 intro, 1 opener) — they\'d no longer route to a phase. Save anyway?',
    orphans: diff,
  });
  assert.equal(calls.write.length, 0);
});

test("save with confirm writes the overlay (normalised) and returns ok", () => {
  const diff: DiffResult = { intro: 2, openers: 1, total: 3, removed_ids: ["old"] };
  const { repo, calls } = fakeRepo({ diffStageIds: () => diff });
  const out = createArcsService(repo).save("bi_weekly", {
    arc: [VALID_PHASE],
    confirm: true,
    tone_register: "new tone",
    anti_patterns: ["a ", " ", "b"],
  });
  assert.deepEqual(calls.write, [
    {
      slug: "bi_weekly",
      data: { arc: [VALID_PHASE], tone_register: "new tone", anti_patterns: ["a", "b"] },
    },
  ]);
  assert.ok("ok" in out && out.ok === true);
});

test("save with no orphans writes without needing confirm", () => {
  const { repo, calls } = fakeRepo();
  const out = createArcsService(repo).save("bi_weekly", { arc: [VALID_PHASE] });
  assert.equal(calls.write.length, 1);
  assert.ok("ok" in out && out.ok === true);
});

test("save rejects an invalid slug with 404", () => {
  const { repo } = fakeRepo();
  assert.equal(thrownStatus(() => createArcsService(repo).save("BAD!", { arc: [VALID_PHASE] })), 404);
});

test("save returns 404 when the type is unknown (getArc throws)", () => {
  const { repo } = fakeRepo({
    getArc: () => {
      throw new Error("unknown");
    },
  });
  assert.equal(thrownStatus(() => createArcsService(repo).save("ghosttype", { arc: [VALID_PHASE] })), 404);
});

test("reset removes the overlay and returns the serialised arc", () => {
  const { repo, calls } = fakeRepo();
  const out = createArcsService(repo).reset("bi_weekly");
  assert.deepEqual(calls.remove, ["bi_weekly"]);
  assert.equal(out.ok, true);
});

test("reset returns 404 for an unknown slug", () => {
  const { repo } = fakeRepo();
  assert.equal(thrownStatus(() => createArcsService(repo).reset("ghosttype")), 404);
});
