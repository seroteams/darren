// Shared time helpers. relTime: "just now" / "5m ago" / "3h ago" / "2d ago".
// One copy for every stage (was hand-rolled in compare, runs, team, person-detail).

// The one date format everywhere (DESIGN.md rule 9): "Mon 18 Nov 2024".
// Hand-built from fixed English names so the browser's locale can't vary it.
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatDate(ms: number): string {
  if (!ms || Number.isNaN(ms)) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function relTime(ms: number): string {
  if (!ms) return "";
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}
