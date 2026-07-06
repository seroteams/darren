// Group a member's own finished 1:1s into people (pre-go-live PG4). Keys on a normalized
// name (trim + lower-case) so "Priya" and "priya" fold into one card; keeps the first-seen
// display name and the freshest role. Rolls up how many times met, when last met, and the
// average usefulness (from PG3 star ratings) with its count. Sorted most-recently-met first.
// Pure + side-effect free, so the person page (PG5) reuses it over the same /runs/mine payload.
//
// PG9: an optional `aliases` map ({ merges, names }) layers the manager's explicit overrides
// on top — `merges` folds one person's key into another's, `names` overrides a display name.
// Passing no aliases keeps the exact PG4 behaviour.

// The one place the person key is defined — trim + lower-case, so "Priya" / " priya "
// fold together. Exported so the person page (PG5) filters runs on the exact same key
// the grouping uses (no drift between the Team card and its page).
export function personKeyOf(name) {
  return String(name ?? "").trim().toLowerCase();
}

// Follow the merge chain to the canonical key (guarded against loops). Mirrors the server.
function resolveKey(merges, key) {
  let k = key;
  const seen = new Set();
  for (;;) {
    const next = merges && merges[k];
    if (!next || seen.has(k)) return k;
    seen.add(k);
    k = next;
  }
}

// The canonical person key for a run's name, after applying merges. The person page uses
// this so a merged person's page collects every run that folded into them.
export function canonicalKeyOf(name, aliases) {
  return resolveKey(aliases && aliases.merges, personKeyOf(name));
}

// people-roster Phase 4: the canonical key for one run — its personId (resolved through
// the roster's id-merges, so a run stamped with a since-merged person folds onto the
// canonical card) when the run carries one, the alias-resolved name-key otherwise.
// Exported so the person page filters runs on the exact same key the grouping uses.
export function runKeyOf(run, aliases, roster) {
  const personId = String(run?.personId ?? "").trim();
  if (personId) return resolveKey(roster && roster.merges, personId);
  return canonicalKeyOf(run?.ctx?.name ?? "", aliases);
}

// A run flagged `finished: false` is a started-but-unfinished prep (Team-for-managers):
// it puts the person on the Team (openCount) but doesn't count as a meeting — count,
// lastMet and the rating stay finished-only. Rows without the flag count as before.
// `roster` ({ people, merges } from /team/people) keys stamped runs on the roster
// identity and lets the roster row's name/role win over the runs' free-text snapshots.
export function groupRunsByPerson(runs, aliases, roster) {
  const names = (aliases && aliases.names) || {};
  const rosterById = new Map(((roster && roster.people) || []).map((p) => [p.id, p]));
  const map = new Map();
  for (const r of runs || []) {
    const name = String(r?.ctx?.name ?? "").trim();
    if (!name) continue; // a run with no person name can't be grouped
    const finished = r?.finished !== false;
    const key = runKeyOf(r, aliases, roster);
    let p = map.get(key);
    if (!p) {
      const rosterRow = rosterById.get(key);
      p = {
        key,
        personId: rosterRow ? key : String(r?.personId ?? "").trim() || null,
        rosterName: rosterRow ? String(rosterRow.name ?? "") : "",
        rosterRole: rosterRow ? String(rosterRow.role ?? "") : "",
        name,
        role: String(r?.ctx?.role ?? ""),
        count: 0, openCount: 0, lastMet: 0, lastSeen: 0, starSum: 0, ratedCount: 0,
      };
      map.set(key, p);
    }
    const seen = Number(r?.lastSeenAt) || 0;
    if (seen >= p.lastSeen) {
      p.lastSeen = seen;
      p.role = String(r?.ctx?.role ?? p.role); // show the most recent role
    }
    if (!finished) {
      p.openCount += 1;
      continue;
    }
    p.count += 1;
    if (seen >= p.lastMet) p.lastMet = seen;
    const stars = Number(r?.rating?.stars) || 0;
    if (stars >= 1 && stars <= 5) {
      p.starSum += stars;
      p.ratedCount += 1;
    }
  }
  return [...map.values()]
    .sort((a, b) => b.lastSeen - a.lastSeen) // newest activity first — met or just prepped
    .map((p) => ({
      key: p.key,
      personId: p.personId,
      // The roster row's name/role are the truth for stamped cards; an alias rename
      // wins for legacy name-keyed cards; else the run's own snapshot.
      name: p.rosterName || names[p.key] || p.name,
      role: p.rosterRole || p.role,
      count: p.count,
      openCount: p.openCount,
      lastMet: p.lastMet,
      ratedCount: p.ratedCount,
      avgStars: p.ratedCount ? p.starSum / p.ratedCount : null,
    }));
}

// Roster-driven Team (people-roster Phase 4). The Team page is now the real roster: one row
// per `people` row (so a name added with no 1:1 yet still shows), with run stats joined in by
// `personId`. `people` = the roster rows ({ id, name, role }); `runs` = the caller's runs, each
// carrying `personId`. A run whose personId isn't in the roster (a straggler predating the
// backfill) still gets a row, named from the run. Pure + side-effect free. Sort: freshest
// activity first, never-met people after, ties by name. Rows key on `personId` so the Team card
// and the person page agree without a name round-trip.
export function buildRosterView(people, runs) {
  const stats = new Map(); // personId -> rolled-up run stats
  for (const r of runs || []) {
    const pid = r?.personId;
    if (!pid) continue; // no link yet — can't join (post-backfill every run has one)
    let s = stats.get(pid);
    if (!s) {
      s = { name: String(r?.ctx?.name ?? ""), role: String(r?.ctx?.role ?? ""), count: 0, openCount: 0, lastMet: 0, lastSeen: 0, starSum: 0, ratedCount: 0 };
      stats.set(pid, s);
    }
    const seen = Number(r?.lastSeenAt) || 0;
    if (seen >= s.lastSeen) { s.lastSeen = seen; s.role = String(r?.ctx?.role ?? s.role); }
    if (r?.finished === false) { s.openCount += 1; continue; }
    s.count += 1;
    if (seen >= s.lastMet) s.lastMet = seen;
    const stars = Number(r?.rating?.stars) || 0;
    if (stars >= 1 && stars <= 5) { s.starSum += stars; s.ratedCount += 1; }
  }

  const row = (personId, name, role, s, userId = null) => ({
    key: personId,
    name,
    userId, // the linked member account, when the roster row carries one (Phase 5)
    role: role || (s ? s.role : ""),
    count: s ? s.count : 0,
    openCount: s ? s.openCount : 0,
    lastMet: s ? s.lastMet : 0,
    lastSeen: s ? s.lastSeen : 0,
    ratedCount: s ? s.ratedCount : 0,
    avgStars: s && s.ratedCount ? s.starSum / s.ratedCount : null,
    met: Boolean(s && s.count > 0),
  });

  const rosterIds = new Set();
  const rows = (people || []).map((p) => {
    rosterIds.add(p.id);
    return row(p.id, String(p?.name ?? ""), String(p?.role ?? ""), stats.get(p.id), p.userId ?? null);
  });
  for (const [pid, s] of stats) {
    if (!rosterIds.has(pid)) rows.push(row(pid, s.name || "(unnamed)", s.role, s)); // straggler
  }
  return rows.sort((a, b) => b.lastSeen - a.lastSeen || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
