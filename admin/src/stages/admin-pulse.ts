// The founder Pulse dashboard (admin-live-deploy Phase 3) — the one-screen view of the live
// site the superadmin lands on: the Gate-1 "came back unprompted" number, managers, run volume
// and type mix, where runs break off, guests, errors and the latest feedback. Wired to
// GET /api/v1/admin/pulse (superadmin-gated; a normal owner gets 403 → the fetch throws). Every
// card links to its existing "view all" screen — the manager/run drill-ins are Phase 4, so a
// manager row opens User management for now. Layout mirrors the walked mock on the Tests page.

import { STAGES } from "../state.js";
import type { StageName } from "../state.js";
import { getPulse } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime, formatDate } from "../ui/time.ts";
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
  gate1: { cameBack: number; total: number };
  managersOnLive: number;
  managersNewThisWeek: number;
  runsThisWeek: number;
  runsLastWeek: number;
  ratings: { avgStars: number | null; ratedCount: number; lowCount: number };
  guestCount: number;
  runsPerDay: number[];
  runTypeMix: { type: string; count: number }[];
  dropOffs: { stage: string; count: number }[];
  errors: { total: number; unresolved: number };
  latestFeedback: { message: string; verdict: string | null; runId: string | null }[];
  managers: PulseManager[];
};

// Scoped styling — mirrors the mock's `.lp-` prototype so the live screen reads the same.
const STYLE = `
  .lp-tiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(10.5rem, 1fr)); gap:var(--sero-space-3); }
  .lp-tile { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-card); padding:var(--sero-space-4); }
  .lp-tile--hero { border-color:var(--sero-mint-700); background:linear-gradient(0deg, var(--sero-mint-100), var(--color-surface) 70%); }
  .lp-tile__label { font-size:14px; font-weight:500; color:var(--color-ink-dim); }
  .lp-tile__value { font-family:var(--type-family-display); font-size:30px; font-weight:600; line-height:1.15; font-variant-numeric:tabular-nums; }
  .lp-tile__value .lp-den { font-size:18px; font-weight:500; color:var(--color-ink-dim); }
  .lp-tile__note { font-size:14px; color:var(--color-ink-dim); }
  .lp-up { color:var(--color-positive-text); font-weight:600; }
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
  .lp-table { width:100%; border-collapse:collapse; font-size:15px; }
  .lp-table th { text-align:left; font-size:14px; font-weight:600; color:var(--color-ink-dim); padding:6px 10px; border-bottom:1px solid var(--color-border); white-space:nowrap; }
  .lp-table td { padding:10px; border-bottom:1px solid var(--color-border); }
  .lp-table tr:last-child td { border-bottom:none; }
  .lp-table tr[data-link] { cursor:pointer; }
  .lp-table tr[data-link]:hover td { background:var(--color-surface-2); }
  .lp-scroll { overflow-x:auto; }
  .lp-pill { display:inline-block; border-radius:9999px; padding:1px 10px; font-size:14px; font-weight:600; white-space:nowrap; }
  .lp-pill--back { background:var(--sero-mint-100); color:var(--color-positive-text); }
  .lp-pill--once { background:var(--sero-gold-100); color:var(--sero-gold-900); }
  .lp-pill--none { background:var(--color-page); color:var(--color-ink-dim); border:1px solid var(--color-border); font-weight:500; }
  .lp-pill--gone { background:var(--sero-coral-100); color:var(--color-negative-text); }
  .lp-type { display:inline-block; border-radius:9999px; padding:1px 10px; font-size:14px; background:var(--sero-primary-200); color:var(--color-accent-dark); font-weight:600; white-space:nowrap; margin:0 6px 6px 0; }
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

// Prettify a raw meeting_type / stage code into a readable label.
const TYPE_LABELS: Record<string, string> = {
  first: "First 1:1", biweekly: "Bi-weekly", "bi-weekly": "Bi-weekly", weekly: "Weekly",
  monthly: "Monthly", "feels-off": "Feels-off", feels_off: "Feels-off", performance: "Performance",
};
const prettyType = (t: string) => TYPE_LABELS[t.toLowerCase()] ?? (t.charAt(0).toUpperCase() + t.slice(1));
const STAGE_LABELS: Record<string, string> = {
  intake: "Setting up", onepage: "Setting up", focus_points: "Focus", focus: "Focus",
  preparation: "Prep", bank: "Questions", questioning: "Questions", questions: "Questions",
  eval: "Evaluate", briefing: "Briefing", run_debrief: "Debrief", debrief: "Debrief",
};
const prettyStage = (s: string) => STAGE_LABELS[s.toLowerCase()] ?? (s.charAt(0).toUpperCase() + s.slice(1));

const activeLabel = (v: string | number | null): string => {
  if (v == null) return "no runs yet";
  const ms = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(ms) ? relTime(ms) : "no runs yet";
};
const dateLabel = (v: string | number | null): string => {
  if (v == null) return "—";
  const ms = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(ms) ? formatDate(ms) : "—";
};

// Runs-per-day sparkline as an inline SVG (area + line + last-point dot).
function sparkline(series: number[]): string {
  const w = 560, h = 88, pad = 8;
  const max = Math.max(1, ...series);
  const n = Math.max(1, series.length - 1);
  const pts = series.map((v, i) => [(i / n) * w, h - pad - (v / max) * (h - 2 * pad)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1] ?? [w, h - pad];
  return `<svg class="lp-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Runs per day, last 14 days">
    <line x1="0" y1="${h - pad}" x2="${w}" y2="${h - pad}" stroke="var(--color-border)" stroke-width="1"/>
    <polygon points="0,${h - pad} ${line} ${w},${h - pad}" fill="var(--sero-primary-200)"/>
    <polyline points="${line}" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="var(--color-accent-dark)"/>
  </svg>`;
}

function render(root: HTMLElement, p: Pulse, go: (stage: StageName) => void): void {
  const trend = (a: number, b: number) =>
    a > b ? `<span class="lp-up">↑${a - b}</span>` : a < b ? `<span class="lp-down">↓${b - a}</span>` : `<span class="lp-tile__note">—</span>`;
  const typeMixNote = p.runTypeMix.length
    ? p.runTypeMix.map((t) => `${t.count} ${prettyType(t.type).toLowerCase()}`).join(" · ")
    : "no runs yet";
  const dropMax = Math.max(1, ...p.dropOffs.map((d) => d.count));

  root.innerHTML = `
    <style>${STYLE}</style>
    <div class="l-container l-container--wide l-stack l-stack--4">
      <header class="page-header">
        <h1 class="h1">Live pulse</h1>
        <p class="text-ink-dim">The live site right now — managers, runs, who came back, what broke. Internal Sero accounts are counted separately.</p>
      </header>

      <div class="lp-tiles">
        <div class="lp-tile lp-tile--hero">
          <div class="lp-tile__label">Came back unprompted</div>
          <div class="lp-tile__value">${p.gate1.cameBack} <span class="lp-den">of ${p.gate1.total}</span></div>
          <div class="lp-tile__note">Gate 1 — a second prep within 14 days, unprompted</div>
        </div>
        <div class="lp-tile">
          <div class="lp-tile__label">Managers on live</div>
          <div class="lp-tile__value">${p.managersOnLive}</div>
          <div class="lp-tile__note">${p.managersNewThisWeek > 0 ? `<span class="lp-up">+${p.managersNewThisWeek} this week</span>` : "external managers"}</div>
        </div>
        <div class="lp-tile">
          <div class="lp-tile__label">Runs this week</div>
          <div class="lp-tile__value">${p.runsThisWeek}</div>
          <div class="lp-tile__note">last week ${p.runsLastWeek} ${trend(p.runsThisWeek, p.runsLastWeek)} · ${escapeHtml(typeMixNote)}</div>
        </div>
        <div class="lp-tile">
          <div class="lp-tile__label">Briefing rating</div>
          <div class="lp-tile__value">${p.ratings.avgStars == null ? "—" : p.ratings.avgStars.toFixed(1)}</div>
          <div class="lp-tile__note">${p.ratings.ratedCount} rated${p.ratings.lowCount > 0 ? ` · <span class="lp-down">${p.ratings.lowCount} low</span>` : ""}</div>
        </div>
        <div class="lp-tile">
          <div class="lp-tile__label">Guest runs</div>
          <div class="lp-tile__value">${p.guestCount}</div>
          <div class="lp-tile__note">tried it without an account</div>
        </div>
        <div class="lp-tile">
          <div class="lp-tile__label">Errors, 7 days</div>
          <div class="lp-tile__value">${p.errors.total}</div>
          <div class="lp-tile__note">${p.errors.unresolved > 0 ? `<span class="lp-down">${p.errors.unresolved} unresolved</span>` : "0 unresolved"}</div>
        </div>
      </div>

      <div class="lp-wide">
        <div class="lp-colstack">
          <div class="lp-card">
            <div class="lp-card__head"><h3>Runs per day</h3></div>
            <p class="lp-hnote">Last 14 days · external managers only</p>
            ${sparkline(p.runsPerDay)}
          </div>
          <div class="lp-card">
            <div class="lp-card__head"><h3>Managers</h3><button type="button" class="lp-viewall js-all-managers">View all →</button></div>
            <p class="lp-hnote">Everyone registered on live — click for their full record</p>
            ${p.managers.length ? `<div class="lp-scroll"><table class="lp-table">
              <tr><th>Manager</th><th>Runs</th><th>Last active</th><th>First run</th><th>Status</th></tr>
              ${p.managers.map((m) => `
                <tr data-link data-manager="${escapeHtml(m.id)}">
                  <td><span class="lp-who"><span class="lp-avatar">${escapeHtml(initials(m.name))}</span><span>${escapeHtml(m.name)}<span class="lp-co">${escapeHtml(m.company)}</span></span></span></td>
                  <td class="num">${m.runCount}</td>
                  <td>${escapeHtml(activeLabel(m.lastActiveAt))}</td>
                  <td><span class="lp-empty">${escapeHtml(dateLabel(m.firstRunAt))}</span></td>
                  <td>${statusPill(m)}</td>
                </tr>`).join("")}
            </table></div>` : `<p class="lp-empty">No external managers on live yet.</p>`}
          </div>
        </div>
        <div class="lp-colstack">
          <div class="lp-card">
            <div class="lp-card__head"><h3>Where runs break off</h3></div>
            <p class="lp-hnote">Unfinished runs by step · last 14 days</p>
            ${p.dropOffs.length ? p.dropOffs.map((d) => `
              <div class="lp-bar"><span class="lp-bar__name">${escapeHtml(prettyStage(d.stage))}</span>
                <div class="lp-bar__track"><div class="lp-bar__fill${d.count >= dropMax ? " lp-bar__fill--warn" : ""}" style="width:${Math.round((d.count / dropMax) * 100)}%"></div></div>
                <span class="lp-bar__n">${d.count}</span></div>`).join("") : `<p class="lp-empty">No unfinished runs — everyone reached their briefing.</p>`}
          </div>
          <div class="lp-card">
            <div class="lp-card__head"><h3>Latest feedback</h3><button type="button" class="lp-viewall js-all-feedback">View all →</button></div>
            <p class="lp-hnote">Straight from the thumbs on live briefings</p>
            ${p.latestFeedback.length ? `<div class="lp-feed">
              ${p.latestFeedback.map((f) => `
                <div class="lp-feed__item">
                  ${verdictPill(f.verdict)}
                  <div><div>${escapeHtml(f.message)}</div></div>
                </div>`).join("")}
            </div>` : `<p class="lp-empty">No feedback yet.</p>`}
          </div>
          <div class="lp-card">
            <div class="lp-card__head"><h3>Guests &amp; errors</h3></div>
            <p class="lp-hnote">The other two piles worth a glance</p>
            <div class="lp-bar"><span class="lp-bar__name">Guest runs</span><div class="lp-bar__track"></div><span class="lp-bar__n">${p.guestCount}</span></div>
            <p style="margin-top:10px"><button type="button" class="lp-viewall js-all-guests">See guest runs →</button> · <button type="button" class="lp-viewall js-all-errors">See error log →</button></p>
          </div>
        </div>
      </div>
    </div>`;

  // Every "view all" + a manager row goes to the matching existing screen (drill-ins = Phase 4).
  root.querySelector(".js-all-managers")?.addEventListener("click", () => go(STAGES.ADMIN_REGISTERED));
  root.querySelector(".js-all-feedback")?.addEventListener("click", () => go(STAGES.ADMIN_FEEDBACK));
  root.querySelector(".js-all-guests")?.addEventListener("click", () => go(STAGES.ADMIN_GUEST_RUNS));
  root.querySelector(".js-all-errors")?.addEventListener("click", () => go(STAGES.ADMIN_ERROR_LOG));
  root.querySelectorAll<HTMLElement>("[data-manager]").forEach((el) =>
    el.addEventListener("click", () => go(STAGES.ADMIN_REGISTERED)));
}

export const mount: Mount = async (root, { setState }) => {
  const go = (stage: StageName) => setState({ stage });
  root.replaceChildren(createSkeleton(5));

  const load = async () => {
    try {
      const p = (await getPulse()) as unknown as Pulse;
      render(root, p, go);
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
