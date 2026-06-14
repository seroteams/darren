// In-app regression check. Runs the offline replay suite (the deterministic
// trust gates re-graded on frozen runs) and returns results for the Regression
// screen. No model calls — same engine as `npm run replay`.

const { runSuite } = require("../../../scripts/lib/replay-suite");

function run(c) {
  const { verdict, summary, results } = runSuite();
  const cases = results.map((r) => ({
    id: r.id,
    name: r.name,
    meetingType: r.meetingType,
    issue: r.issue || null,
    kind: r.kind,
    status: r.status,
    verdict: r.verdict,
    expectedVerdict: r.expectedVerdict,
    hardFails: r.hardFails || [],
    reasons: r.reasons || [],
    error: r.error || null,
  }));
  return c.json(200, { verdict, summary, cases });
}

module.exports = { run };
