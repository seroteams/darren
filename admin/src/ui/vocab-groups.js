// Group a flat terminology list into display sections for "the language of this
// role". Sections come out in the order the role declared its groups; any term
// with no group (or an unknown one) — e.g. a user-added word — lands in a
// trailing section with label null. Empty sections are dropped. Pure data: the
// caller renders the rows (the run screen and the lexicons page draw them
// differently), so this only decides the buckets and their order.
export function groupTerms(terms, groups) {
  const list = Array.isArray(terms) ? terms : [];
  const declared = Array.isArray(groups) ? groups : [];
  const sections = declared.map((g) => ({ key: g.key, label: g.label, rows: [] }));
  const byKey = new Map(sections.map((s) => [s.key, s]));
  const ungrouped = { key: null, label: null, rows: [] };
  for (const t of list) {
    const bucket = (t && t.group && byKey.get(t.group)) || ungrouped;
    bucket.rows.push(t);
  }
  const out = sections.filter((s) => s.rows.length);
  if (ungrouped.rows.length) out.push(ungrouped);
  return out;
}

// True when at least one real (labelled) group is present — i.e. show the
// grouped layout. Otherwise the caller falls back to the original flat list.
export function isGrouped(sections) {
  return sections.some((s) => s.label);
}
