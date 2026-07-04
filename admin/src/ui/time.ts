// Shared relative-time helper: "just now" / "5m ago" / "3h ago" / "2d ago".
// One copy for every stage (was hand-rolled in compare, runs, team, person-detail).
export function relTime(ms: number): string {
  if (!ms) return "";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}
