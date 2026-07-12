// "x ago" for table rows. Deterministic: callers pass `now` (epoch ms) so tests
// never race the clock. Beyond 14 days a relative time stops being useful, so it
// falls back to the house date format (12 Jul 2026).
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function timeAgo(value: string | number | null, now: number): string {
  if (value == null) return "—";
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return "—";
  const gap = now - ms;
  if (gap < MIN) return "just now";
  if (gap < HOUR) return `${Math.floor(gap / MIN)}m ago`;
  if (gap < DAY) return `${Math.floor(gap / HOUR)}h ago`;
  if (gap <= 14 * DAY) return `${Math.floor(gap / DAY)}d ago`;
  return new Date(ms).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).replace(",", "");
}
