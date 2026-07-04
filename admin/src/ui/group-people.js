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

export function groupRunsByPerson(runs, aliases) {
  const merges = (aliases && aliases.merges) || {};
  const names = (aliases && aliases.names) || {};
  const map = new Map();
  for (const r of runs || []) {
    const name = String(r?.ctx?.name ?? "").trim();
    if (!name) continue; // a run with no person name can't be grouped
    const key = resolveKey(merges, personKeyOf(name));
    let p = map.get(key);
    if (!p) {
      p = { key, name, role: String(r?.ctx?.role ?? ""), count: 0, lastMet: 0, starSum: 0, ratedCount: 0 };
      map.set(key, p);
    }
    p.count += 1;
    const seen = Number(r?.lastSeenAt) || 0;
    if (seen >= p.lastMet) {
      p.lastMet = seen;
      p.role = String(r?.ctx?.role ?? p.role); // show the most recent role
    }
    const stars = Number(r?.rating?.stars) || 0;
    if (stars >= 1 && stars <= 5) {
      p.starSum += stars;
      p.ratedCount += 1;
    }
  }
  return [...map.values()]
    .map((p) => ({
      key: p.key,
      name: names[p.key] || p.name, // an explicit rename wins over the first-seen name
      role: p.role,
      count: p.count,
      lastMet: p.lastMet,
      ratedCount: p.ratedCount,
      avgStars: p.ratedCount ? p.starSum / p.ratedCount : null,
    }))
    .sort((a, b) => b.lastMet - a.lastMet);
}
