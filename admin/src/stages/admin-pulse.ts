// The founder Pulse dashboard (admin-live-deploy Phase 3; design-consolidation P6) — the
// one-screen view of the live site the superadmin lands on: the Gate-1 "came back
// unprompted" number, managers, run volume and type mix, where runs break off, guests,
// errors and the latest feedback. ONE time-range control (7/30/90 days) governs every
// windowed number — GET /api/v1/admin/pulse?days=N recomputes them server-side, so no
// tile keeps a private window (the two cumulative numbers, Gate 1 and the manager/guest
// headcounts, say "all time" on their face). Every KPI tile shares one anatomy — label,
// value, delta chip, caption — and is a button opening its drill-down list
// (pulse-drilldowns). The managers list rides the global um-table skin. Superadmin-gated
// (a normal owner gets 403 → the fetch throws).

import { STAGES } from "../state.js";
import type { StageName } from "../state.js";
import { escapeHtml } from "../ui/html.js";
import { prettyType, prettyStage, activeLabel, dateLabel } from "../ui/pulse-labels.ts";
import { createSkeleton } from "../ui/skeleton.js";
import type { Mount } from "./stage.types.ts";

type PulseManager = {
  id: string;
  name: string;
  company: string;
  runCount: number;
  lastActiveAt: string | number | null;
  firstRunAt: string | number | null;
  cameBack: boolean;
  gapDays: number | null;
  status: "back" | "once" | "none" | "internal";
};
type Pulse = {
  rangeDays: number;
  gate1: { cameBack: number; total: number; triedInRange: number };
  managersOnLive: number;
  managersNewInRange: number;
  runsInRange: number;
  runsPrevRange: number;
  ratings: { avgStars: number | null; ratedCount: number; lowCount: number; prevAvgStars: number | null };
  guestCount: number;
  guestsInRange: number;
  guestsPrevRange: number;
  runsPerDay: number[];
  runTypeMix: { type: string; count: number }[];
  dropOffs: { stage: string; count: number }[];
  errors: { total: number; unresolved: number; prevTotal: number };
  latestFeedback: { message: string; verdict: string | null; runId: string | null }[];
  managers: PulseManager[];
};

type RangeDays = 7 | 30 | 90;
const RANGES: RangeDays[] = [7, 30, 90];
// The picked window survives leaving and returning to the dashboard within a session.
let currentDays: RangeDays = 7;

// The one API read. shared/api.js getPulse() predates the range knob; the query
// string is this screen's own concern, so the fetch lives here (same superadmin
// gate server-side — a non-superadmin response throws into the error card).
async function fetchPulse(days: RangeDays): Promise<Pulse> {
  const res = await fetch(`/api/v1/admin/pulse?days=${days}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Pulse;
}

// Scoped styling — mirrors the mock's `.lp-` prototype so the live screen reads the same.
const STYLE = `
  .lp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--sero-space-3); flex-wrap:wrap; }
  .lp-head__text { min-width: 0; }
  .lp-range { display:inline-flex; flex:none; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-input); overflow:hidden; }
  .lp-range__btn { font:inherit; font-size:14px; font-weight:500; padding:6px 14px; background:none; border:none; cursor:pointer; color:var(--color-ink-dim); white-space:nowrap; }
  .lp-range__btn + .lp-range__btn { border-left:1px solid var(--color-border); }
  .lp-range__btn[aria-pressed="true"] { background:var(--color-accent-soft); color:var(--color-accent-dark); font-weight:600; }
  .lp-range__btn:focus-visible { outline:2px solid var(--color-accent); outline-offset:-2px; }
  .lp-tiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(10.5rem, 1fr)); gap:var(--sero-space-3); }
  .lp-tile { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-card); padding:var(--sero-space-4); }
  /* Each tile is a button opening its drill-down list (pulse-drilldowns). Affordance is a
     border darken + surface tint per DESIGN.md — shadows stay reserved for detached elements. */
  button.lp-tile { display:block; width:100%; font:inherit; color:inherit; text-align:left; cursor:pointer; }
  button.lp-tile:hover { border-color:var(--color-ink-dim); background:var(--color-surface-2); }
  button.lp-tile:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }
  .lp-tile--hero { border-color:var(--sero-mint-700); background:linear-gradient(0deg, var(--sero-mint-100), var(--color-surface) 70%); }
  button.lp-tile--hero:hover { border-color:var(--sero-mint-700); background:linear-gradient(0deg, var(--sero-mint-100), var(--color-surface) 70%); filter:brightness(0.98); }
  /* The one tile anatomy (design-consolidation P6, D7): label / value / delta chip / caption. */
  .lp-tile__label { font-size:14px; font-weight:500; color:var(--color-ink-dim); }
  .lp-tile__value { font-family:var(--type-family-display); font-size:30px; font-weight:600; line-height:1.15; font-variant-numeric:tabular-nums; }
  .lp-tile__value .lp-den { font-size:18px; font-weight:500; color:var(--color-ink-dim); }
  .lp-tile__delta { display:flex; align-items:baseline; flex-wrap:wrap; gap:4px 6px; margin:4px 0 2px; font-size:14px; color:var(--color-ink-dim); }
  .lp-delta { display:inline-block; border-radius:9999px; padding:1px 10px; font-size:14px; font-weight:600; white-space:nowrap; background:var(--color-page); color:var(--color-ink-dim); border:1px solid var(--color-border); }
  .lp-delta--pos { background:var(--sero-mint-100); color:var(--color-positive-text); border-color:transparent; }
  .lp-delta--neg { background:var(--sero-coral-100); color:var(--color-negative-text); border-color:transparent; }
  .lp-tile__note { font-size:14px; color:var(--color-ink-dim); }
  .lp-down { color:var(--color-negative-text); font-weight:600; }
  .lp-wide { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr); gap:var(--sero-space-3); align-items:start; }
  .lp-colstack { display:flex; flex-direction:column; gap:var(--sero-space-3); min-width:0; }
  @media (max-width: 1100px) { .lp-wide { grid-template-columns:1fr; } }
  .lp-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-card); padding:var(--sero-space-4); }
  .lp-card__head { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
  .lp-card h3 { font-size:16px; font-weight:600; margin:0; }
  .lp-card .lp-hnote { font-size:14px; color:var(--color-ink-dim); margin:2px 0 12px; }
  .lp-viewall { font:inherit; font-size:14px; font-weight:500; background:none; border:none; cursor:pointer; color:var(--sero-link); white-space:nowrap; padding:0; }
  .lp-viewall:hover { text-decoration:underline; }
  .lp-spark { width:100%; height:88px; display:block; }
  .lp-bar { display:grid; grid-template-columns:6.5rem 1fr 1.5rem; align-items:center; gap:10px; font-size:14px; margin-top:8px; }
  .lp-bar__name { color:var(--color-ink-dim); font-weight:500; }
  .lp-bar__track { background:var(--color-page); border-radius:4px; height:13px; overflow:hidden; }
  .lp-bar__fill { height:100%; border-radius:4px; background:var(--color-accent); opacity:.85; }
  .lp-bar__fill--warn { background:var(--sero-gold-700); }
  .lp-bar__n { text-align:right; font-variant-numeric:tabular-nums; font-weight:600; }
  .lp-pill { display:inline-block; border-radius:9999px; padding:1px 10px; font-size:14px; font-weight:600; white-space:nowrap; }
  .lp-pill--back { background:var(--sero-mint-100); color:var(--color-positive-text); }
  .lp-pill--once { background:var(--sero-gold-100); color:var(--sero-gold-900); }
  .lp-pill--none { background:var(--color-page); color:var(--color-ink-dim); border:1px solid var(--color-border); font-weight:500; }
  .lp-pill--gone { background:var(--sero-coral-100); color:var(--color-negative-text); }
  .lp-who { display:flex; align-items:center; gap:10px; white-space:nowrap; }
  .lp-avatar { display:inline-flex; align-items:center; justify-content:center; flex:none; width:30px; height:30px; border-radius:9999px; background:var(--sero-primary-200); color:var(--color-accent-dark); font-size:14px; font-weight:600; }
  .lp-who .lp-co { display:block; font-size:14px; color:var(--color-ink-dim); }
  .lp-feed { display:flex; flex-direction:column; gap:12px; }
  .lp-feed__item { display:flex; gap:12px; align-items:flex-start; }
  .lp-feed__meta { font-size:14px; color:var(--color-ink-dim); margin-top:1px; }
  .lp-empty { font-size:14px; color:var(--color-ink-dim); }
`;

const initials = (name: string) => name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
const statusPill = (m: PulseManager) => {
  const label = m.status === "back" ? (m.gapDays != null ? `came back · ${m.gapDays}d` : "came back")
    : m.status === "once" ? "ran once"
    : "no runs yet";
  return `<span class="lp-pill lp-pill--${m.status === "back" ? "back" : m.status === "once" ? "once" : "none"}">${label}</span>`;
};
const verdictPill = (v: string | null) =>
  v === "yes" ? `<span class="lp-pill lp-pill--back">helpful</span>`
  : v === "no" ? `<span class="lp-pill lp-pill--gone">off the mark</span>`
  : `<span class="lp-empty">note</span>`;

// --- the one KPI tile anatomy (D7): label / value / delta chip / caption -------
const chip = (kind: "pos" | "neg" | "flat", text: string) =>
  `<span class="lp-delta lp-delta--${kind}">${text}</span>`;
// Movement vs the previous equal window. For errors, down is the good direction.
function deltaVs(cur: number, prev: number, goodWhenDown = false): string {
  if (cur === prev) return chip("flat", "no change");
  const up = cur > prev;
  return chip(up !== goodWhenDown ? "pos" : "neg", `${up ? "↑" : "↓"} ${Math.abs(cur - prev)}`);
}

type TileSpec = { cls: string; hero?: boolean; label: string; valueHtml: string; chipHtml: string; chipNote: string; captionHtml: string };
function tile(t: TileSpec): string {
  return `
    <button type="button" class="lp-tile${t.hero ? " lp-tile--hero" : ""} ${t.cls}">
      <div class="lp-tile__label">${t.label}</div>
      <div class="lp-tile__value">${t.valueHtml}</div>
      <div class="lp-tile__delta">${t.chipHtml}<span>${t.chipNote}</span></div>
      <div class="lp-tile__note">${t.captionHtml}</div>
    </button>`;
}

// Runs-per-day sparkline as an inline SVG (area + line + last-point dot).
function sparkline(series: number[], days: number): string {
  const w = 560, h = 88, pad = 8;
  const max = Math.max(1, ...series);
  const n = Math.max(1, series.length - 1);
  const pts = series.map((v, i) => [(i / n) * w, h - pad - (v / max) * (h - 2 * pad)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1] ?? [w, h - pad];
  return `<svg class="lp-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Runs per day, last ${days} days">
    <line x1="0" y1="${h - pad}" x2="${w}" y2="${h - pad}" stroke="var(--color-border)" stroke-width="1"/>
    <polygon points="0,${h - pad} ${line} ${w},${h - pad}" fill="var(--sero-primary-200)"/>
    <polyline points="${line}" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="var(--color-accent-dark)"/>
  </svg>`;
}

function render(root: HTMLElement, p: Pulse, go: (stage: StageName) => void, setRange: (d: RangeDays) => void): void {
  const days = p.rangeDays;
  const inLast = `in the last ${days} days`;
  const vsPrev = `vs previous ${days} days`;
  const typeMixNote = p.runTypeMix.length
    ? escapeHtml(p.runTypeMix.map((t) => `${t.count} ${prettyType(t.type).toLowerCase()}`).join(" · "))
    : "no runs in this window";
  const dropMax = Math.max(1, ...p.dropOffs.map((d) => d.count));

  const ratingChip = (): string => {
    if (p.ratings.avgStars == null) return chip("flat", "none rated");
    if (p.ratings.prevAvgStars == null) return chip("flat", "no earlier ratings");
    const diff = Math.round((p.ratings.avgStars - p.ratings.prevAvgStars) * 10) / 10;
    if (diff === 0) return chip("flat", "no change");
    return chip(diff > 0 ? "pos" : "neg", `${diff > 0 ? "↑" : "↓"} ${Math.abs(diff).toFixed(1)}`);
  };

  const tiles = [
    tile({
      cls: "js-tile-gate1", hero: true,
      label: "Came back unprompted",
      valueHtml: `${p.gate1.cameBack} <span class="lp-den">of ${p.gate1.total}</span>`,
      chipHtml: p.gate1.triedInRange > 0 ? chip("pos", `+${p.gate1.triedInRange} first preps`) : chip("flat", "no first preps"),
      chipNote: inLast,
      captionHtml: "Gate 1, all time. A second prep within 14 days, unprompted",
    }),
    tile({
      cls: "js-tile-managers",
      label: "Managers on live",
      valueHtml: `${p.managersOnLive}`,
      chipHtml: p.managersNewInRange > 0 ? chip("pos", `+${p.managersNewInRange} new`) : chip("flat", "none new"),
      chipNote: inLast,
      captionHtml: "external managers, all time",
    }),
    tile({
      cls: "js-tile-runs",
      label: "Runs",
      valueHtml: `${p.runsInRange}`,
      chipHtml: deltaVs(p.runsInRange, p.runsPrevRange),
      chipNote: vsPrev,
      captionHtml: typeMixNote,
    }),
    tile({
      cls: "js-tile-ratings",
      label: "Recap rating",
      valueHtml: p.ratings.avgStars == null ? "–" : p.ratings.avgStars.toFixed(1),
      chipHtml: ratingChip(),
      chipNote: vsPrev,
      captionHtml: `${p.ratings.ratedCount} rated${p.ratings.lowCount > 0 ? ` · <span class="lp-down">${p.ratings.lowCount} low</span>` : ""}`,
    }),
    tile({
      cls: "js-tile-guests",
      label: "Guest runs",
      valueHtml: `${p.guestsInRange}`,
      chipHtml: deltaVs(p.guestsInRange, p.guestsPrevRange),
      chipNote: vsPrev,
      captionHtml: `tried it without an account · ${p.guestCount} all time`,
    }),
    tile({
      cls: "js-tile-errors",
      label: "Errors",
      valueHtml: `${p.errors.total}`,
      chipHtml: deltaVs(p.errors.total, p.errors.prevTotal, true),
      chipNote: vsPrev,
      captionHtml: p.errors.unresolved > 0 ? `<span class="lp-down">${p.errors.unresolved} unresolved</span>` : "0 unresolved",
    }),
  ].join("");

  const rangeControl = `
    <div class="lp-range" role="group" aria-label="Time range">
      ${RANGES.map((d) => `<button type="button" class="lp-range__btn js-range" data-days="${d}" aria-pressed="${d === days}">${d} days</button>`).join("")}
    </div>`;

  root.innerHTML = `
    <style>${STYLE}</style>
    <div class="l-container l-container--wide l-stack l-stack--4">
      <header class="page-header lp-head">
        <div class="lp-head__text">
          <h1 class="h1">Live pulse</h1>
          <p class="text-ink-dim">The live site right now. Managers, runs, who came back, what broke. Internal Sero accounts are counted separately.</p>
        </div>
        ${rangeControl}
      </header>

      <div class="lp-tiles">${tiles}</div>

      <div class="lp-wide">
        <div class="lp-colstack">
          <div class="lp-card">
            <div class="lp-card__head"><h3>Runs per day</h3></div>
            <p class="lp-hnote">Last ${days} days · external managers only</p>
            ${sparkline(p.runsPerDay, days)}
          </div>
          <div class="lp-card">
            <div class="lp-card__head"><h3>Managers</h3><button type="button" class="lp-viewall js-all-managers">View all →</button></div>
            <p class="lp-hnote">Everyone registered on live. Click for their full record</p>
            ${p.managers.length ? `<div class="um-table-wrap"><table class="um-table">
              <thead><tr><th>Manager</th><th>Runs</th><th>Last active</th><th>First run</th><th>Status</th></tr></thead>
              <tbody>
              ${p.managers.map((m) => `
                <tr class="um-row" data-manager="${escapeHtml(m.id)}">
                  <td><span class="lp-who"><span class="lp-avatar">${escapeHtml(initials(m.name))}</span><span>${escapeHtml(m.name)}<span class="lp-co">${escapeHtml(m.company)}</span></span></span></td>
                  <td class="num">${m.runCount}</td>
                  <td>${escapeHtml(activeLabel(m.lastActiveAt))}</td>
                  <td><span class="lp-empty">${escapeHtml(dateLabel(m.firstRunAt))}</span></td>
                  <td>${statusPill(m)}</td>
                </tr>`).join("")}
              </tbody>
            </table></div>` : `<p class="lp-empty">No external managers on live yet.</p>`}
          </div>
        </div>
        <div class="lp-colstack">
          <div class="lp-card">
            <div class="lp-card__head"><h3>Where runs break off</h3></div>
            <p class="lp-hnote">Unfinished runs by step · last ${days} days</p>
            ${p.dropOffs.length ? p.dropOffs.map((d) => `
              <div class="lp-bar"><span class="lp-bar__name">${escapeHtml(prettyStage(d.stage))}</span>
                <div class="lp-bar__track"><div class="lp-bar__fill${d.count >= dropMax ? " lp-bar__fill--warn" : ""}" style="width:${Math.round((d.count / dropMax) * 100)}%"></div></div>
                <span class="lp-bar__n">${d.count}</span></div>`).join("") : `<p class="lp-empty">No unfinished runs. Everyone reached their recap.</p>`}
          </div>
          <div class="lp-card">
            <div class="lp-card__head"><h3>Latest feedback</h3><button type="button" class="lp-viewall js-all-feedback">View all →</button></div>
            <p class="lp-hnote">Straight from the thumbs on live recaps</p>
            ${p.latestFeedback.length ? `<div class="lp-feed">
              ${p.latestFeedback.map((f) => `
                <div class="lp-feed__item">
                  ${verdictPill(f.verdict)}
                  <div><div>${escapeHtml(f.message)}</div></div>
                </div>`).join("")}
            </div>` : `<p class="lp-empty">No feedback yet.</p>`}
          </div>
        </div>
      </div>
    </div>`;

  // The one time-range control — every tile and chart above re-reads on change.
  root.querySelectorAll<HTMLButtonElement>(".js-range").forEach((b) =>
    b.addEventListener("click", () => {
      const d = Number(b.dataset.days) as RangeDays;
      if (RANGES.includes(d) && d !== days) setRange(d);
    }));

  // Every KPI tile opens its drill-down list (pulse-drilldowns) — three list pages,
  // three existing screens.
  root.querySelector(".js-tile-gate1")?.addEventListener("click", () => go(STAGES.ADMIN_GATE1));
  root.querySelector(".js-tile-managers")?.addEventListener("click", () => go(STAGES.ADMIN_REGISTERED));
  root.querySelector(".js-tile-runs")?.addEventListener("click", () => go(STAGES.ADMIN_RUNS));
  root.querySelector(".js-tile-ratings")?.addEventListener("click", () => go(STAGES.ADMIN_RATINGS));
  root.querySelector(".js-tile-guests")?.addEventListener("click", () => go(STAGES.ADMIN_GUEST_RUNS));
  root.querySelector(".js-tile-errors")?.addEventListener("click", () => go(STAGES.ADMIN_ERROR_LOG));

  // Every "view all" + a manager row goes to the matching existing screen (drill-ins = Phase 4).
  root.querySelector(".js-all-managers")?.addEventListener("click", () => go(STAGES.ADMIN_REGISTERED));
  root.querySelector(".js-all-feedback")?.addEventListener("click", () => go(STAGES.ADMIN_FEEDBACK));
  root.querySelectorAll<HTMLElement>("[data-manager]").forEach((el) =>
    el.addEventListener("click", () => go(STAGES.ADMIN_REGISTERED)));
}

export const mount: Mount = async (root, { setState }) => {
  const go = (stage: StageName) => setState({ stage });

  const load = async () => {
    root.replaceChildren(createSkeleton(5));
    try {
      const p = await fetchPulse(currentDays);
      render(root, p, go, (d) => { currentDays = d; void load(); });
    } catch {
      root.innerHTML = `
        <div class="l-container l-container--wide l-stack l-stack--4">
          <header class="page-header"><h1 class="h1">Live pulse</h1></header>
          <section class="card-flat l-stack l-stack--2">
            <div class="eyebrow">Couldn't load</div>
            <p class="text-ink-dim">Something went wrong loading the pulse. Please try again.</p>
            <button type="button" class="btn btn--ghost js-retry">Try again</button>
          </section>
        </div>`;
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    }
  };
  await load();
};
