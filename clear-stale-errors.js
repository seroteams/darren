// Mark the stale local error rows resolved (the app's own triage action, reversible).
// Nothing is deleted. --dry previews.
const { Pool } = require("pg");
try { process.loadEnvFile(); } catch {}
const DRY = process.argv.includes("--dry");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Stale = mid-edit hot-reload breakage (the identifiers all exist in current code),
// the overnight-QA synthetics, and the one-off nulls/timeouts from July builds.
// NOT included: the dev-id 500s (session mirror + Failed query), which were real.
const STALE = `environment = 'local' and resolved_at is null
  and message not like '%session mirror%'
  and message not like '%Failed query%'`;

(async () => {
  const { rows } = await pool.query(`select count(*)::int n from error_logs where ${STALE}`);
  console.log(`${rows[0].n} stale unresolved local row(s) match.`);
  if (DRY) { await pool.end(); return; }
  const r = await pool.query(`update error_logs set resolved_at = now() where ${STALE}`);
  console.log(`marked ${r.rowCount} resolved.`);
  const after = await pool.query(
    `select count(*) filter (where resolved_at is null)::int open,
            count(*)::int total from error_logs where environment = 'local'`);
  console.log(`local error log now: ${after.rows[0].open} open of ${after.rows[0].total} total.`);
  await pool.end();
})().catch((e) => { console.error("clear failed:", e.message); process.exit(1); });
