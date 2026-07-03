// Group a member's own finished 1:1s into people (pre-go-live PG4). Keys on a normalized
// name (trim + lower-case) so "Priya" and "priya" fold into one card; keeps the first-seen
// display name and the freshest role. Rolls up how many times met, when last met, and the
// average usefulness (from PG3 star ratings) with its count. Sorted most-recently-met first.
// Pure + side-effect free, so the person page (PG5) reuses it over the same /runs/mine payload.

// The one place the person key is defined — trim + lower-case, so "Priya" / " priya "
// fold together. Exported so the person page (PG5) filters runs on the exact same key
// the grouping uses (no drift between the Team card and its page).
export function personKeyOf(name) {
  return String(name ?? "").trim().toLowerCase();
}

export function groupRunsByPerson(runs) {
  const map = new Map();
  for (const r of runs || []) {
    const name = String(r?.ctx?.name ?? "").trim();
    if (!name) continue; // a run with no person name can't be grouped
    const key = personKeyOf(name);
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
      name: p.name,
      role: p.role,
      count: p.count,
      lastMet: p.lastMet,
      ratedCount: p.ratedCount,
      avgStars: p.ratedCount ? p.starSum / p.ratedCount : null,
    }))
    .sort((a, b) => b.lastMet - a.lastMet);
}
