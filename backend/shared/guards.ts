// Small shared type guards, previously copy-pasted across many backend modules.
// Keep these trivial and dependency-free — they're imported almost everywhere.

export function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

export function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}

export function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
