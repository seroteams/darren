// The Error log's pure row vocabulary (audit-fixes-jul-25 Phase 6). DOM-free and CSS-free so
// it runs under `node --test` — admin-error-log.ts imports its stylesheet at module top, which
// makes the stage itself unimportable in a test. Same split as members-table.ts /
// member-home-view.ts / start-rows.ts.

// The table cell shows the HEAD of the message, not all of it. A failed insert arrives as
// `Failed query: insert into "people" ("id", "org_id", … ) values (default, $1, …` — one row
// could carry thousands of characters, and 103 issues rendered a ~10,000px page holding 3.3
// million characters, which is not a thing anyone can scan. The rule is deliberately dumb so
// it is predictable: first line, capped, cut on a word boundary when there is a sensible one.
// Nothing is lost: the opened detail prints the whole message verbatim.
export const HEAD_CAP = 100;

export function messageHead(message: string): string {
  const firstLine = String(message ?? "").split("\n")[0]!.trim();
  if (firstLine.length <= HEAD_CAP) return firstLine;
  const cut = firstLine.slice(0, HEAD_CAP);
  const lastSpace = cut.lastIndexOf(" ");
  // Only break on a space if it isn't so early that the head becomes uselessly short —
  // a message with no spaces at all (a dumped token) must not shrink to nothing.
  const body = lastSpace > HEAD_CAP * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.trimEnd()}…`;
}

/** How many issues render at once. 103 issues used to paint as one endless page. */
export const PAGE_SIZE = 50;

/** The slice for `page` (0-based), clamped so a stale page can never blank the table —
 *  switching a filter while on page 3 of a list that is now one page long. */
export function pageSlice<T>(items: T[], page: number): { rows: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safe = Math.min(Math.max(0, page), pages - 1);
  return { rows: items.slice(safe * PAGE_SIZE, safe * PAGE_SIZE + PAGE_SIZE), page: safe, pages };
}
