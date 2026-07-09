// Live/local database alignment (database-sync test). The pure rules for judging
// whether the local and live databases both carry the repo's migrations — including
// the 0012 alignment-probe marker row — kept free of I/O so they're provable
// offline, like evaluateEnvGuard. scripts/db-alignment-check.ts does the connecting.

/** What one database looks like when inspected read-only. */
export interface DbSnapshot {
  /** false when the connection itself failed — every dependent check then fails honestly. */
  reachable: boolean;
  /** The connection error message when unreachable. */
  error?: string;
  /** app_state "environment" row — "local" | "live" | null when never claimed. */
  envMarker: string | null;
  /** Rows in drizzle's migrations ledger; null when the ledger table doesn't exist yet. */
  migrationCount: number | null;
  /** created_at of the newest applied migration (= the journal's `when`); null when none. */
  migrationHeadWhen: number | null;
  /** Whether the app_state "alignment_probe" marker row exists. */
  probePresent: boolean;
}

/** What the repo says should be applied (read from migrations/meta/_journal.json). */
export interface RepoMigrations {
  count: number;
  headTag: string;
  headWhen: number;
}

export interface AlignmentCheck {
  name: string;
  ok: boolean;
  detail: string;
}

/** Judge both databases against the repo and each other. Fixed order, one row per rule. */
export function evaluateAlignment(input: {
  repo: RepoMigrations;
  local: DbSnapshot;
  live: DbSnapshot;
}): AlignmentCheck[] {
  const { repo, local, live } = input;
  const checks: AlignmentCheck[] = [
    ...checksForOneDb("local", local, repo),
    ...checksForOneDb("live", live, repo),
  ];

  const sameHead =
    local.reachable &&
    live.reachable &&
    local.migrationHeadWhen != null &&
    local.migrationHeadWhen === live.migrationHeadWhen;
  checks.push({
    name: "live and local: same migration head",
    ok: sameHead,
    detail: sameHead
      ? `both at ${repo.headTag}`
      : `local head ${String(local.migrationHeadWhen)} vs live head ${String(live.migrationHeadWhen)}`,
  });

  return checks;
}

function checksForOneDb(side: "local" | "live", db: DbSnapshot, repo: RepoMigrations): AlignmentCheck[] {
  const unreachable = `database unreachable: ${db.error ?? "connection failed"}`;

  const markerOk = db.reachable && db.envMarker === side;
  const migrationsOk =
    db.reachable && db.migrationCount === repo.count && db.migrationHeadWhen === repo.headWhen;

  return [
    {
      name: `${side}: reachable`,
      ok: db.reachable,
      detail: db.reachable ? "connected" : unreachable,
    },
    {
      name: `${side}: environment marker is "${side}"`,
      ok: markerOk,
      detail: !db.reachable
        ? unreachable
        : markerOk
          ? `marker = "${side}"`
          : db.envMarker == null
            ? "no marker — this database was never claimed (boot the app against it once)"
            : `marker says "${db.envMarker}" — wrong database for this environment`,
    },
    {
      name: `${side}: migrations match the repo`,
      ok: migrationsOk,
      detail: !db.reachable
        ? unreachable
        : migrationsOk
          ? `${repo.count} applied, head ${repo.headTag}`
          : db.migrationCount == null
            ? "no migrations ledger — this database was never migrated (run npm run db:migrate)"
            : `db has ${db.migrationCount} of ${repo.count} (repo head ${repo.headTag})`,
    },
    {
      name: `${side}: alignment probe row present`,
      ok: db.reachable && db.probePresent,
      detail: !db.reachable
        ? unreachable
        : db.probePresent
          ? "app_state.alignment_probe found"
          : "app_state.alignment_probe missing — the probe migration hasn't landed here",
    },
  ];
}
