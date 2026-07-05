// Purge old error_logs rows (error-log Phase 4). Deletes rows older than RETENTION_DAYS
// (default 30) so the table never grows without bound. Run by hand:
//   node scripts/purge-error-logs.js
// Free — touches only Neon (a DELETE), no API / OpenAI. Set ERROR_LOG_RETENTION_DAYS to
// override the window; pass --dry to preview the count without deleting.

const { Pool } = require("pg");
try { process.loadEnvFile(); } catch { /* no .env — DATABASE_URL may be set another way */ }

const RETENTION_DAYS = Number(process.env.ERROR_LOG_RETENTION_DAYS || 30);
const DRY = process.argv.includes("--dry");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to purge (the app is file-backed).");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  if (DRY) {
    const { rows } = await pool.query("select count(*)::int as n from error_logs where created_at < $1", [cutoff]);
    console.log(`[dry] ${rows[0].n} error_logs row(s) are older than ${RETENTION_DAYS} days (before ${cutoff.toISOString()}) — none deleted.`);
  } else {
    const { rowCount } = await pool.query("delete from error_logs where created_at < $1", [cutoff]);
    console.log(`purged ${rowCount} error_logs row(s) older than ${RETENTION_DAYS} days (before ${cutoff.toISOString()}).`);
  }
  await pool.end();
})().catch((e) => { console.error("purge failed:", e.message); process.exit(1); });
