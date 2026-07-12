// Pure field logic for the team person modals (add / edit / delete-confirm) — no DOM,
// no CSS, so it runs under `node --test`. The modals import these; the test imports them
// straight (the DOM/CSS modules can't be loaded by node).

export type PersonDraft = { name: string; role: string; seniority: string };

/** Does the typed confirmation match the person's name? Trim + case-insensitive so the
 *  manager isn't fighting capitalisation, but still a deliberate re-type. Empty never
 *  matches (so the Delete button stays disabled until they actually type the name). */
export function nameMatches(typed: unknown, name: unknown): boolean {
  const a = String(typed ?? "").trim().toLowerCase();
  const b = String(name ?? "").trim().toLowerCase();
  return a.length > 0 && a === b;
}

/** Trim the raw form into a roster draft, or null when there's no usable name.
 *  Role and seniority are optional and pass through trimmed (empty string when blank). */
export function cleanPersonForm(input: {
  name?: unknown;
  role?: unknown;
  seniority?: unknown;
}): PersonDraft | null {
  const name = String(input.name ?? "").trim();
  if (!name) return null;
  return {
    name,
    role: String(input.role ?? "").trim(),
    seniority: String(input.seniority ?? "").trim(),
  };
}
