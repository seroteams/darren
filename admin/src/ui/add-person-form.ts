// Pure field logic for the "Add someone" modal — no DOM, no CSS, so it runs under
// `node --test`. The modal (add-person-modal.ts) imports these; the test imports them
// straight (the DOM/CSS module can't be loaded by node).

export type PersonDraft = { name: string; role: string; seniority: string };

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
