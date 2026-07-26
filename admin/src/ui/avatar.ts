// The initials avatar (component-consolidation P2) — ONE place that turns a person's
// name into the glyph in their circle.
//
// This replaced nine hand-written helpers, and they had drifted into two families that
// disagreed about the same person:
//   • one letter  — the run/person avatar (Runs, Start, user detail, feedback, recap header,
//                   profile badge). Five near-identical copies of the same three lines.
//   • two letters — roster and table rows (Team, Members, Pulse). Two DIFFERENT copies:
//                   Pulse took the first letter of each word; team-card took the first
//                   letter of the first and last word.
//
// Both families are kept, because they are a real distinction: a single person's avatar is
// one letter, a row in a list of people is two. What is NOT kept is the disagreement inside
// the two-letter family. A one-word name used to render "KK" on Team and "K" on Pulse, for
// the same person. It is now "KE" in both: first two letters when there is one word, first
// and last initial when there are more.

/** Strip to the letters and digits we can actually show. Names carry hyphens and dots. */
function alnum(word: string): string {
  return word.replace(/[^a-z0-9]/gi, "");
}

/**
 * One letter, for a single person's avatar. "?" when there is nothing to show.
 * Accepts a name, or an email as a fallback source — pass whichever the caller has.
 */
export function initialOf(name: string | null | undefined): string {
  const s = (name || "").trim();
  return s ? s[0]!.toUpperCase() : "?";
}

/**
 * Up to two letters, for a row in a list of people. "?" when there is nothing to show.
 * "Priya Raman" → "PR" · "Keep" → "KE" · "qa-overnight" → "QA"
 */
export function initialsOf(name: string | null | undefined): string {
  const s = (name || "").trim();
  if (!s) return "?";
  const words = s.split(/\s+/).map(alnum).filter(Boolean);
  if (!words.length) return s.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}
