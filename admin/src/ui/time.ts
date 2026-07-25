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

// The list vocabulary: relative inside the week, then the one date format. One copy
// for Home and Past 1:1s, which each hand-rolled their own (home-screen-truth P1).
export function whenLabel(ms: number): string {
  if (!ms) return "";
  const days = (Date.now() - ms) / 86_400_000;
  return days < 7 ? relTime(ms) : formatDate(ms);
}

// One vocabulary per COLUMN, not per row (audit F11). Row-by-row, a list ends up with
// "5d ago" sitting directly above "Fri 17 Jul 2026", and you cannot compare two rows
// without doing arithmetic. So the whole list decides together: everything relative only
// while every entry is inside the week, otherwise everything absolute.
export function whenLabelsFor(list: readonly number[]): (ms: number) => string {
  const stamps = list.filter((ms) => Boolean(ms) && !Number.isNaN(ms));
  const now = Date.now();
  const allThisWeek = stamps.length > 0 && stamps.every((ms) => (now - ms) / 86_400_000 < 7);
  return (ms: number) => (!ms ? "" : allThisWeek ? relTime(ms) : formatDate(ms));
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
