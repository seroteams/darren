import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Flag,
  Home,
  ListChecks,
  MessageCircle,
  NotebookPen,
  RefreshCw,
  Repeat,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from "lucide";
import { icon } from "../../ui/icon.js";

export type ManagerWorkspaceSceneId =
  | "today" | "team" | "person" | "prepare" | "followthrough";

export const MANAGER_WORKSPACE_SCENES = [
  { id: "today", label: "Today", primaryTarget: "team" },
  { id: "team", label: "Team", primaryTarget: "person" },
  { id: "person", label: "Aisha", primaryTarget: "prepare" },
  { id: "prepare", label: "Prepare", primaryTarget: "followthrough" },
  { id: "followthrough", label: "Follow-through", primaryTarget: "today" },
] as const satisfies ReadonlyArray<{
  id: ManagerWorkspaceSceneId;
  label: string;
  primaryTarget: ManagerWorkspaceSceneId;
}>;

const SCENE_ICON: Record<ManagerWorkspaceSceneId, typeof Home> = {
  today: Home,
  team: Users,
  person: UserRound,
  prepare: NotebookPen,
  followthrough: RefreshCw,
};

// Feasibility overlay (Phase 2): tag an element as not-yet-real so the "Feasibility"
// control can outline it. "red" = nothing built behind it; "amber" = data/engine exists
// but isn't wired/shaped this way yet. `note` is the tiny corner tag shown when toggled on.
const gap = (tier: "red" | "amber", note: string): string =>
  `data-gap="${tier}" data-gap-note="${note}"`;

const STYLE = `
  .mw, .mw * { box-sizing:border-box; }
  .mw { min-height:720px; color:var(--color-ink); background:var(--color-page-bg);
    border:1px solid var(--color-border); border-radius:var(--radius-card); overflow:hidden; }
  .mw-shell { display:grid; grid-template-columns:220px minmax(0, 1fr); min-height:720px; }
  .mw-rail { background:var(--color-surface); border-right:1px solid var(--color-border);
    padding:var(--sero-space-6) var(--sero-space-4); display:flex; flex-direction:column; gap:var(--sero-space-8); }
  .mw-brand { display:flex; align-items:center; gap:var(--sero-space-3); font-family:var(--type-family-display);
    font-size:18px; font-weight:600; }
  .mw-brand__mark { width:32px; height:32px; border-radius:8px; display:grid; place-items:center;
    background:var(--color-ink); color:var(--color-surface); }
  .mw-nav { display:grid; gap:var(--sero-space-2); }
  .mw-nav__label, .mw-eyebrow { font-size:14px; font-weight:600; letter-spacing:.04em;
    text-transform:uppercase; color:var(--color-ink-dim); }
  .mw-nav__button { width:100%; min-height:44px; display:flex; align-items:center; gap:var(--sero-space-3);
    padding:0 var(--sero-space-3); border:0; border-radius:var(--radius-button); background:transparent;
    color:var(--color-ink-dim); font:inherit; font-size:15px; font-weight:500; cursor:pointer; text-align:left; }
  .mw-nav__button:hover { background:var(--sero-primary-100); color:var(--color-ink); }
  .mw-nav__button.is-active { background:var(--color-accent-soft); color:var(--color-accent-dark); }
  .mw-nav__button:focus-visible, .mw-button:focus-visible { outline:0; box-shadow:var(--shadow-focus); }
  .mw-rail__note { margin-top:auto; padding-top:var(--sero-space-4); border-top:1px solid var(--color-border);
    color:var(--color-ink-dim); font-size:14px; line-height:1.5; }
  .mw-main { min-width:0; padding:clamp(24px, 4vw, 56px); }
  .mw-page { max-width:1120px; margin:0 auto; display:grid; gap:var(--sero-space-8); }
  .mw-header { display:flex; justify-content:space-between; align-items:flex-end; gap:var(--sero-space-5); }
  .mw-title { margin:6px 0 0; font-family:var(--type-family-display); font-size:clamp(30px, 4vw, 44px);
    line-height:1.08; letter-spacing:-.02em; font-weight:600; }
  .mw-subtitle { margin:10px 0 0; color:var(--color-ink-dim); font-size:16px; line-height:1.55; }
  .mw-date { color:var(--color-ink-dim); font-size:14px; white-space:nowrap; }
  .mw-grid { display:grid; grid-template-columns:minmax(0, 1.65fr) minmax(260px, .75fr); gap:var(--sero-space-5); }
  .mw-stack { display:grid; gap:var(--sero-space-4); align-content:start; }
  .mw-card { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-6); }
  .mw-card--hero { padding:clamp(22px, 3vw, 34px); }
  .mw-card__top { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--sero-space-4); }
  .mw-kicker { display:flex; align-items:center; gap:var(--sero-space-2); color:var(--color-accent-dark);
    font-size:14px; font-weight:600; }
  .mw-person { display:flex; align-items:center; gap:var(--sero-space-4); margin:var(--sero-space-5) 0; }
  .mw-avatar { width:52px; height:52px; border-radius:9999px; display:grid; place-items:center;
    background:var(--sero-lavender-200); color:var(--sero-lavender-800); font-size:18px; font-weight:700; }
  .mw-avatar--large { width:72px; height:72px; font-size:24px; }
  .mw-person__name { font-family:var(--type-family-display); font-size:26px; font-weight:600; line-height:1.15; }
  .mw-person__role { margin-top:4px; color:var(--color-ink-dim); font-size:15px; }
  .mw-signal { display:flex; gap:var(--sero-space-3); padding:var(--sero-space-4);
    background:var(--sero-gold-100); border-radius:var(--radius-button); color:var(--sero-gold-900);
    font-size:15px; line-height:1.55; }
  .mw-signal svg { flex:none; margin-top:2px; }
  .mw-action-row { display:flex; align-items:center; justify-content:space-between; gap:var(--sero-space-4);
    margin-top:var(--sero-space-6); }
  .mw-meta { color:var(--color-ink-dim); font-size:14px; }
  .mw-button { min-height:42px; border:1px solid transparent; border-radius:var(--radius-button);
    padding:0 16px; display:inline-flex; align-items:center; justify-content:center; gap:var(--sero-space-2);
    background:var(--color-accent); color:var(--color-surface); font:inherit; font-size:15px;
    font-weight:600; cursor:pointer; }
  .mw-button:hover { background:var(--color-accent-dark); }
  .mw-section-title { margin:0; font-size:18px; font-weight:600; }
  .mw-list { display:grid; margin-top:var(--sero-space-4); }
  .mw-list__row { display:flex; align-items:flex-start; gap:var(--sero-space-3); padding:14px 0;
    border-top:1px solid var(--color-border); }
  .mw-list__row:first-child { border-top:0; padding-top:0; }
  .mw-list__icon { width:34px; height:34px; border-radius:9999px; display:grid; place-items:center;
    background:var(--sero-primary-100); color:var(--color-accent-dark); flex:none; }
  .mw-list__body { flex:1; min-width:0; }
  .mw-list__title { font-size:15px; font-weight:600; line-height:1.4; }
  .mw-list__meta { margin-top:3px; color:var(--color-ink-dim); font-size:14px; line-height:1.45; }
  .mw-status { flex:none; border-radius:9999px; padding:3px 9px; background:var(--sero-mint-100);
    color:var(--color-positive-text); font-size:14px; font-weight:600; }
  .mw-team-row { display:grid; grid-template-columns:44px minmax(0,1fr) auto; gap:var(--sero-space-3);
    align-items:center; padding:14px 0; border-top:1px solid var(--color-border); }
  .mw-team-row:first-child { border-top:0; }
  .mw-mini-avatar { width:40px; height:40px; border-radius:9999px; display:grid; place-items:center;
    background:var(--sero-soft-200); color:var(--color-ink); font-weight:600; }
  .mw-team-row__signal { font-size:14px; color:var(--color-ink-dim); text-align:right; }
  .mw-profile-head { display:flex; align-items:center; gap:var(--sero-space-5); }
  .mw-profile-head__text { flex:1; min-width:0; }
  .mw-profile-meta { display:flex; flex-wrap:wrap; gap:var(--sero-space-4); margin-top:8px;
    color:var(--color-ink-dim); font-size:14px; }
  .mw-context { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:var(--sero-space-3); }
  .mw-context__item { padding:var(--sero-space-4); background:var(--sero-primary-100);
    border-radius:var(--radius-button); }
  .mw-context__label { color:var(--color-ink-dim); font-size:14px; }
  .mw-context__value { margin-top:6px; font-size:15px; font-weight:600; line-height:1.4; }
  .mw-question { display:grid; grid-template-columns:32px minmax(0,1fr); gap:var(--sero-space-3);
    padding:16px 0; border-top:1px solid var(--color-border); }
  .mw-question:first-of-type { margin-top:var(--sero-space-3); }
  .mw-question__n { width:28px; height:28px; border-radius:9999px; display:grid; place-items:center;
    background:var(--color-ink); color:var(--color-surface); font-size:14px; font-weight:600; }
  .mw-question__text { font-size:16px; font-weight:600; line-height:1.45; }
  .mw-question__why { margin-top:5px; color:var(--color-ink-dim); font-size:14px; line-height:1.45; }
  .mw-note { width:100%; min-height:110px; resize:vertical; margin-top:var(--sero-space-3);
    border:1px solid var(--color-border); border-radius:var(--radius-input); padding:12px 14px;
    background:var(--color-surface); color:var(--color-ink); font:inherit; font-size:15px; line-height:1.5; }
  .mw-note:focus { outline:0; box-shadow:var(--shadow-focus); }
  .mw-commit { display:grid; gap:var(--sero-space-3); padding:14px 0;
    border-top:1px solid var(--color-border); }
  .mw-commit:first-child { border-top:0; padding-top:0; }
  .mw-field { width:100%; border:1px solid var(--color-border); border-radius:var(--radius-input);
    padding:10px 12px; background:var(--color-surface); color:var(--color-ink); font:inherit;
    font-size:15px; line-height:1.45; }
  .mw-field:focus { outline:0; box-shadow:var(--shadow-focus); }
  .mw-commit__meta { display:flex; flex-wrap:wrap; gap:var(--sero-space-3); }
  .mw-commit__meta .mw-field { flex:1; min-width:150px; }
  /* Feasibility overlay control + gap flags (Phase 2) */
  .mw-feas { position:relative; display:flex; justify-content:flex-end; margin-bottom:var(--sero-space-5); }
  .mw-feas__toggle { display:inline-flex; align-items:center; gap:var(--sero-space-2); min-height:36px;
    padding:0 12px; border:1px solid var(--color-border); border-radius:var(--radius-button);
    background:var(--color-surface); color:var(--color-ink-dim); font:inherit; font-size:14px;
    font-weight:600; cursor:pointer; }
  .mw-feas__toggle:hover { color:var(--color-ink); }
  .mw-feas__toggle:focus-visible { outline:0; box-shadow:var(--shadow-focus); }
  .mw-feas__menu { position:absolute; top:calc(100% + 6px); right:0; z-index:5; display:none;
    gap:var(--sero-space-2); padding:var(--sero-space-3); min-width:236px; background:var(--color-surface);
    border:1px solid var(--color-border); border-radius:var(--radius-card); }
  .mw-feas[data-open="true"] .mw-feas__menu { display:grid; }
  .mw-feas__opt { display:flex; align-items:center; gap:var(--sero-space-2); font-size:14px;
    color:var(--color-ink); cursor:pointer; }
  .mw-feas__opt input { width:16px; height:16px; flex:none; cursor:pointer; }
  .mw-feas__dot { width:12px; height:12px; border-radius:3px; flex:none; }
  .mw-feas__dot--red { background:var(--color-negative); }
  .mw-feas__dot--amber { background:var(--sero-gold-700); }
  .mw--gap-red [data-gap="red"], .mw--gap-amber [data-gap="amber"] { position:relative; border-radius:6px; }
  .mw--gap-red [data-gap="red"] { outline:2px solid var(--color-negative); outline-offset:2px; }
  .mw--gap-amber [data-gap="amber"] { outline:2px solid var(--sero-gold-700); outline-offset:2px; }
  .mw--gap-red [data-gap="red"]::after, .mw--gap-amber [data-gap="amber"]::after {
    content:attr(data-gap-note); position:absolute; top:-11px; right:0; z-index:2; padding:0 7px;
    border-radius:9999px; font-size:14px; font-weight:600; line-height:1.55; white-space:nowrap;
    pointer-events:none; }
  .mw--gap-red [data-gap="red"]::after { background:var(--sero-error-light); color:var(--color-negative-text); }
  .mw--gap-amber [data-gap="amber"]::after { background:var(--sero-gold-100); color:var(--sero-gold-900); }
  .mw-gapwrap { display:block; position:relative; }
  .mw-commit__meta .mw-gapwrap { flex:1; min-width:150px; }
  .mw-commit__meta .mw-gapwrap .mw-field { width:100%; min-width:0; }
  @media (max-width:760px) {
    .mw-shell { grid-template-columns:1fr; }
    .mw-rail { border-right:0; border-bottom:1px solid var(--color-border); padding:14px 16px; gap:12px; }
    .mw-brand, .mw-rail__note, .mw-nav__label { display:none; }
    .mw-nav { grid-template-columns:repeat(3, minmax(0,1fr)); }
    .mw-nav__button { justify-content:center; text-align:center; line-height:1.2; }
    .mw-main { padding:24px 16px 36px; }
    .mw-header { align-items:flex-start; flex-direction:column; }
    .mw-grid, .mw-context { grid-template-columns:1fr; }
    .mw-action-row { align-items:stretch; flex-direction:column; }
    .mw-button { width:100%; }
    .mw-profile-head { align-items:flex-start; flex-wrap:wrap; }
    .mw-commit__meta .mw-field, .mw-commit__meta .mw-gapwrap { flex-basis:100%; }
    .mw-feas__menu { right:auto; left:0; }
  }
  @media (prefers-reduced-motion:reduce) { .mw * { scroll-behavior:auto !important; } }
`;

const feasBar = () => `
  <div class="mw-feas" data-open="false">
    <button class="mw-feas__toggle" type="button" aria-haspopup="true" aria-expanded="false">
      ${icon(Flag, { size:15 })} Feasibility
    </button>
    <div class="mw-feas__menu" role="group" aria-label="Outline what isn't backed by real data yet">
      <label class="mw-feas__opt"><input type="checkbox" data-gap-toggle="red"><span class="mw-feas__dot mw-feas__dot--red"></span> Not built</label>
      <label class="mw-feas__opt"><input type="checkbox" data-gap-toggle="amber"><span class="mw-feas__dot mw-feas__dot--amber"></span> Have data, not wired</label>
    </div>
  </div>`;

const nav = (active: ManagerWorkspaceSceneId) => `
  <aside class="mw-rail">
    <div class="mw-brand"><span class="mw-brand__mark">S</span><span>Sero</span></div>
    <nav class="mw-nav" aria-label="Manager workspace">
      <span class="mw-nav__label">Workspace</span>
      ${MANAGER_WORKSPACE_SCENES.map((scene) => `
        <button class="mw-nav__button ${scene.id === active ? "is-active" : ""}" type="button"
          data-mw-scene="${scene.id}" ${scene.id === active ? 'aria-current="page"' : ""}>
          ${icon(SCENE_ICON[scene.id], { size:18 })}
          <span>${scene.label}</span>
        </button>`).join("")}
    </nav>
    <p class="mw-rail__note">A calm view of what matters before the next conversation.</p>
  </aside>`;

const todayPage = () => `
  <section class="mw-page" aria-labelledby="mw-today-title">
    <header class="mw-header">
      <div><div class="mw-eyebrow">Manager workspace</div><h1 class="mw-title" id="mw-today-title">Good morning, Carl.</h1>
        <p class="mw-subtitle">One conversation needs your attention today.</p></div>
      <div class="mw-date">${icon(CalendarDays, { size:16 })} Tue 14 Jul 2026</div>
    </header>
    <div class="mw-grid">
      <div class="mw-stack">
        <article class="mw-card mw-card--hero">
          <div class="mw-card__top"><span class="mw-kicker" ${gap("red", "not scheduled")}>${icon(Clock3, { size:17 })} Next 1:1 · 10:30</span><span class="mw-status">In 42 min</span></div>
          <div class="mw-person"><span class="mw-avatar">AR</span><div><div class="mw-person__name">Aisha Rahman</div><div class="mw-person__role" ${gap("red", "no join date")}>Product designer · 8 months on the team</div></div></div>
          <div class="mw-signal" ${gap("red", "no pattern detection")}>${icon(CircleAlert, { size:19 })}<span><strong>The pattern to notice:</strong> Aisha’s work is landing, but two recent reviews needed late rework. She also asked for clearer priorities last month.</span></div>
          <div class="mw-action-row"><span class="mw-meta">Aisha is flagged in your team</span><button class="mw-button" type="button" data-mw-scene="team">See your team ${icon(ArrowRight, { size:17 })}</button></div>
        </article>
        <article class="mw-card"><h2 class="mw-section-title">Team pulse</h2><div class="mw-list">
          <div class="mw-team-row"><span class="mw-mini-avatar">AR</span><div><div class="mw-list__title">Aisha Rahman</div><div class="mw-list__meta">Conversation today</div></div><span class="mw-team-row__signal" ${gap("red", "no signal")}>Needs context</span></div>
          <div class="mw-team-row"><span class="mw-mini-avatar">JL</span><div><div class="mw-list__title">Jon Lee</div><div class="mw-list__meta" ${gap("amber", "not surfaced here")}>Last spoke 6 days ago</div></div><span class="mw-team-row__signal" ${gap("red", "no signal")}>Steady</span></div>
          <div class="mw-team-row"><span class="mw-mini-avatar">MK</span><div><div class="mw-list__title">Maya K.</div><div class="mw-list__meta">New goal agreed</div></div><span class="mw-team-row__signal" ${gap("red", "no signal")}>On track</span></div>
        </div></article>
      </div>
      <aside class="mw-stack">
        <article class="mw-card"><h2 class="mw-section-title">Promises due</h2><div class="mw-list">
          <div class="mw-list__row"><span class="mw-list__icon">${icon(Check, { size:17 })}</span><div class="mw-list__body"><div class="mw-list__title">Share the Q3 design brief</div><div class="mw-list__meta" ${gap("red", "no due date")}>You · due before today’s 1:1</div></div></div>
          <div class="mw-list__row"><span class="mw-list__icon">${icon(Target, { size:17 })}</span><div class="mw-list__body"><div class="mw-list__title">Bring one critique example</div><div class="mw-list__meta">Aisha · agreed last time</div></div></div>
        </div></article>
        <article class="mw-card"><span class="mw-kicker">${icon(Sparkles, { size:17 })} Sero’s read</span><p class="mw-subtitle">Don’t make this a performance conversation. First understand where the late rework is coming from.</p></article>
      </aside>
    </div>
  </section>`;

const personPage = () => `
  <section class="mw-page" aria-labelledby="mw-person-title">
    <article class="mw-card mw-card--hero">
      <div class="mw-profile-head"><span class="mw-avatar mw-avatar--large">AR</span><div class="mw-profile-head__text"><div class="mw-eyebrow">Today · 10:30</div><h1 class="mw-title" id="mw-person-title">Aisha Rahman</h1><div class="mw-profile-meta"><span>Product designer</span><span ${gap("red", "no join date")}>Joined Nov 2025</span><span ${gap("amber", "not surfaced here")}>Last 1:1 · 15 days ago</span></div></div><button class="mw-button" type="button" data-mw-scene="prepare">Prepare 1:1 ${icon(ArrowRight, { size:17 })}</button></div>
    </article>
    <div class="mw-context">
      <div class="mw-context__item" ${gap("red", "no pattern detection")}><div class="mw-context__label">What’s working</div><div class="mw-context__value">Strong ownership of the checkout redesign</div></div>
      <div class="mw-context__item" ${gap("red", "no pattern detection")}><div class="mw-context__label">What changed</div><div class="mw-context__value">Two reviews needed late rework</div></div>
      <div class="mw-context__item"><div class="mw-context__label">Open promise</div><div class="mw-context__value">Bring one critique example today</div></div>
    </div>
    <div class="mw-grid">
      <article class="mw-card"><span class="mw-kicker">${icon(MessageCircle, { size:17 })} Conversation plan</span><h2 class="mw-section-title" style="margin-top:10px">Three useful questions</h2>
        <div class="mw-question"><span class="mw-question__n">1</span><div><div class="mw-question__text">What has felt harder than it should on the checkout work?</div><div class="mw-question__why" ${gap("amber", "rationale not emitted")}>Starts with her experience before naming the review pattern.</div></div></div>
        <div class="mw-question"><span class="mw-question__n">2</span><div><div class="mw-question__text">Where did the late rework begin: the brief, the first pass, or the review?</div><div class="mw-question__why" ${gap("amber", "rationale not emitted")}>Makes the problem concrete without assuming fault.</div></div></div>
        <div class="mw-question"><span class="mw-question__n">3</span><div><div class="mw-question__text">What clarity from me would help you get to the right shape sooner?</div><div class="mw-question__why" ${gap("amber", "rationale not emitted")}>Connects directly to her request for clearer priorities.</div></div></div>
      </article>
      <aside class="mw-stack">
        <article class="mw-card"><span class="mw-kicker">${icon(TrendingUp, { size:17 })} Growth thread</span><h2 class="mw-section-title" style="margin-top:10px">Lead a feature end to end</h2><p class="mw-subtitle" ${gap("amber", "no ‘current step’ field")}>Current step: shape the work before the first design review.</p></article>
        <article class="mw-card"><h2 class="mw-section-title">Private note</h2><textarea class="mw-note" ${gap("amber", "not wired here")} placeholder="What do you want to remember going in?"></textarea><p class="mw-list__meta">Prototype only · nothing is saved</p></article>
      </aside>
    </div>
  </section>`;

const teamPage = () => `
  <section class="mw-page" aria-labelledby="mw-team-title">
    <header class="mw-header">
      <div><div class="mw-eyebrow">Manager workspace</div><h1 class="mw-title" id="mw-team-title">Your team</h1>
        <p class="mw-subtitle">Grouped by what needs your attention — never by a hidden score.</p></div>
      <div class="mw-date">${icon(Users, { size:16 })} 6 people</div>
    </header>
    <article class="mw-card mw-card--hero">
      <div class="mw-card__top"><span class="mw-kicker" ${gap("red", "no attention signal")}>${icon(Flag, { size:17 })} Needs attention</span><span class="mw-status">1 today</span></div>
      <div class="mw-list">
        <div class="mw-team-row"><span class="mw-mini-avatar">AR</span><div><div class="mw-list__title">Aisha Rahman</div><div class="mw-list__meta" ${gap("red", "no pattern detection")}>Two reviews needed late rework · asked for clearer priorities</div></div><span class="mw-team-row__signal" ${gap("red", "not scheduled")}>1:1 at 10:30</span></div>
      </div>
      <div class="mw-action-row"><span class="mw-meta">One conversation to lead well this week</span><button class="mw-button" type="button" data-mw-scene="person">Open Aisha ${icon(ArrowRight, { size:17 })}</button></div>
    </article>
    <div class="mw-grid">
      <article class="mw-card"><h2 class="mw-section-title" ${gap("red", "no attention grouping")}>Steady</h2><div class="mw-list">
        <div class="mw-team-row"><span class="mw-mini-avatar">JL</span><div><div class="mw-list__title">Jon Lee</div><div class="mw-list__meta">Shipping to plan · last spoke 6 days ago</div></div><span class="mw-team-row__signal">Steady</span></div>
        <div class="mw-team-row"><span class="mw-mini-avatar">MK</span><div><div class="mw-list__title">Maya Kowalski</div><div class="mw-list__meta">New goal agreed last week</div></div><span class="mw-team-row__signal">On track</span></div>
        <div class="mw-team-row"><span class="mw-mini-avatar">PN</span><div><div class="mw-list__title">Priya Nair</div><div class="mw-list__meta">Led the pricing rollout end to end</div></div><span class="mw-team-row__signal">Thriving</span></div>
      </div></article>
      <aside class="mw-stack">
        <article class="mw-card"><h2 class="mw-section-title" ${gap("red", "no attention grouping")}>New to the team</h2><div class="mw-list">
          <div class="mw-team-row"><span class="mw-mini-avatar">SO</span><div><div class="mw-list__title">Sam Okafor</div><div class="mw-list__meta" ${gap("red", "no join date")}>Joined 3 weeks ago</div></div><span class="mw-team-row__signal">Settling in</span></div>
          <div class="mw-team-row"><span class="mw-mini-avatar">TA</span><div><div class="mw-list__title">Tom Alvarez</div><div class="mw-list__meta">First goal being shaped</div></div><span class="mw-team-row__signal">Onboarding</span></div>
        </div></article>
        <article class="mw-card"><span class="mw-kicker">${icon(Sparkles, { size:17 })} Sero’s read</span><p class="mw-subtitle">Only Aisha needs you this week. The rest are steady — a short hello keeps it that way.</p></article>
      </aside>
    </div>
  </section>`;

const preparePage = () => `
  <section class="mw-page" aria-labelledby="mw-prepare-title">
    <header class="mw-header">
      <div><div class="mw-eyebrow">Prepare · 1:1 with Aisha</div><h1 class="mw-title" id="mw-prepare-title">A brief, not a script.</h1>
        <p class="mw-subtitle">Three grounded questions and a place for your own thoughts.</p></div>
      <div class="mw-date">${icon(CalendarClock, { size:16 })} Today · 10:30</div>
    </header>
    <div class="mw-context">
      <div class="mw-context__item" ${gap("red", "no pattern detection")}><div class="mw-context__label">The pattern</div><div class="mw-context__value">Two reviews needed late rework</div></div>
      <div class="mw-context__item" ${gap("red", "not stored")}><div class="mw-context__label">Her ask</div><div class="mw-context__value">Clearer priorities up front</div></div>
      <div class="mw-context__item"><div class="mw-context__label">Open promise</div><div class="mw-context__value">She brings one critique example</div></div>
    </div>
    <div class="mw-grid">
      <article class="mw-card"><span class="mw-kicker">${icon(MessageCircle, { size:17 })} Ask these</span><h2 class="mw-section-title" style="margin-top:10px">Three questions, each grounded in something real</h2>
        <div class="mw-question"><span class="mw-question__n">1</span><div><div class="mw-question__text">What has felt harder than it should on the checkout work?</div><div class="mw-question__why" ${gap("red", "no per-question evidence")}>From: two reviews landed late in the last month.</div></div></div>
        <div class="mw-question"><span class="mw-question__n">2</span><div><div class="mw-question__text">Where did the rework start — the brief, the first pass, or the review?</div><div class="mw-question__why" ${gap("red", "no per-question evidence")}>From: your note that rework keeps arriving late.</div></div></div>
        <div class="mw-question"><span class="mw-question__n">3</span><div><div class="mw-question__text">What would clearer priorities from me actually look like?</div><div class="mw-question__why" ${gap("red", "no per-question evidence")}>From: her request last month for clearer priorities.</div></div></div>
      </article>
      <aside class="mw-stack">
        <article class="mw-card"><h2 class="mw-section-title">Private notes</h2><textarea class="mw-note" ${gap("amber", "not wired here")} placeholder="Anything you want to hold in mind before you start…"></textarea><p class="mw-list__meta">Prototype only · nothing is saved</p></article>
        <article class="mw-card"><span class="mw-kicker">${icon(Sparkles, { size:17 })} Keep it human</span><p class="mw-subtitle">Open with her experience. The pattern is context for you, not an opening line.</p></article>
      </aside>
    </div>
    <div class="mw-action-row"><span class="mw-meta">Last 1:1 · 15 days ago</span><button class="mw-button" type="button" data-mw-scene="followthrough">Start 1:1 ${icon(ArrowRight, { size:17 })}</button></div>
  </section>`;

const followThroughPage = () => `
  <section class="mw-page" aria-labelledby="mw-follow-title">
    <header class="mw-header">
      <div><div class="mw-eyebrow">Follow-through · Aisha Rahman</div><h1 class="mw-title" id="mw-follow-title">Leave with clear ownership.</h1>
        <p class="mw-subtitle">Two commitments came out of today — each with an owner and a date.</p></div>
      <div class="mw-date">${icon(CalendarDays, { size:16 })} Tue 14 Jul 2026</div>
    </header>
    <div class="mw-grid">
      <article class="mw-card"><div class="mw-card__top"><span class="mw-kicker">${icon(ListChecks, { size:17 })} Commitments</span><span class="mw-status">2 agreed</span></div>
        <div class="mw-list">
          <div class="mw-commit">
            <input class="mw-field" type="text" value="Share the Q3 design brief so priorities are clear up front" aria-label="Commitment one">
            <div class="mw-commit__meta"><input class="mw-field" type="text" value="Owner · Carl" aria-label="Owner"><span class="mw-gapwrap" ${gap("red", "no due date")}><input class="mw-field" type="text" value="By Fri 17 Jul" aria-label="Due date"></span></div>
          </div>
          <div class="mw-commit">
            <input class="mw-field" type="text" value="Bring one critique example to shape the next review" aria-label="Commitment two">
            <div class="mw-commit__meta"><input class="mw-field" type="text" value="Owner · Aisha" aria-label="Owner"><span class="mw-gapwrap" ${gap("red", "no due date")}><input class="mw-field" type="text" value="By next 1:1" aria-label="Due date"></span></div>
          </div>
        </div>
        <p class="mw-list__meta" style="margin-top:var(--sero-space-4)">Prototype only · these fields don’t save.</p>
      </article>
      <aside class="mw-stack">
        <article class="mw-card"><span class="mw-kicker">${icon(Repeat, { size:17 })} Returns next time</span><h2 class="mw-section-title" style="margin-top:10px">What comes back on 28 Jul</h2><div class="mw-list">
          <div class="mw-list__row"><span class="mw-list__icon">${icon(Check, { size:17 })}</span><div class="mw-list__body"><div class="mw-list__title">Q3 design brief shared</div><div class="mw-list__meta">Yours · we’ll ask if it landed</div></div></div>
          <div class="mw-list__row"><span class="mw-list__icon">${icon(Target, { size:17 })}</span><div class="mw-list__body"><div class="mw-list__title">Critique example</div><div class="mw-list__meta">Aisha · opens the next review</div></div></div>
          <div class="mw-list__row" ${gap("red", "no pattern detection")}><span class="mw-list__icon">${icon(TrendingUp, { size:17 })}</span><div class="mw-list__body"><div class="mw-list__title">Late-rework pattern</div><div class="mw-list__meta">We’ll check if it eased</div></div></div>
        </div></article>
      </aside>
    </div>
    <div class="mw-action-row"><span class="mw-meta">Nothing here is saved — this is a walkthrough</span><button class="mw-button" type="button" data-mw-scene="today">Finish review ${icon(ArrowRight, { size:17 })}</button></div>
  </section>`;

const PAGES: Record<ManagerWorkspaceSceneId, () => string> = {
  today: todayPage,
  team: teamPage,
  person: personPage,
  prepare: preparePage,
  followthrough: followThroughPage,
};

const SCENE_IDS: ReadonlySet<string> = new Set(
  MANAGER_WORKSPACE_SCENES.map((scene) => scene.id),
);

export function mount(root: HTMLElement): void {
  let active: ManagerWorkspaceSceneId = "today";
  // Feasibility overlay state — persists across scene re-renders.
  const overlay = { red: false, amber: false, open: false };

  const applyOverlay = (): void => {
    const mwEl = root.querySelector<HTMLElement>(".mw");
    if (!mwEl) return;
    mwEl.classList.toggle("mw--gap-red", overlay.red);
    mwEl.classList.toggle("mw--gap-amber", overlay.amber);
    const feas = root.querySelector<HTMLElement>(".mw-feas");
    if (feas) feas.dataset.open = String(overlay.open);
    const toggle = root.querySelector<HTMLElement>(".mw-feas__toggle");
    if (toggle) toggle.setAttribute("aria-expanded", String(overlay.open));
    const redBox = root.querySelector<HTMLInputElement>('[data-gap-toggle="red"]');
    const amberBox = root.querySelector<HTMLInputElement>('[data-gap-toggle="amber"]');
    if (redBox) redBox.checked = overlay.red;
    if (amberBox) amberBox.checked = overlay.amber;
  };

  const render = (): void => {
    root.innerHTML = `<style>${STYLE}</style><div class="mw"><div class="mw-shell">${nav(active)}<main class="mw-main">${feasBar()}${PAGES[active]()}</main></div></div>`;
    root.querySelectorAll<HTMLElement>("[data-mw-scene]").forEach((control) => {
      control.addEventListener("click", () => {
        const target = control.dataset.mwScene;
        if (target && SCENE_IDS.has(target)) { active = target as ManagerWorkspaceSceneId; render(); }
      });
    });
    root.querySelector<HTMLElement>(".mw-feas__toggle")?.addEventListener("click", () => {
      overlay.open = !overlay.open;
      applyOverlay();
    });
    root.querySelectorAll<HTMLInputElement>("[data-gap-toggle]").forEach((box) => {
      box.addEventListener("change", () => {
        if (box.dataset.gapToggle === "red") overlay.red = box.checked;
        if (box.dataset.gapToggle === "amber") overlay.amber = box.checked;
        applyOverlay();
      });
    });
    applyOverlay();
  };
  render();
}
