// Test: the "Monthly Check-in" — a new, guided kind of 1:1 (mock only, hardcoded data,
// zero API/engine calls, nothing saved). Opened from the /test gallery.
//
// DESIGN SOURCE: the old-Sero runner (github.com/seroteams/SeroMVP-v19, client/src/
// components/oneonone/* + oneonone-runner.tsx) + Carl's screenshots + his 2026-07-12 walk notes.
// Pale-blue page, tidy session header, one BIG Bricolage stage title + muted subtitle,
// white "Sero question" cards, borderless notes cards, rating sliders with last-month markers,
// and a FLOATING bottom pill bar (portaled to <body> so it's always visible on every stage).
// Requests + Goals rows open a right-hand side panel.
//
// Seven stages: Catch-up → Requests → Rating → Feedback → Goals → Summary → Review.
// (Prep dropped per Carl — the interview flow already covers prep.)

// ---- Mock data ------------------------------------------------------------------------------
const PERSON = { name: "Aisha", full: "Aisha Rahman", last: "9 Jun 2026" };

const STAGES = [
  { id: "catchup", label: "Catch-up", icon: "chat" },
  { id: "requests", label: "Requests", icon: "inbox" },
  { id: "rating", label: "Rating", icon: "star" },
  { id: "feedback", label: "Feedback", icon: "bubble" },
  { id: "goals", label: "Goals", icon: "target" },
  { id: "summary", label: "Summary", icon: "doc" },
  { id: "wrapup", label: "Review", icon: "clip" },
];

const PROMISES = [
  { owner: "you", action: "Book Aisha's onboarding buddy" },
  { owner: "Aisha", action: "Track where her hours actually go for a week" },
];
const OUTCOMES = [
  { value: "yes", label: "Done" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "Not yet" },
  { value: "changed", label: "Changed" },
];

const REQUESTS = [
  { text: "Wants to shadow a senior on the checkout redesign", cat: "Growth & development", status: "New", raised: "raised this month", note: "Keen to see how a senior scopes a big flow before she leads one herself." },
  { text: "Clearer priorities at the start of each sprint", cat: "Concerns & feedback", status: "In progress", raised: "raised 2 months ago", note: "Comes up repeatedly — she loses the first day of each sprint working out what matters." },
];

const BLOCKS = [
  { id: "tasks", label: "Tasks", icon: "check", last: 7 },
  { id: "processes", label: "Processes", icon: "flow", last: 6 },
  { id: "team", label: "Our team", icon: "people", last: 8 },
  { id: "development", label: "Development", icon: "trend", last: 5 },
  { id: "fun", label: "Fun", icon: "smile", last: 7 },
  { id: "fulfilment", label: "Fulfilment", icon: "heart", last: 6 },
];

const GOALS = [
  { text: "Own a feature end-to-end by Q3", pct: 77, status: "In progress", history: ["Jun — leading the empty-states work", "May — shadowing on the settings flow"] },
  { text: "Get confident giving design crit", pct: 24, status: "In progress", history: ["Jun — spoke up in two reviews"] },
  { text: "Run 3 peer feedback cycles", pct: 100, status: "Done", history: ["Jun — third cycle wrapped"] },
];

const FEEDBACK = [
  { key: "less", tag: "Less of", stem: `What would ${PERSON.name} like less of?`, coach: `What drains her energy — tasks, meetings, interruptions? Listen for patterns that might point to something systemic.` },
  { key: "more", tag: "More of", stem: `What would ${PERSON.name} like more of?`, coach: "More ownership, more feedback, more pairing time? Ask what it would unlock for her." },
  { key: "learn", tag: "Learn", stem: `What does ${PERSON.name} want to learn?`, coach: "A skill, a tool, a role to shadow — tie it into the goals stage next." },
];

// ---- tiny icon set (lucide-style inline SVGs) -----------------------------------------------
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  chat: I(`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`),
  inbox: I(`<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`),
  star: I(`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`),
  bubble: I(`<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>`),
  target: I(`<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`),
  doc: I(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`),
  clip: I(`<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>`),
  clock: I(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`),
  info: I(`<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`),
  check: I(`<path d="M20 6 9 17l-5-5"/>`),
  plus: I(`<path d="M12 5v14M5 12h14"/>`),
  chev: I(`<path d="m9 18 6-6-6-6"/>`),
  x: I(`<path d="M18 6 6 18M6 6l12 12"/>`),
  flow: I(`<circle cx="5" cy="6" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 6h8a3 3 0 0 1 3 3v1"/><path d="M16 18H8a3 3 0 0 1-3-3v-1"/>`),
  people: I(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),
  trend: I(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`),
  smile: I(`<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>`),
  heart: I(`<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>`),
  lock: I(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`),
};

// ---- CSS — old-Sero runner look; tokens from design.css with hex fallbacks -------------------
const STYLE = `
  .mcr, .mcr * , .mcr-portal, .mcr-portal * { box-sizing:border-box; }
  .mcr { width:100vw; margin-left:calc(50% - 50vw);
    background:var(--sero-primary-100, #f5fafd); min-height:82vh;
    padding-bottom:132px; font-size:15px; color:var(--sero-charcoal-800, #222933); }
  .mcr svg, .mcr-portal svg { width:1em; height:1em; display:inline-block; vertical-align:-0.125em; }

  /* ---- centered column + big title ---- */
  .mcr-col { max-width:800px; margin:0 auto; padding:44px 16px 0; }
  .mcr-h1 { font-family:var(--type-family-display); font-weight:700; text-align:center;
    font-size:clamp(28px, 4vw, 42px); line-height:1.15; color:var(--color-ink, #102d42); margin:0 0 14px; }
  .mcr-sub { text-align:center; color:var(--color-ink-mute, #64748b); font-size:16px;
    max-width:36rem; margin:0 auto 40px; line-height:1.5; }

  .mcr-card { background:#fff; border:1px solid var(--color-border, #e3e8ee);
    border-radius:12px; box-shadow:0 1px 2px rgba(16,45,66,.05); }
  .mcr-q { padding:18px 20px; margin-bottom:16px; }
  .mcr-q__head { display:flex; align-items:flex-start; gap:8px; }
  .mcr-q__logo { width:22px; height:22px; border-radius:6px; flex:none; margin-top:1px;
    background:var(--sero-charcoal-900, #16202b); color:#fff; display:inline-flex;
    align-items:center; justify-content:center; font-family:var(--type-family-display);
    font-weight:700; font-size:11px; }
  .mcr-q__n { color:var(--sero-charcoal-700, #3f4c5a); font-size:15px; white-space:nowrap; }
  .mcr-q__stem { font-weight:700; font-size:16px; color:var(--sero-charcoal-800, #222933); flex:1; min-width:0; }
  .mcr-q__clock { flex:none; font:inherit; cursor:pointer; width:28px; height:28px; border-radius:9999px;
    border:0; display:inline-flex; align-items:center; justify-content:center;
    background:var(--sero-sky-100, #f4fbfd); color:var(--sero-sky-800, #1b7089); font-size:15px; }
  .mcr-q__coach { margin:10px 0 0 30px; font-size:15px; line-height:1.55; color:var(--sero-charcoal-700, #3f4c5a); }
  .mcr-q__src { margin:8px 0 0 30px; font-size:13px; color:var(--color-ink-mute, #64748b); }
  .mcr-q--done { padding:12px 18px; margin-bottom:10px; opacity:.75; }
  .mcr-q--done .mcr-q__stem { font-size:15px; font-weight:600; }

  .mcr-notes { padding:16px 18px; margin-bottom:20px; }
  .mcr-notes textarea { width:100%; border:0; outline:none; resize:vertical; min-height:120px;
    font:inherit; font-size:15px; color:var(--color-ink, #102d42); background:transparent; }
  .mcr-notes textarea::placeholder { color:var(--color-ink-mute, #8fa3b3); }
  .mcr-notes__foot { display:flex; justify-content:flex-end; }

  .mcr-btn { font:inherit; font-size:15px; font-weight:600; cursor:pointer; border-radius:8px;
    padding:9px 18px; border:1px solid transparent; display:inline-flex; align-items:center; gap:8px;
    transition:background .12s ease, border-color .12s ease; }
  .mcr-btn--primary { background:var(--sero-primary-700, #5aa9e6); color:#fff; }
  .mcr-btn--primary:hover { background:var(--sero-primary-800, #1b5d91); }
  .mcr-btn--outline { background:#fff; border-color:var(--sero-primary-500, #a5cfef); color:var(--sero-primary-800, #1b5d91); }
  .mcr-btn--outline:hover { border-color:var(--sero-primary-700, #5aa9e6); }
  .mcr-cta { display:flex; justify-content:center; margin-top:8px; }

  /* ---- catch-up promises ---- */
  .mcr-prom { padding:16px 20px; margin-bottom:16px; }
  .mcr-prom__row { display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:12px 0;
    border-top:1px solid var(--color-border, #e9eef3); }
  .mcr-prom__row:first-of-type { border-top:0; }
  .mcr-owner { flex:none; font-size:13px; font-weight:600; border-radius:9999px; padding:2px 10px; }
  .mcr-owner--you { background:var(--sero-primary-200, #e9f3fb); color:var(--sero-primary-800, #1b5d91); }
  .mcr-owner--them { background:var(--sero-lavender-200, #f4f1fa); color:var(--sero-lavender-800, #55358f); }
  .mcr-prom__text { flex:1 1 14rem; min-width:0; font-size:15px; }
  .mcr-chips { display:flex; gap:6px; flex-wrap:wrap; }
  .mcr-chip { font:inherit; font-size:13.5px; cursor:pointer; padding:5px 12px; background:#fff;
    color:var(--sero-charcoal-700, #3f4c5a); border:1px solid var(--sero-charcoal-300, #cfd6dd); border-radius:9999px; }
  .mcr-chip:hover { border-color:var(--sero-primary-700, #5aa9e6); }
  .mcr-chip[data-selected] { font-weight:600; }
  .mcr-chip[data-value="yes"][data-selected] { background:var(--sero-mint-200, #eefcf9); color:var(--sero-mint-900, #0c4b3c); border-color:var(--sero-mint-800, #1aa887); }
  .mcr-chip[data-value="partly"][data-selected] { background:var(--sero-gold-200, #fff6e5); color:var(--sero-gold-900, #523600); border-color:var(--sero-gold-700, #ffc247); }
  .mcr-chip[data-value="no"][data-selected] { background:var(--sero-coral-200, #feeae8); color:var(--sero-coral-900, #500a04); border-color:var(--sero-coral-700, #f76b5e); }
  .mcr-chip[data-value="changed"][data-selected] { background:var(--sero-lavender-200, #f4f1fa); color:var(--sero-lavender-800, #55358f); border-color:var(--sero-lavender-700, #b49edb); }

  /* ---- clickable rows (requests + goals) ---- */
  .mcr-row { width:100%; text-align:left; font:inherit; cursor:pointer; display:flex; align-items:center;
    gap:12px; padding:16px 20px; margin-bottom:12px; background:#fff;
    border:1px solid var(--color-border, #e3e8ee); border-radius:12px; box-shadow:0 1px 2px rgba(16,45,66,.05);
    transition:border-color .12s ease, box-shadow .12s ease; }
  .mcr-row:hover { border-color:var(--sero-primary-500, #a5cfef); box-shadow:0 4px 12px rgba(16,45,66,.08); }
  .mcr-row__text { flex:1; min-width:0; font-size:15px; font-weight:500; }
  .mcr-row__cat { flex:none; font-size:14px; font-weight:600; color:var(--sero-lavender-800, #55358f); }
  .mcr-row__pct { flex:none; font-weight:700; color:var(--sero-primary-700, #5aa9e6); font-size:15px; }
  .mcr-row__chev { flex:none; color:var(--color-ink-mute, #8fa3b3); font-size:17px; }
  .mcr-status { flex:none; font-size:13px; font-weight:600; border-radius:9999px; padding:2px 10px; }
  .mcr-status--new { background:var(--sero-sky-100, #f4fbfd); color:var(--sero-sky-800, #1b7089); }
  .mcr-status--prog { background:var(--sero-primary-200, #e9f3fb); color:var(--sero-primary-800, #1b5d91); }
  .mcr-status--done { background:var(--sero-mint-200, #eefcf9); color:var(--sero-mint-900, #0c4b3c); }
  .mcr-addrow { display:flex; justify-content:center; margin:6px 0 22px; }

  /* ---- rating ---- */
  .mcr-block { padding:20px 22px; margin-bottom:18px; }
  .mcr-block__head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
  .mcr-block__icon { width:38px; height:38px; border-radius:9999px; flex:none;
    background:var(--sero-primary-200, #e9f3fb); color:var(--sero-primary-800, #1b5d91);
    display:inline-flex; align-items:center; justify-content:center; font-size:17px; }
  .mcr-block__label { font-weight:700; font-size:16px; display:inline-flex; gap:6px; align-items:center; }
  .mcr-block__label svg { color:var(--color-ink-mute, #8fa3b3); font-size:13px; }
  .mcr-block__score { margin-left:auto; font-family:var(--type-family-display); font-weight:700;
    font-size:30px; color:var(--color-ink, #102d42); }
  .mcr-slider { position:relative; padding-top:30px; }
  .mcr-lastmark { position:absolute; top:0; transform:translateX(-50%); text-align:center; font-size:13px;
    color:var(--sero-primary-800, #1b5d91); white-space:nowrap; }
  .mcr-lastmark::after { content:"▾"; display:block; line-height:.7; }
  .mcr-slider input[type=range] { width:100%; accent-color:var(--sero-primary-700, #5aa9e6); height:22px; cursor:pointer; }
  .mcr-slider__labels { display:flex; justify-content:space-between; font-size:14px;
    color:var(--sero-charcoal-700, #3f4c5a); margin-top:2px; }
  .mcr-block__note { margin-top:12px; }
  .mcr-block__note input { width:100%; font:inherit; font-size:14px; padding:10px 12px; border-radius:8px;
    border:1px solid var(--color-border, #e3e8ee); outline:none; }
  .mcr-block__note input:focus { border-color:var(--sero-primary-700, #5aa9e6); }
  .mcr-block__note input::placeholder { color:var(--color-ink-mute, #8fa3b3); }

  /* ---- summary + review ---- */
  .mcr-sum { padding:20px 22px; margin-bottom:16px; }
  .mcr-sum h3 { font-family:var(--type-family-display); font-size:19px; margin:0 0 8px; color:var(--color-ink, #102d42); }
  .mcr-sum p, .mcr-sum li { font-size:15px; line-height:1.6; }
  .mcr-sum ul { margin:8px 0 0; padding-left:20px; }
  .mcr-ainote { display:flex; align-items:center; gap:8px; justify-content:center; font-size:13.5px;
    color:var(--color-ink-mute, #64748b); margin-bottom:14px; }
  .mcr-private { display:flex; align-items:center; gap:8px; justify-content:center; font-size:14px; font-weight:600;
    color:var(--sero-gold-900, #523600); background:var(--sero-gold-200, #fff6e5);
    border:1px solid var(--sero-gold-600, #ffd072); border-radius:9999px; padding:8px 18px; width:fit-content; margin:0 auto 26px; }
  .mcr-eng { display:flex; gap:8px; justify-content:center; margin:10px 0 22px; }
  .mcr-eng button { font:inherit; font-size:16px; cursor:pointer; width:44px; height:44px; border-radius:9999px;
    background:#fff; border:1px solid var(--sero-charcoal-300, #cfd6dd); color:var(--sero-charcoal-700, #3f4c5a); }
  .mcr-eng button[data-selected] { background:var(--sero-primary-700, #5aa9e6); color:#fff; border-color:var(--sero-primary-700, #5aa9e6); font-weight:700; }
  .mcr-sugg { padding:16px 20px; }
  .mcr-sugg__row { display:flex; gap:10px; padding:10px 0; font-size:15px; line-height:1.5;
    border-top:1px solid var(--color-border, #e9eef3); }
  .mcr-sugg__row:first-of-type { border-top:0; }
  .mcr-sugg__tag { flex:none; font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em;
    color:var(--sero-primary-800, #1b5d91); padding-top:2px; width:82px; }
  .mcr-mock { text-align:center; font-size:14px; color:var(--color-ink-mute, #64748b); font-style:italic; margin-top:14px; }

  /* ---- floating bottom pill bar (portaled to body) ---- */
  .mcr-tabs-wrap { position:fixed; left:0; right:0; bottom:14px; z-index:2147483000;
    display:flex; justify-content:center; pointer-events:none; padding:0 10px; }
  .mcr-tabs { pointer-events:auto; display:flex; flex-wrap:wrap; justify-content:center; gap:5px; background:#fff;
    border:1px solid var(--color-border, #e3e8ee); border-radius:9999px; box-shadow:0 6px 24px rgba(16,45,66,.14); padding:7px; }
  .mcr-tab { font:inherit; font-size:14.5px; font-weight:500; cursor:pointer; display:inline-flex; align-items:center;
    gap:7px; padding:9px 16px; border-radius:9999px; background:#fff; border:1px solid var(--color-border, #e3e8ee);
    color:var(--sero-charcoal-700, #3f4c5a); transition:border-color .12s ease, background .12s ease; }
  .mcr-tab:hover { border-color:var(--sero-primary-700, #5aa9e6); }
  .mcr-tab svg { font-size:15px; }
  .mcr-tab[data-state="current"] { background:var(--sero-primary-200, #e9f3fb);
    border-color:var(--sero-primary-700, #5aa9e6); color:var(--sero-primary-800, #1b5d91); font-weight:600; }
  .mcr-tab[data-state="done"] { color:var(--sero-mint-900, #0c4b3c); }
  .mcr-tab[data-state="done"] svg { color:var(--sero-mint-800, #1aa887); }
  @media (max-width: 900px) {
    .mcr-tab span { display:none; }
    .mcr-tab { padding:9px 12px; }
    .mcr-tab[data-state="current"] span { display:inline; }
  }

  /* ---- right-hand side panel ---- */
  .mcr-backdrop { position:fixed; inset:0; z-index:2147483200; background:rgba(16,45,66,.35); }
  .mcr-panel { position:fixed; top:0; right:0; bottom:0; z-index:2147483201; width:min(440px, 92vw);
    background:#fff; box-shadow:-8px 0 30px rgba(16,45,66,.18); display:flex; flex-direction:column;
    animation:mcr-slide .18s ease-out; }
  @keyframes mcr-slide { from { transform:translateX(30px); opacity:.4; } to { transform:none; opacity:1; } }
  .mcr-panel__head { display:flex; align-items:center; justify-content:space-between; gap:12px;
    padding:16px 20px; border-bottom:1px solid var(--color-border, #e3e8ee); }
  .mcr-panel__eyebrow { font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em;
    color:var(--color-ink-mute, #64748b); }
  .mcr-panel__x { font:inherit; cursor:pointer; width:32px; height:32px; border-radius:8px; border:0;
    background:var(--sero-charcoal-50, #f4f6f8); color:var(--sero-charcoal-700, #3f4c5a);
    display:inline-flex; align-items:center; justify-content:center; font-size:17px; }
  .mcr-panel__body { padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:16px; }
  .mcr-panel__title { font-family:var(--type-family-display); font-size:20px; font-weight:700; color:var(--color-ink, #102d42); line-height:1.25; }
  .mcr-panel__meta { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .mcr-field label { display:block; font-size:13px; font-weight:600; color:var(--sero-charcoal-700, #3f4c5a); margin-bottom:6px; }
  .mcr-field select, .mcr-field input, .mcr-field textarea { width:100%; font:inherit; font-size:15px;
    padding:10px 12px; border-radius:8px; border:1px solid var(--color-border, #e3e8ee); outline:none; background:#fff; }
  .mcr-field select:focus, .mcr-field input:focus, .mcr-field textarea:focus { border-color:var(--sero-primary-700, #5aa9e6); }
  .mcr-field textarea { resize:vertical; min-height:90px; }
  .mcr-hist { font-size:14px; color:var(--sero-charcoal-700, #3f4c5a); }
  .mcr-hist div { padding:8px 0; border-top:1px solid var(--color-border, #e9eef3); }
  .mcr-hist div:first-child { border-top:0; }
  .mcr-panel__foot { margin-top:auto; padding:16px 20px; border-top:1px solid var(--color-border, #e3e8ee);
    display:flex; justify-content:flex-end; gap:10px; }
  .mcr-bar { height:8px; border-radius:9999px; background:var(--sero-charcoal-100, #eef1f4); overflow:hidden; }
  .mcr-bar span { display:block; height:100%; border-radius:9999px; background:var(--sero-primary-700, #5aa9e6); }
`;

// ---- builders -------------------------------------------------------------------------------
const qCard = ({ n, of, stem, coach, src }) => `
  <div class="mcr-card mcr-q">
    <div class="mcr-q__head">
      <span class="mcr-q__logo">S</span>
      <span class="mcr-q__n">(${n}/${of})</span>
      <span class="mcr-q__stem">${stem}</span>
      <button type="button" class="mcr-q__clock" aria-label="View history" title="View history">${ICONS.clock}</button>
    </div>
    <p class="mcr-q__coach">${coach}</p>
    ${src ? `<p class="mcr-q__src">${src}</p>` : ""}
  </div>`;

const notesCard = (placeholder) => `
  <div class="mcr-card mcr-notes">
    <textarea placeholder="${placeholder}"></textarea>
    <div class="mcr-notes__foot"><button type="button" class="mcr-btn mcr-btn--outline">Save</button></div>
  </div>`;

const cta = (label, action = "next") =>
  `<div class="mcr-cta"><button type="button" class="mcr-btn mcr-btn--primary" data-${action}>${label}</button></div>`;

const statusCls = (s) => (s === "Done" ? "done" : s === "In progress" ? "prog" : "new");

// ---- stage content --------------------------------------------------------------------------
function stageHtml(id, state) {
  if (id === "catchup") {
    const rows = PROMISES.map((p, i) => `
      <div class="mcr-prom__row">
        <span class="mcr-owner mcr-owner--${p.owner === "you" ? "you" : "them"}">${p.owner === "you" ? "You" : PERSON.name}</span>
        <span class="mcr-prom__text">${p.action}</span>
        <div class="mcr-chips" role="group" aria-label="Did it happen?">
          ${OUTCOMES.map((o) => `<button type="button" class="mcr-chip" data-item="${i}" data-value="${o.value}"${state.outcomes[i] === o.value ? " data-selected" : ""}>${o.label}</button>`).join("")}
        </div>
      </div>`).join("");
    return {
      title: "A quick catch-up to start things off",
      sub: "Start where you left off — how did last month's promises go?",
      body: `
        <div class="mcr-card mcr-prom">
          <div class="mcr-q__head" style="margin-bottom:4px">
            <span class="mcr-q__logo">S</span>
            <span class="mcr-q__stem">Last month's promises — did they happen?</span>
          </div>
          ${rows}
        </div>
        ${notesCard(`Notes on ${PERSON.name}'s answers`)}
        ${cta("Continue to requests")}`,
    };
  }

  if (id === "requests") {
    const rows = REQUESTS.map((r, i) => `
      <button type="button" class="mcr-row" data-open="request" data-i="${i}">
        <span class="mcr-row__text">${r.text}</span>
        <span class="mcr-row__cat">${r.cat}</span>
        <span class="mcr-status mcr-status--${statusCls(r.status)}">${r.status}</span>
        <span class="mcr-row__chev">${ICONS.chev}</span>
      </button>`).join("");
    return {
      title: `${PERSON.name} has ${REQUESTS.length} things to discuss`,
      sub: `Click any request to open it — discuss priorities, blockers, and next steps in the side panel.`,
      body: `${rows}
        <div class="mcr-addrow"><button type="button" class="mcr-btn mcr-btn--outline" data-open="add-request">${ICONS.plus}<span>Add request</span></button></div>
        ${cta("Continue to Ratings")}`,
    };
  }

  if (id === "rating") {
    const rows = BLOCKS.map((b) => {
      const val = state.ratings[b.id] ?? 5;
      const pct = ((b.last - 1) / 9) * 100;
      return `
      <div class="mcr-card mcr-block">
        <div class="mcr-block__head">
          <span class="mcr-block__icon">${ICONS[b.icon]}</span>
          <span class="mcr-block__label">${b.label} ${ICONS.info}</span>
          <span class="mcr-block__score" data-score-for="${b.id}">${Number(val).toFixed(1)}</span>
        </div>
        <div class="mcr-slider">
          <span class="mcr-lastmark" style="left:${pct}%">${b.last.toFixed(1)} · ${PERSON.last}</span>
          <input type="range" min="1" max="10" step="0.5" value="${val}" data-block="${b.id}" aria-label="${b.label} score 1 to 10" />
          <div class="mcr-slider__labels"><span>1 Low score</span><span>5 Normal</span><span>10 Thriving</span></div>
        </div>
        <div class="mcr-block__note"><input type="text" placeholder="Add a note about this rating..." /></div>
      </div>`;
    }).join("");
    return {
      title: "Building block ratings",
      sub: `Ask ${PERSON.full} to rate how they feel about each area — she says the number out loud, you type it in. The marker shows last month.`,
      body: `${rows}${cta("Continue to Feedback")}`,
    };
  }

  if (id === "feedback") {
    const idx = state.fbStep ?? 0;
    const done = FEEDBACK.slice(0, idx).map((f) => `
      <div class="mcr-card mcr-q mcr-q--done">
        <div class="mcr-q__head">
          <span class="mcr-q__logo">${ICONS.check}</span>
          <span class="mcr-q__stem">${f.stem}</span>
        </div>
      </div>`).join("");
    const q = FEEDBACK[idx];
    const last = idx === FEEDBACK.length - 1;
    return {
      title: "Looking to the future",
      sub: `${PERSON.full}'s chance to share what they'd like more of, less of, and what they want to learn — one at a time.`,
      body: `
        ${done}
        ${qCard({ n: idx + 1, of: FEEDBACK.length, stem: q.stem, coach: q.coach, src: "Suggested by Sero" })}
        ${notesCard(`Notes on ${PERSON.name}'s answers`)}
        ${last
          ? cta("Continue to goals")
          : `<div class="mcr-cta"><button type="button" class="mcr-btn mcr-btn--primary" data-fbnext>Next question →</button></div>`}`,
    };
  }

  if (id === "goals") {
    const rows = GOALS.map((g, i) => `
      <button type="button" class="mcr-row" data-open="goal" data-i="${i}">
        <span class="mcr-row__text">${g.text}</span>
        <span class="mcr-row__pct">${g.pct}%</span>
        <span class="mcr-status mcr-status--${statusCls(g.status)}">${g.status}</span>
        <span class="mcr-row__chev">${ICONS.chev}</span>
      </button>`).join("");
    return {
      title: `Review ${GOALS.length} goals together`,
      sub: `Click a goal to open it — discuss progress, blockers, and celebrate wins in the side panel.`,
      body: `${rows}
        <div class="mcr-addrow"><button type="button" class="mcr-btn mcr-btn--outline" data-open="add-goal">${ICONS.plus}<span>Add a new goal</span></button></div>
        ${cta("Continue to 1:1 Summary")}`,
    };
  }

  if (id === "summary") {
    return {
      title: "Your 1:1 summary",
      sub: "Sero drafts this from everything above and your last check-in — read it together, tweak anything, and it's saved.",
      body: `
        <p class="mcr-ainote"><span class="mcr-q__logo">S</span> Drafted by Sero from this session + your ${PERSON.last} check-in — edit freely.</p>
        <div class="mcr-card mcr-sum">
          <h3>July catch-up with ${PERSON.name}</h3>
          <p>Good month overall — Development is up (5 → 7) after she started leading the empty-states work. The onboarding buddy is finally booked. Sprint priorities are still fuzzy at the start of each sprint.</p>
          <ul>
            <li>Agreed: she shadows a senior on the checkout redesign this month.</li>
            <li>You set sprint priorities on the Monday of each sprint.</li>
            <li>Her "give design crit" goal moves to 40% — spoke up twice this month.</li>
          </ul>
        </div>
        ${notesCard("Edit the summary…")}
        ${cta("Continue to Review")}`,
    };
  }

  // wrapup — private review
  const eng = [1, 2, 3, 4, 5].map((n) =>
    `<button type="button" data-eng="${n}"${state.engagement === n ? " data-selected" : ""}>${n}</button>`).join("");
  return {
    title: "Your private review",
    sub: `After ${PERSON.name} leaves — a quiet moment for your own read. None of this is ever shared with her.`,
    body: `
      <div class="mcr-private">${ICONS.lock}<span>Private — just for you. ${PERSON.name} never sees this stage.</span></div>
      <p style="text-align:center; font-weight:600; margin:0 0 2px">How engaged did she seem?</p>
      <div class="mcr-eng" role="group" aria-label="Engagement 1 to 5">${eng}</div>
      ${notesCard("Your private notes — anything you don't want to forget…")}
      <div class="mcr-card mcr-sugg">
        <div class="mcr-q__head" style="margin-bottom:6px">
          <span class="mcr-q__logo">S</span>
          <span class="mcr-q__stem">Sero's suggestions (private)</span>
        </div>
        <div class="mcr-sugg__row"><span class="mcr-sugg__tag">For her</span><span>Give her a low-risk piece to present at the next design review.</span></div>
        <div class="mcr-sugg__row"><span class="mcr-sugg__tag">Team</span><span>The sprint-priorities gap may be hitting others too.</span></div>
        <div class="mcr-sugg__row"><span class="mcr-sugg__tag">Company</span><span>Juniors want senior-shadow time — worth making routine.</span></div>
      </div>
      <div class="mcr-cta" style="margin-top:22px"><button type="button" class="mcr-btn mcr-btn--primary" data-finish>${ICONS.check}<span>Complete 1:1</span></button></div>
      <div class="mcr-mock" data-finish-note hidden>(mock) Saved. Next month, everything here comes back — promises, requests, goals, and the trend lines.</div>`,
  };
}

// ---- side panel content ---------------------------------------------------------------------
function panelHtml(panel) {
  const selectField = (label, opts, current) =>
    `<div class="mcr-field"><label>${label}</label><select>${opts.map((o) => `<option${o === current ? " selected" : ""}>${o}</option>`).join("")}</select></div>`;

  let eyebrow = "", body = "", foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Close</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Save</button>`;

  if (panel.type === "request") {
    const r = REQUESTS[panel.i];
    eyebrow = "Request";
    body = `
      <div class="mcr-panel__title">${r.text}</div>
      <div class="mcr-panel__meta"><span class="mcr-row__cat">${r.cat}</span><span class="mcr-status mcr-status--${statusCls(r.status)}">${r.status}</span><span class="mcr-q__src" style="margin:0">${r.raised}</span></div>
      <div class="mcr-hist"><div>${r.note}</div></div>
      ${selectField("Status", ["New", "In progress", "Resolved"], r.status)}
      <div class="mcr-field"><label>Discussion notes</label><textarea placeholder="What you two talked through…"></textarea></div>
      <div class="mcr-field"><label>Next step</label><input type="text" placeholder="e.g. Pair with Sam on the checkout flow next sprint" /></div>`;
  } else if (panel.type === "goal") {
    const g = GOALS[panel.i];
    eyebrow = "Goal";
    body = `
      <div class="mcr-panel__title">${g.text}</div>
      <div class="mcr-panel__meta"><span class="mcr-row__pct">${g.pct}%</span><span class="mcr-status mcr-status--${statusCls(g.status)}">${g.status}</span></div>
      <div class="mcr-bar"><span style="width:${g.pct}%"></span></div>
      ${selectField("Status", ["Not started", "In progress", "Done"], g.status)}
      <div class="mcr-field"><label>Progress history</label><div class="mcr-hist">${g.history.map((h) => `<div>${h}</div>`).join("")}</div></div>
      <div class="mcr-field"><label>Add an update</label><textarea placeholder="What moved this month…"></textarea></div>`;
  } else if (panel.type === "add-goal") {
    eyebrow = "New goal";
    body = `
      <div class="mcr-field"><label>Goal</label><input type="text" placeholder="e.g. Own a feature end-to-end by Q4" /></div>
      ${selectField("Status", ["Not started", "In progress", "Done"], "Not started")}
      <div class="mcr-field"><label>First note (optional)</label><textarea placeholder="Where it stands today…"></textarea></div>`;
    foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Cancel</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Add goal</button>`;
  } else {
    // add-request
    eyebrow = "New request";
    body = `
      <div class="mcr-field"><label>Request</label><input type="text" placeholder="What ${PERSON.name} is asking for" /></div>
      ${selectField("Category", ["Growth & development", "Ideas & suggestions", "Concerns & feedback"], "Growth & development")}
      <div class="mcr-field"><label>Detail</label><textarea placeholder="Context…"></textarea></div>`;
    foot = `<button type="button" class="mcr-btn mcr-btn--outline" data-close>Cancel</button><button type="button" class="mcr-btn mcr-btn--primary" data-close>Add request</button>`;
  }

  return `
    <div class="mcr-backdrop" data-close></div>
    <aside class="mcr-panel" role="dialog" aria-label="${eyebrow}">
      <div class="mcr-panel__head">
        <span class="mcr-panel__eyebrow">${eyebrow}</span>
        <button type="button" class="mcr-panel__x" data-close aria-label="Close">${ICONS.x}</button>
      </div>
      <div class="mcr-panel__body">${body}</div>
      <div class="mcr-panel__foot">${foot}</div>
    </aside>`;
}

// ---- render + wire --------------------------------------------------------------------------
export function mount(root) {
  const state = { step: 0, outcomes: {}, ratings: {}, engagement: null, fbStep: 0, panel: null, visited: new Set([0]) };

  // Bottom nav + side panel live in a body portal so they're truly fixed on every stage,
  // independent of any transformed ancestor in the app shell.
  document.querySelectorAll(".mcr-portal").forEach((n) => n.remove());
  const portal = document.createElement("div");
  portal.className = "mcr-portal";
  document.body.appendChild(portal);

  const onKey = (e) => { if (e.key === "Escape" && state.panel) { state.panel = null; renderPortal(); } };
  document.addEventListener("keydown", onKey);

  // Clean up the portal + listener when the test stage is torn down (root disconnected).
  const obs = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      portal.remove();
      document.removeEventListener("keydown", onKey);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  const tabsHtml = () =>
    STAGES.map((s, i) => {
      const st = i === state.step ? "current" : state.visited.has(i) ? "done" : "todo";
      const ic = st === "done" ? ICONS.check : ICONS[s.icon];
      return `<button type="button" class="mcr-tab" data-step="${i}" data-state="${st}" role="tab"${i === state.step ? ' aria-selected="true"' : ""}>${ic}<span>${s.label}</span></button>`;
    }).join("");

  const renderPortal = () => {
    portal.innerHTML = `<style>${STYLE}</style>
      <nav class="mcr-tabs-wrap" aria-label="Stages"><div class="mcr-tabs">${tabsHtml()}</div></nav>
      ${state.panel ? panelHtml(state.panel) : ""}`;
    portal.querySelectorAll(".mcr-tab").forEach((b) =>
      b.addEventListener("click", () => go(Number(b.dataset.step))));
    portal.querySelectorAll("[data-close]").forEach((b) =>
      b.addEventListener("click", () => { state.panel = null; renderPortal(); }));
  };

  const render = () => {
    const s = stageHtml(STAGES[state.step].id, state);
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="mcr">
        <div class="mcr-col">
          <h1 class="mcr-h1">${s.title}</h1>
          <p class="mcr-sub">${s.sub}</p>
          ${s.body}
        </div>
      </div>`;
    wireContent();
    renderPortal();
  };

  const go = (step) => {
    state.visited.add(state.step);
    state.step = Math.max(0, Math.min(STAGES.length - 1, step));
    state.visited.add(state.step);
    state.panel = null;
    render();
    root.scrollIntoView({ block: "start" });
  };

  function wireContent() {
    root.querySelector("[data-next]")?.addEventListener("click", () => go(state.step + 1));
    root.querySelector("[data-fbnext]")?.addEventListener("click", () => { state.fbStep = (state.fbStep ?? 0) + 1; render(); });
    root.querySelector("[data-finish]")?.addEventListener("click", () => {
      const note = root.querySelector("[data-finish-note]");
      if (note) note.hidden = false;
    });
    root.querySelectorAll(".mcr-chip").forEach((chip) =>
      chip.addEventListener("click", () => { state.outcomes[chip.dataset.item] = chip.dataset.value; render(); }));
    root.querySelectorAll('.mcr-slider input[type="range"]').forEach((r) =>
      r.addEventListener("input", () => {
        state.ratings[r.dataset.block] = Number(r.value);
        const n = root.querySelector(`[data-score-for="${r.dataset.block}"]`);
        if (n) n.textContent = Number(r.value).toFixed(1);
      }));
    root.querySelectorAll("[data-eng]").forEach((d) =>
      d.addEventListener("click", () => { state.engagement = Number(d.dataset.eng); render(); }));
    // Open the side panel from a request/goal row or an add button.
    root.querySelectorAll("[data-open]").forEach((b) =>
      b.addEventListener("click", () => {
        const t = b.dataset.open;
        state.panel = t === "request" || t === "goal" ? { type: t, i: Number(b.dataset.i) } : { type: t };
        renderPortal();
      }));
  }

  render();
}
