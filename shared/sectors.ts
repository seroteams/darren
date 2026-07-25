// The company-sector catalogue (2026-07-26). One shared list so the dropdown in the
// account page and the server-side check can never drift apart.
//
// CAPTURE ONLY. Nothing in the engine reads a sector yet: this exists so the field is
// being collected while the validation stage runs, and the engine wiring can be decided
// later on real data (committee, 2026-07-26).
//
// `id` is the stored value and must stay stable forever: it is the key a cached
// per-sector context block would later hang off. `label` is display text only and can
// be reworded freely. Adding a sector is safe; renaming an id is not.

export interface SectorOption {
  /** Stored value. Stable, lower-kebab, never reused for a different meaning. */
  id: string;
  /** What the manager reads in the dropdown. */
  label: string;
}

export const SECTORS: readonly SectorOption[] = [
  { id: "technology", label: "Software and technology" },
  { id: "financial-services", label: "Financial services" },
  { id: "healthcare", label: "Healthcare and life sciences" },
  { id: "education", label: "Education" },
  { id: "retail", label: "Retail and e-commerce" },
  { id: "manufacturing", label: "Manufacturing and engineering" },
  { id: "professional-services", label: "Professional services (consulting, legal, finance)" },
  { id: "media", label: "Media, marketing and creative" },
  { id: "public-sector", label: "Public sector and government" },
  { id: "non-profit", label: "Charity and non-profit" },
  { id: "hospitality", label: "Hospitality, travel and leisure" },
  { id: "construction", label: "Construction and property" },
  { id: "transport", label: "Transport and logistics" },
  { id: "energy", label: "Energy and utilities" },
  { id: "other", label: "Something else" },
];

/** True when `id` is one of the catalogue ids. Empty / unset is NOT "known" — the
 *  caller decides whether blank is allowed (for the org field, blank means not set). */
export function isKnownSector(id: string): boolean {
  return SECTORS.some((s) => s.id === id);
}
