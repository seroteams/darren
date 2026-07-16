// The returns report (audit X4 / X6) — turns the data Sero already holds into an answer to
// the Gate-1 question: "did a manager come back, unprompted, and prep another 1:1?"
//
// No new events table: a login is already an `auth_sessions` row (created_at), and every 1:1
// is a `sessions` row (created_at = intake start, completed_at = briefing). This module is
// PURE — the script (report-returns.ts) does the DB read and hands the rows in, so the
// aggregation is unit-testable with fixtures and never touches the network.

export type RunRow = {
  userId: string | null;
  createdAt: number; // ms — intake start
  completedAt: number | null; // ms — briefing finished (null = unfinished)
  finished: boolean;
};
export type LoginRow = { userId: string | null; createdAt: number };
export type ManagerRow = { id: string; name: string | null; email: string | null };

export type ManagerReturns = {
  name: string;
  email: string;
  daysActive: number; // distinct calendar days with a login or a 1:1
  runsStarted: number;
  runsFinished: number;
  firstSeen: number | null;
  lastSeen: number | null;
  gapDays: number[]; // days between each successive active day, newest gaps last
  medianPrepMinutes: number | null; // median intake-start → briefing across finished 1:1s
  returnedUnprompted: boolean; // active on 2+ distinct days = the Gate-1 signal
};

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (ms: number): number => Math.floor(ms / DAY_MS);

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

/** One row per manager who has any run or login, sorted most-recently-active first. */
export function buildReturnsReport(input: {
  runs: RunRow[];
  logins: LoginRow[];
  users: ManagerRow[];
}): ManagerReturns[] {
  const byId = new Map<string, ManagerRow>();
  for (const u of input.users) byId.set(u.id, u);

  // Gather every timestamp per manager (logins + run starts) to find active days + gaps.
  const activity = new Map<string, number[]>();
  const runsByUser = new Map<string, RunRow[]>();
  const push = (m: Map<string, number[]>, id: string | null, ts: number) => {
    if (!id) return;
    (m.get(id) ?? m.set(id, []).get(id)!).push(ts);
  };

  for (const l of input.logins) push(activity, l.userId, l.createdAt);
  for (const r of input.runs) {
    if (!r.userId) continue;
    push(activity, r.userId, r.createdAt);
    (runsByUser.get(r.userId) ?? runsByUser.set(r.userId, []).get(r.userId)!).push(r);
  }

  const out: ManagerReturns[] = [];
  for (const [id, stamps] of activity) {
    const runs = runsByUser.get(id) ?? [];
    const days = [...new Set(stamps.map(dayKey))].sort((a, b) => a - b);
    const gapDays = days.slice(1).map((d, i) => d - days[i]!);
    const prepMinutes = runs
      .filter((r) => r.completedAt != null && r.completedAt >= r.createdAt)
      .map((r) => Math.round((r.completedAt! - r.createdAt) / 60000));
    const u = byId.get(id);
    out.push({
      name: u?.name?.trim() || "(unknown)",
      email: u?.email?.trim() || id,
      daysActive: days.length,
      runsStarted: runs.length,
      runsFinished: runs.filter((r) => r.finished).length,
      firstSeen: stamps.length ? Math.min(...stamps) : null,
      lastSeen: stamps.length ? Math.max(...stamps) : null,
      gapDays,
      medianPrepMinutes: median(prepMinutes),
      returnedUnprompted: days.length >= 2,
    });
  }
  return out.sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
}

function fmtDate(ms: number | null): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  return `${day} ${mon} ${d.getUTCFullYear()}`;
}

/** A plain fixed-width table for the terminal. */
export function formatReturnsTable(rows: ManagerReturns[]): string {
  if (!rows.length) return "No managers with any activity yet.";
  const header = ["Manager", "Days", "Started", "Finished", "First seen", "Last seen", "Med. min/prep", "Returned?"];
  const body = rows.map((r) => [
    `${r.name} <${r.email}>`.slice(0, 34),
    String(r.daysActive),
    String(r.runsStarted),
    String(r.runsFinished),
    fmtDate(r.firstSeen),
    fmtDate(r.lastSeen),
    r.medianPrepMinutes == null ? "—" : String(r.medianPrepMinutes),
    r.returnedUnprompted ? "yes ✓" : "not yet",
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...body.map((row) => row[i]!.length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join("  ");
  const returned = rows.filter((r) => r.returnedUnprompted).length;
  return [
    line(header),
    widths.map((w) => "-".repeat(w)).join("  "),
    ...body.map(line),
    "",
    `${returned} of ${rows.length} manager(s) came back on 2+ separate days (the Gate-1 signal).`,
  ].join("\n");
}
