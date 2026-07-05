import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGuestCap, GUEST_CAP_MESSAGE } from "./guest-cap.ts";
import { HttpError } from "../../middleware/http-error.ts";

// Each test gets its own counter file — hermetic, no shared state on disk.
function tempFile(): string {
  return join(mkdtempSync(join(tmpdir(), "guest-cap-")), "guest-cap.json");
}

const DAY1 = Date.UTC(2026, 6, 5, 12, 0, 0); // 2026-07-05 noon UTC
const DAY2 = Date.UTC(2026, 6, 6, 12, 0, 0); // the next day

test("guest cap allows starts up to the limit, then refuses with the plain message", () => {
  const cap = createGuestCap({ file: tempFile(), limit: 2, now: () => DAY1 });
  cap.take();
  cap.take();
  assert.throws(() => cap.take(),
    (e: unknown) => e instanceof HttpError && e.status === 429 && e.message === GUEST_CAP_MESSAGE);
});

test("guest cap counter survives a restart (same file, fresh instance)", () => {
  const file = tempFile();
  createGuestCap({ file, limit: 1, now: () => DAY1 }).take();
  // "restart": a brand-new instance over the same file must see today's count
  const rebooted = createGuestCap({ file, limit: 1, now: () => DAY1 });
  assert.throws(() => rebooted.take(),
    (e: unknown) => e instanceof HttpError && e.status === 429);
});

test("guest cap resets on the next UTC day", () => {
  const file = tempFile();
  let clock = DAY1;
  const cap = createGuestCap({ file, limit: 1, now: () => clock });
  cap.take();
  assert.throws(() => cap.take(), (e: unknown) => e instanceof HttpError && e.status === 429);
  clock = DAY2; // midnight passed — fresh budget
  cap.take();
  const saved = JSON.parse(readFileSync(file, "utf8")) as { date: string; count: number };
  assert.equal(saved.date, "2026-07-06");
  assert.equal(saved.count, 1);
});

test("guest cap limit comes from GUEST_RUNS_PER_DAY, defaulting to 10", () => {
  const prev = process.env.GUEST_RUNS_PER_DAY;
  try {
    delete process.env.GUEST_RUNS_PER_DAY;
    const cap = createGuestCap({ file: tempFile(), now: () => DAY1 });
    for (let i = 0; i < 10; i++) cap.take(); // the documented default
    assert.throws(() => cap.take(), (e: unknown) => e instanceof HttpError && e.status === 429);

    process.env.GUEST_RUNS_PER_DAY = "1"; // env read per take — no restart needed
    const capped = createGuestCap({ file: tempFile(), now: () => DAY1 });
    capped.take();
    assert.throws(() => capped.take(), (e: unknown) => e instanceof HttpError && e.status === 429);
  } finally {
    if (prev === undefined) delete process.env.GUEST_RUNS_PER_DAY;
    else process.env.GUEST_RUNS_PER_DAY = prev;
  }
});

test("guest cap treats a corrupt counter file as empty rather than crashing", () => {
  const file = tempFile();
  writeFileSync(file, "not json at all");
  const cap = createGuestCap({ file, limit: 1, now: () => DAY1 });
  cap.take(); // recovers: today, count 1
  const saved = JSON.parse(readFileSync(file, "utf8")) as { date: string; count: number };
  assert.equal(saved.count, 1);
});
