// The company-sector catalogue (2026-07-26). One shared list so the type-to-select box in
// the account page, the same box at signup, and the server-side check can never drift.
//
// CAPTURE ONLY. Nothing in the engine reads a sector yet: this exists so the field is
// being collected while the validation stage runs, and the engine wiring can be decided
// later on real data (committee, 2026-07-26).
//
// `id` is the stored value and must stay stable forever: it is the key a cached
// per-sector context block would later hang off. `label` is display text only and can
// be reworded freely. Adding a sector is safe; renaming an id is not.
//
// Order: alphabetical by label, because the box people type into filters as they go and
// an A to Z list is the one they can also scan. "Something else" is pinned last.

export interface SectorOption {
  /** Stored value. Stable, lower-kebab, never reused for a different meaning. */
  id: string;
  /** What the manager reads and types. Unique, so typing can never be ambiguous. */
  label: string;
}

export const SECTORS: readonly SectorOption[] = [
  { id: "accounting", label: "Accounting and audit" },
  { id: "advertising", label: "Advertising and marketing" },
  { id: "aerospace", label: "Aerospace and defence" },
  { id: "agriculture", label: "Agriculture and farming" },
  { id: "architecture", label: "Architecture and urban design" },
  { id: "ai", label: "Artificial intelligence and machine learning" },
  { id: "automotive", label: "Automotive" },
  { id: "aviation", label: "Aviation and airlines" },
  { id: "banking", label: "Banking" },
  { id: "beauty", label: "Beauty and personal care" },
  { id: "biotech", label: "Biotechnology" },
  { id: "care-services", label: "Care and social services" },
  { id: "non-profit", label: "Charity and non-profit" },
  { id: "chemicals", label: "Chemicals and materials" },
  { id: "cleantech", label: "Clean energy and renewables" },
  { id: "cloud", label: "Cloud and infrastructure" },
  { id: "construction", label: "Construction" },
  { id: "consulting", label: "Consulting and strategy" },
  { id: "consumer-goods", label: "Consumer goods" },
  { id: "creative-agency", label: "Creative and design agencies" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "data-analytics", label: "Data and analytics" },
  { id: "delivery", label: "Delivery and last mile" },
  { id: "digital-health", label: "Digital health" },
  { id: "ecommerce", label: "Ecommerce and marketplaces" },
  { id: "education", label: "Education (schools and colleges)" },
  { id: "edtech", label: "Education technology" },
  { id: "energy", label: "Energy and utilities" },
  { id: "engineering", label: "Engineering services" },
  { id: "events", label: "Events and experiences" },
  { id: "facilities", label: "Facilities and property management" },
  { id: "faith", label: "Faith and community organisations" },
  { id: "fashion", label: "Fashion and apparel" },
  { id: "film-tv", label: "Film, TV and streaming" },
  { id: "financial-services", label: "Financial services" },
  { id: "fintech", label: "Fintech and payments" },
  { id: "food-drink", label: "Food and drink" },
  { id: "gaming", label: "Gaming and interactive entertainment" },
  { id: "public-sector", label: "Government and public sector" },
  { id: "grocery", label: "Grocery and supermarkets" },
  { id: "hardware", label: "Hardware and electronics" },
  { id: "healthcare", label: "Healthcare providers" },
  { id: "higher-education", label: "Higher education and research" },
  { id: "hospitality", label: "Hospitality and hotels" },
  { id: "hr-services", label: "HR and people services" },
  { id: "insurance", label: "Insurance" },
  { id: "investment", label: "Investment and asset management" },
  { id: "it-services", label: "IT services and support" },
  { id: "legal", label: "Legal services" },
  { id: "logistics", label: "Logistics and supply chain" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "market-research", label: "Market research and insight" },
  { id: "media", label: "Media and publishing" },
  { id: "medical-devices", label: "Medical devices" },
  { id: "mental-health", label: "Mental health and wellbeing" },
  { id: "mining", label: "Mining and metals" },
  { id: "music", label: "Music and audio" },
  { id: "oil-gas", label: "Oil and gas" },
  { id: "pharmaceuticals", label: "Pharmaceuticals" },
  { id: "private-equity", label: "Private equity and venture capital" },
  { id: "professional-services", label: "Professional services" },
  { id: "public-relations", label: "Public relations and communications" },
  { id: "rail", label: "Rail and public transport" },
  { id: "real-estate", label: "Real estate and property" },
  { id: "recruitment", label: "Recruitment and staffing" },
  { id: "restaurants", label: "Restaurants and food service" },
  { id: "retail", label: "Retail" },
  { id: "semiconductors", label: "Semiconductors" },
  { id: "shipping", label: "Shipping and freight" },
  { id: "software", label: "Software and SaaS" },
  { id: "sport", label: "Sport and fitness" },
  { id: "technology", label: "Technology" },
  { id: "telecoms", label: "Telecoms and networks" },
  { id: "transport", label: "Transport and mobility" },
  { id: "travel", label: "Travel and tourism" },
  { id: "veterinary", label: "Veterinary services" },
  { id: "waste", label: "Waste and recycling" },
  { id: "water", label: "Water and environment" },
  { id: "web3", label: "Web3, crypto and blockchain" },
  { id: "wholesale", label: "Wholesale and distribution" },
  // Pinned last on purpose: the catch-all belongs at the bottom, not filed under S.
  { id: "other", label: "Something else" },
];

/** True when `id` is one of the catalogue ids. Empty / unset is NOT "known" — the
 *  caller decides whether blank is allowed (for the org field, blank means not set). */
export function isKnownSector(id: string): boolean {
  return SECTORS.some((s) => s.id === id);
}

/** Turn what someone TYPED into a catalogue entry, or null when it matches nothing.
 *  Accepts either the label they read or a stored id, so a value written by the form and
 *  a value read back from the database both resolve. Blank is null, never a match. */
export function findSector(text: string | null | undefined): SectorOption | null {
  const needle = (text ?? "").trim().toLowerCase();
  if (!needle) return null;
  return SECTORS.find((s) => s.label.toLowerCase() === needle || s.id === needle) ?? null;
}

/** The label for a stored id, or "" when it is unset or no longer in the catalogue.
 *  The forms show a label and store an id, so this is the read half of that swap. */
export function sectorLabel(id: string | null | undefined): string {
  return SECTORS.find((s) => s.id === (id ?? "").trim())?.label ?? "";
}
