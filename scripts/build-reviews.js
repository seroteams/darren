// Regenerate static review pages for runs.
//
//   node scripts/build-reviews.js            # every run + rebuild logs/index.html
//   node scripts/build-reviews.js <runId>    # just that run + rebuild the index
//
// Read-only over the engine: it only reads existing log files and writes
// review.html / index.html. A broken run logs a warning and is skipped — it
// never aborts the batch.

const path = require("node:path");
const { writeReviewHtml, writeIndexHtml, walkRunDirs } = require("../backend/engine/review-html.ts");

function main() {
  const target = process.argv[2];
  const runs = walkRunDirs();
  const selected = target ? runs.filter((r) => r.id === target) : runs;

  if (target && selected.length === 0) {
    console.error(`No run found with id "${target}".`);
    process.exit(1);
  }

  let ok = 0;
  for (const r of selected) {
    try {
      const out = writeReviewHtml(r.dir);
      ok += 1;
      console.log(`✓ ${path.relative(process.cwd(), out)}`);
    } catch (e) {
      console.warn(`✗ ${r.id}: ${e.message}`);
    }
  }

  const indexPath = writeIndexHtml();
  console.log(`\n${ok}/${selected.length} review pages written.`);
  console.log(`Index: ${path.relative(process.cwd(), indexPath)}`);
}

main();
