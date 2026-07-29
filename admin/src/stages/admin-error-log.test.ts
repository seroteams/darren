import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { messageHead, pageSlice, HEAD_CAP, PAGE_SIZE } from "./admin-error-log-rows.ts";

// audit-fixes-jul-25 Phase 6 — the screen you open when something is on fire becomes
// readable. Measured on 25 Jul: 103 issues rendered a ~10,000px page carrying 3.3 million
// characters, most of it raw SQL in the "What went wrong" cell.
//
// The pure pieces are tested here; mount() is browser-only, so the wiring is guarded
// against the source text (same approach as auth-screens.test.ts / main.test.ts).

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "admin-error-log.ts"), "utf8");

// ── messageHead: the table shows the head, never the whole dump ──────────────────

test("a short message is left exactly as it is", () => {
  assert.equal(messageHead("Cannot read properties of null"), "Cannot read properties of null");
});

test("a failed insert is cut down to something scannable", () => {
  const sql =
    'Failed query: insert into "people" ("id", "org_id", "manager_id", "name", "role", "seniority", "user_id") values (default, $1, $2, $3, $4, $5, $6) returning "id", "org_id"';
  const head = messageHead(sql);
  assert.ok(head.length <= HEAD_CAP + 1, `head is capped (got ${head.length})`);
  assert.ok(head.startsWith("Failed query: insert into"), "keeps the part that says what broke");
  assert.ok(head.endsWith("…"), "says out loud that it was cut");
  assert.ok(!head.includes("returning"), "the tail is gone");
});

test("only the first line survives: a stack-shaped message stops at line one", () => {
  const head = messageHead("Boom\n    at foo (bar.ts:1:1)\n    at baz (qux.ts:2:2)");
  assert.equal(head, "Boom");
});

test("the cut lands on a word boundary when there is a sensible one", () => {
  const words = `${"alpha ".repeat(30)}omega`;
  const head = messageHead(words);
  assert.ok(!/\salpha?…$/.test(head) || head.endsWith("alpha…"), "does not cut mid-word");
  assert.ok(head.endsWith("…"));
});

test("one unbroken token is cut hard rather than shrunk to nothing", () => {
  // No spaces at all: breaking on the last space would leave an empty head.
  const head = messageHead("x".repeat(400));
  assert.equal(head.length, HEAD_CAP + 1, "capped, plus the ellipsis");
});

test("a null or empty message never throws", () => {
  assert.equal(messageHead(""), "");
  assert.equal(messageHead(undefined as unknown as string), "");
  assert.equal(messageHead(null as unknown as string), "");
});

// ── pageSlice: 103 issues stop being one endless page ────────────────────────────

test("a list shorter than a page is one page, untouched", () => {
  const { rows, page, pages } = pageSlice([1, 2, 3], 0);
  assert.deepEqual(rows, [1, 2, 3]);
  assert.equal(pages, 1);
  assert.equal(page, 0);
});

test("103 issues page at 50, and the last page holds the remainder", () => {
  const items = Array.from({ length: 103 }, (_, i) => i);
  const first = pageSlice(items, 0);
  assert.equal(first.pages, 3);
  assert.equal(first.rows.length, PAGE_SIZE);
  assert.equal(first.rows[0], 0);
  const last = pageSlice(items, 2);
  assert.equal(last.rows.length, 3, "103 - 100");
  assert.equal(last.rows[0], 100);
});

test("a stale page number is clamped, never a blank table", () => {
  const items = Array.from({ length: 60 }, (_, i) => i);
  // Was on page 3, then a filter cut the list to 2 pages.
  const { rows, page, pages } = pageSlice(items, 9);
  assert.equal(pages, 2);
  assert.equal(page, 1, "clamped to the last real page");
  assert.ok(rows.length > 0, "rows still render");
  assert.equal(pageSlice(items, -5).page, 0, "negative clamps to the first page");
});

// ── the wiring the pure pieces cannot prove ──────────────────────────────────────

test("the table cell renders the head; the detail renders the whole message", () => {
  assert.match(SRC, /class="el-msg__text"[^>]*>\$\{escapeHtml\(messageHead\(row\.message\)\)\}/, "cell is the head");
  assert.match(SRC, /<pre class="el-stack el-msg-full">\$\{escapeHtml\(row\.message\)\}<\/pre>/, "detail is verbatim");
});

test("the full message shows even when there IS a stack, so truncating loses nothing", () => {
  // The old detail printed the message ONLY when there was no stack. Once the table stops
  // showing the whole message, that would have made it unreachable for any error with one.
  assert.ok(!SRC.includes("${stack ? `<pre class=\"el-stack\">${escapeHtml(stack)}</pre>` : `<div class=\"el-detail__msg\">"),
    "the either/or branch is gone");
  const msgAt = SRC.indexOf("el-stack el-msg-full");
  const stackAt = SRC.indexOf("${stack ? `<pre class=\"el-stack\">");
  assert.ok(msgAt > -1 && stackAt > -1, "both blocks present");
  assert.ok(msgAt < stackAt, "the message reads first, the stack follows");
});

test("search filters every issue in the view, not just the painted page", () => {
  // With paging in, a hidden-toggle over painted rows would have searched 50 of 103 and
  // still called the count honest.
  assert.match(SRC, /const shown = q\s*\n?\s*\? afterTab\.filter/, "search is part of the filter chain");
  assert.ok(!SRC.includes("applySearch"), "the old painted-rows search is gone");
  assert.match(SRC, /search\.setSelectionRange/, "the caret goes back after the repaint");
});

test("every filter and the search reset to page 1", () => {
  assert.equal((SRC.match(/page = 0/g) ?? []).length, 4, "filters, search, load reset, and the declaration");
});

test("the pager only renders when there is more than one page", () => {
  assert.match(SRC, /if \(pages <= 1\) return "";/);
});
