// Shared prompt helpers used by every pipeline stage.

// Fill {{KEY}} placeholders from vars, in insertion order, one sequential
// replaceAll per key — the exact semantics of the chained .replaceAll() calls
// this replaces (so prompts stay byte-identical). Unknown placeholders are
// deliberately left in place; the templates fill some slots conditionally.
export function fillPlaceholders(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

interface SystemUserSplit {
  filled: string;
  system: string;
  user: string;
}

// Markdown prompt templates carry a "## System ... ## User ..." split. Given a
// template that has already had its {{PLACEHOLDERS}} filled, return the system
// and user halves (plus the filled text). If a half is missing, fall back to
// empty system / whole-template user so the caller still gets a usable prompt.
export function splitSystemUser(filled: string): SystemUserSplit {
  const systemMatch = filled.match(/## System\s+([\s\S]*?)\n## User/);
  const userMatch = filled.match(/## User\s+([\s\S]*)$/);
  return {
    filled,
    system: systemMatch?.[1]?.trim() ?? "",
    user: userMatch?.[1]?.trim() ?? filled,
  };
}
