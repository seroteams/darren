// Test: "Live pulse" — the founder dashboard for the LIVE site (admin-live-deploy plan,
// mock preview). Hardcoded data, zero API calls, nothing saved. Opened from /test.
//
// Three scenes, drill-down style:
//   1 · Pulse     — the one-screen overview: Gate-1 tile, runs, ratings, errors, guests,
//                   drop-offs, managers table, latest feedback.
//   2 · Manager   — click a manager: their team (the people they run 1:1s about) and
//                   every run with its meeting TYPE, status, rating and verdict.
//   3 · Run       — click a run: the answers the manager typed, plus the feedback that
//                   came back on that run (stars, verdict tap, note).
// Guests get their own list on scene 1 — who landed, ran a guest session, finished or
// broke off, and whether they later claimed it by registering.

// ---- Mock data ---------------------------------------------------------------------------
const MANAGERS = [
  {
    id: "maria",
    name: "Maria K.",
    company: "Nordica Retail",
    lastActive: "Fri 11 Jul",
    firstRun: "Tue 1 Jul",
    status: { kind: "back", label: "came back ×3" },
    team: [
      { name: "Emil", role: "Store manager", runs: 2 },
      { name: "Sofie", role: "Buyer", runs: 1 },
      { name: "Anna", role: "Cashier lead", runs: 1 },
    ],
    runs: [
      { id: "maria-4", date: "Fri 11 Jul", person: "Emil", type: "Bi-weekly 1:1", finished: true, rating: 5, verdict: "helpful" },
      { id: "maria-3", date: "Tue 8 Jul", person: "Sofie", type: "Feels-off", finished: true, rating: 4, verdict: "helpful" },
      { id: "maria-2", date: "Fri 4 Jul", person: "Anna", type: "First 1:1", finished: true, rating: 4, verdict: null },
      { id: "maria-1", date: "Tue 1 Jul", person: "Emil", type: "First 1:1", finished: true, rating: 5, verdict: "helpful" },
    ],
  },
  {
    id: "jonas",
    name: "Jonas B.",
    company: "Fjord Logistics",
    lastActive: "Wed 9 Jul",
    firstRun: "Thu 3 Jul",
    status: { kind: "back", label: "came back" },
    team: [
      { name: "Mikkel", role: "Dispatcher", runs: 2 },
    ],
    runs: [
      { id: "jonas-2", date: "Wed 9 Jul", person: "Mikkel", type: "Bi-weekly 1:1", finished: true, rating: 3, verdict: "off" },
      { id: "jonas-1", date: "Thu 3 Jul", person: "Mikkel", type: "First 1:1", finished: true, rating: 4, verdict: "helpful" },
    ],
  },
  {
    id: "priya",
    name: "Priya S.",
    company: "Brightside Care",
    lastActive: "Mon 7 Jul",
    firstRun: "Mon 7 Jul",
    status: { kind: "once", label: "ran once · day 5" },
    team: [
      { name: "Tom", role: "Care coordinator", runs: 1 },
    ],
    runs: [
      { id: "priya-1", date: "Mon 7 Jul", person: "Tom", type: "First 1:1", finished: false, stoppedAt: "Questions", rating: null, verdict: null },
    ],
  },
  {
    id: "carl",
    name: "Carl",
    company: "Sero",
    internal: true,
    lastActive: "Sat 12 Jul",
    firstRun: "Jun 2026",
    status: { kind: "int", label: "internal — not counted" },
    team: [{ name: "Darren", role: "Engineer", runs: 8 }],
    runs: [
      { id: "carl-1", date: "Sat 12 Jul", person: "Darren", type: "Weekly 1:1", finished: true, rating: 4, verdict: null },
    ],
  },
];

// One fully-fleshed run detail (the others reuse its shape with fewer answers).
const RUN_DETAILS = {
  "maria-4": {
    duration: "14 min",
    answers: [
      { q: "Since last time — did Emil sort the rota clash with the weekend team?", a: "mostly yes, one saturday still doubles up. he wants to swap fredrik in." },
      { q: "Where does Emil seem stretched right now?", a: "stock counts. he stays late tuesdays, says it's fine but it's every tuesday now." },
      { q: "What would make the next two weeks feel lighter for him?", a: "getting the counts shared with sofie, and me not adding friday asks last minute" },
    ],
    feedback: { rating: 5, verdict: "helpful", note: "The question about Emil's workload was exactly what I needed to ask." },
  },
  "jonas-2": {
    duration: "9 min",
    answers: [
      { q: "What's changed for Mikkel since the first 1:1?", a: "not much, quiet week" },
      { q: "Where is he blocked?", a: "waiting on the new route software" },
    ],
    feedback: { rating: 3, verdict: "off", note: "Felt generic this time — could have been about anyone on my team." },
  },
  "priya-1": {
    duration: "6 min · stopped at Questions",
    answers: [
      { q: "What do you want Tom to leave this first 1:1 feeling?", a: "that i actually know what his days look like" },
    ],
    feedback: null,
  },
};
const FALLBACK_DETAIL = {
  duration: "~10 min",
  answers: [{ q: "(answers recorded in this run)", a: "— mock: open maria-4, jonas-2 or priya-1 for full detail —" }],
  feedback: null,
};

const GUESTS = [
  { when: "Thu 10 Jul", type: "First 1:1", finished: true, claimed: "registered next day → Jonas B.", kind: "back" },
  { when: "Tue 8 Jul", type: "Feels-off", finished: true, claimed: "never claimed", kind: "once" },
  { when: "Sun 6 Jul", type: "First 1:1", finished: false, stoppedAt: "Questions", claimed: "never claimed", kind: "gone" },
];

const FEEDBACK_FEED = [
  { kind: "back", tag: "helpful", text: "“The question about Emil's workload was exactly what I needed to ask.”", meta: "Maria K. · Fri 11 Jul · Bi-weekly 1:1", run: "maria-4", manager: "maria" },
  { kind: "gone", tag: "off the mark", text: "“Felt generic this time — could have been about anyone on my team.”", meta: "Jonas B. · Wed 9 Jul · Bi-weekly 1:1", run: "jonas-2", manager: "jonas" },
  { kind: "back", tag: "helpful", text: "“Short and to the point. I used it 10 minutes before the meeting.”", meta: "Maria K. · Tue 8 Jul · Feels-off", run: "maria-3", manager: "maria" },
];

const SPARK = [1, 0, 1, 0, 1, 2, 0, 1, 2, 0, 1, 2, 1, 3]; // runs/day, 14 days

// ---- Prototype-only CSS (scoped .lp-) ------------------------------------------------------
const STYLE = `
  .lp-tiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(10.5rem, 1fr));
    gap:var(--sero-space-3); }
  .lp-tile { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-4); }
  .lp-tile--hero { border-color:var(--sero-mint-700);
    background:linear-gradient(0deg, var(--sero-mint-100), var(--color-surface) 70%); }
  .lp-tile__label { font-size:14px; font-weight:500; color:var(--color-ink-dim); }
  .lp-tile__value { font-family:var(--type-family-display); font-size:30px; font-weight:600;
    line-height:1.15; font-variant-numeric:tabular-nums; }
  .lp-tile__value .lp-den { font-size:18px; font-weight:500; color:var(--color-ink-dim); }
  .lp-tile__note { font-size:14px; color:var(--color-ink-dim); }
  .lp-up { color:var(--color-positive-text); font-weight:600; }
  .lp-down { color:var(--color-negative-text); font-weight:600; }

  .lp-wide { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr);
    gap:var(--sero-space-3); align-items:start; }
  .lp-colstack { display:flex; flex-direction:column; gap:var(--sero-space-3); min-width:0; }
  .lp-split { display:grid; gap:var(--sero-space-3); align-items:start; }
  .lp-split--team { grid-template-columns:minmax(0,1fr) minmax(0,2fr); }
  .lp-split--run { grid-template-columns:minmax(0,2fr) minmax(0,1fr); }
  @media (max-width: 1100px) { .lp-wide, .lp-split--team, .lp-split--run { grid-template-columns:1fr; } }

  .lp-card { background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--sero-space-4); }
  .lp-card h3 { font-size:16px; font-weight:600; margin:0; }
  .lp-card .lp-hnote { font-size:14px; color:var(--color-ink-dim); margin:2px 0 12px; }
  .lp-spark { width:100%; height:88px; display:block; }

  .lp-bar { display:grid; grid-template-columns:6.5rem 1fr 1.5rem; align-items:center;
    gap:10px; font-size:14px; margin-top:8px; }
  .lp-bar__name { color:var(--color-ink-dim); font-weight:500; }
  .lp-bar__track { background:var(--color-page); border-radius:4px; height:13px; overflow:hidden; }
  .lp-bar__fill { height:100%; border-radius:4px; background:var(--color-accent); opacity:.85; }
  .lp-bar__fill--warn { background:var(--sero-gold-700); }
  .lp-bar__n { text-align:right; font-variant-numeric:tabular-nums; font-weight:600; }

  .lp-table { width:100%; border-collapse:collapse; font-size:15px; }
  .lp-table th { text-align:left; font-size:14px; font-weight:600; color:var(--color-ink-dim);
    padding:6px 10px; border-bottom:1px solid var(--color-border); white-space:nowrap; }
  .lp-table td { padding:10px; border-bottom:1px solid var(--color-border); }
  .lp-table tr:last-child td { border-bottom:none; }
  .lp-table tr[data-link] { cursor:pointer; }
  .lp-table tr[data-link]:hover td { background:var(--color-surface-2); }
  .lp-scroll { overflow-x:auto; }

  .lp-pill { display:inline-block; border-radius:9999px; padding:1px 10px; font-size:14px;
    font-weight:600; white-space:nowrap; }
  .lp-pill--back { background:var(--sero-mint-100); color:var(--color-positive-text); }
  .lp-pill--once { background:var(--sero-gold-100); color:var(--sero-gold-900); }
  .lp-pill--gone { background:var(--sero-coral-100); color:var(--color-negative-text); }
  .lp-pill--int  { background:var(--color-page); color:var(--color-ink-dim);
    border:1px solid var(--color-border); font-weight:500; }
  .lp-type { display:inline-block; border-radius:9999px; padding:1px 10px; font-size:14px;
    background:var(--sero-primary-200); color:var(--color-accent-dark); font-weight:600;
    white-space:nowrap; }

  .lp-who { display:flex; align-items:center; gap:10px; white-space:nowrap; }
  .lp-avatar { display:inline-flex; align-items:center; justify-content:center; flex:none;
    width:30px; height:30px; border-radius:9999px; background:var(--sero-primary-200);
    color:var(--color-accent-dark); font-size:14px; font-weight:600; }
  .lp-avatar--dim { background:var(--color-page); color:var(--color-ink-dim); }
  .lp-who .lp-co { display:block; font-size:14px; color:var(--color-ink-dim); }

  .lp-feed { display:flex; flex-direction:column; gap:12px; }
  .lp-feed__item { display:flex; gap:12px; align-items:flex-start; cursor:pointer;
    border-radius:var(--radius-button); padding:4px; margin:-4px; }
  .lp-feed__item:hover { background:var(--color-surface-2); }
  .lp-feed__meta { font-size:14px; color:var(--color-ink-dim); margin-top:1px; }

  .lp-qa { border-top:1px solid var(--color-border); padding:12px 0; }
  .lp-qa:first-of-type { border-top:0; }
  .lp-qa__q { font-size:15px; font-weight:600; }
  .lp-qa__a { font-size:15px; color:var(--color-ink-dim); margin-top:4px;
    background:var(--color-page); border-radius:var(--radius-button); padding:8px 12px; }
  .lp-stars { color:var(--sero-gold-700); letter-spacing:2px; font-size:15px; }

  .lp-crumb { font-size:14px; color:var(--color-ink-dim); }
  .lp-crumb button { font:inherit; background:none; border:none; cursor:pointer; padding:0;
    color:var(--sero-link); font-weight:500; }
  .lp-crumb button:hover { text-decoration:underline; }
`;

// ---- small builders -------------------------------------------------------------------------
const pill = (kind, label) => `<span class="lp-pill lp-pill--${kind}">${label}</span>`;
const verdictPill = (v) =>
  v === "helpful" ? pill("back", "helpful") : v === "off" ? pill("gone", "off the mark") : `<span class="lp-crumb">—</span>`;
const stars = (n) =>
  n == null ? `<span class="lp-crumb">—</span>` : `<span class="lp-stars">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`;
const initials = (name) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const sparkline = () => {
  const w = 560, h = 88, max = Math.max(...SPARK), pad = 8;
  const pts = SPARK.map((v, i) => {
    const x = (i / (SPARK.length - 1)) * w;
    const y = h - pad - (v / max) * (h - 2 * pad);
    return [x, y];
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const last = pts[pts.length - 1];
  return `<svg class="lp-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Runs per day, last 14 days">
    <line x1="0" y1="${h - pad}" x2="${w}" y2="${h - pad}" stroke="var(--color-border)" stroke-width="1"/>
    <polygon points="0,${h - pad} ${line} ${w},${h - pad}" fill="var(--sero-primary-200)"/>
    <polyline points="${line}" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(--color-accent-dark)"/>
  </svg>`;
};

// ---- scenes ---------------------------------------------------------------------------------
export function mount(host) {
  const external = MANAGERS.filter((m) => !m.internal);
  const runsThisWeek = 6, runsLastWeek = 4;

  const openPulse = () => {
    host.innerHTML = `
      <style>${STYLE}</style>
      <div class="l-stack l-stack--4">
        <header class="page-header">
          <h1 class="h1">Live pulse</h1>
          <p class="text-ink-dim">The live site right now — managers, runs, who came back, what broke. You are counted separately as internal.</p>
        </header>

        <div class="lp-tiles">
          <div class="lp-tile lp-tile--hero">
            <div class="lp-tile__label">Came back unprompted</div>
            <div class="lp-tile__value">2 <span class="lp-den">of 3</span></div>
            <div class="lp-tile__note">Gate 1 bar: 2 of 3 <span class="lp-up">— on the bar</span></div>
          </div>
          <div class="lp-tile">
            <div class="lp-tile__label">Managers on live</div>
            <div class="lp-tile__value">3</div>
            <div class="lp-tile__note"><span class="lp-up">+1 this week</span></div>
          </div>
          <div class="lp-tile">
            <div class="lp-tile__label">Runs this week</div>
            <div class="lp-tile__value">${runsThisWeek}</div>
            <div class="lp-tile__note">last week ${runsLastWeek} <span class="lp-up">↑2</span> · 3 bi-weekly · 2 first · 1 feels-off</div>
          </div>
          <div class="lp-tile">
            <div class="lp-tile__label">Briefing rating</div>
            <div class="lp-tile__value">4.2</div>
            <div class="lp-tile__note">9 rated · <span class="lp-down">1 low</span></div>
          </div>
          <div class="lp-tile">
            <div class="lp-tile__label">Guest runs</div>
            <div class="lp-tile__value">3</div>
            <div class="lp-tile__note">1 became a signup</div>
          </div>
          <div class="lp-tile">
            <div class="lp-tile__label">Errors, 7 days</div>
            <div class="lp-tile__value">1</div>
            <div class="lp-tile__note">0 unresolved</div>
          </div>
        </div>

        <div class="lp-wide">
          <div class="lp-colstack">
            <div class="lp-card">
              <h3>Runs per day</h3>
              <p class="lp-hnote">Last 14 days, all live managers</p>
              ${sparkline()}
            </div>
            <div class="lp-card">
              <h3>Managers</h3>
              <p class="lp-hnote">Everyone registered on live — click a manager for their team and runs</p>
              <div class="lp-scroll"><table class="lp-table">
                <tr><th>Manager</th><th>Runs</th><th>Last active</th><th>First run</th><th>Status</th></tr>
                ${MANAGERS.map((m) => `
                  <tr data-link data-manager="${m.id}">
                    <td><span class="lp-who"><span class="lp-avatar${m.internal ? " lp-avatar--dim" : ""}">${initials(m.name)}</span><span>${m.name}<span class="lp-co">${m.company}</span></span></span></td>
                    <td class="num">${m.runs.length}</td><td>${m.lastActive}</td>
                    <td><span class="lp-crumb">${m.firstRun}</span></td>
                    <td>${pill(m.status.kind, m.status.label)}</td>
                  </tr>`).join("")}
              </table></div>
            </div>
            <div class="lp-card">
              <h3>Guest runs</h3>
              <p class="lp-hnote">Landed on the page, tried it without an account</p>
              <div class="lp-scroll"><table class="lp-table">
                <tr><th>When</th><th>Type</th><th>Got to</th><th>Then</th></tr>
                ${GUESTS.map((g) => `
                  <tr>
                    <td>${g.when}</td>
                    <td><span class="lp-type">${g.type}</span></td>
                    <td>${g.finished ? pill("back", "finished") : pill("gone", `stopped · ${g.stoppedAt}`)}</td>
                    <td><span class="lp-crumb">${g.claimed}</span></td>
                  </tr>`).join("")}
              </table></div>
            </div>
          </div>
          <div class="lp-colstack">
            <div class="lp-card">
              <h3>Where runs break off</h3>
              <p class="lp-hnote">Unfinished sessions by step, last 14 days</p>
              <div class="lp-bar"><span class="lp-bar__name">Setting up</span><div class="lp-bar__track"><div class="lp-bar__fill" style="width:8%"></div></div><span class="lp-bar__n">0</span></div>
              <div class="lp-bar"><span class="lp-bar__name">Questions</span><div class="lp-bar__track"><div class="lp-bar__fill lp-bar__fill--warn" style="width:70%"></div></div><span class="lp-bar__n">2</span></div>
              <div class="lp-bar"><span class="lp-bar__name">Briefing</span><div class="lp-bar__track"><div class="lp-bar__fill" style="width:38%"></div></div><span class="lp-bar__n">1</span></div>
              <div class="lp-bar"><span class="lp-bar__name">Debrief</span><div class="lp-bar__track"><div class="lp-bar__fill" style="width:8%"></div></div><span class="lp-bar__n">0</span></div>
            </div>
            <div class="lp-card">
              <h3>Latest feedback</h3>
              <p class="lp-hnote">Straight from the thumbs on live briefings — click to open the run</p>
              <div class="lp-feed">
                ${FEEDBACK_FEED.map((f) => `
                  <div class="lp-feed__item" data-run="${f.run}" data-manager="${f.manager}" role="button" tabindex="0">
                    ${pill(f.kind, f.tag)}
                    <div><div>${f.text}</div><div class="lp-feed__meta">${f.meta}</div></div>
                  </div>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>`;

    host.querySelectorAll("[data-manager]").forEach((el) =>
      el.addEventListener("click", () => {
        if (el.dataset.run) return openRun(el.dataset.manager, el.dataset.run);
        openManager(el.dataset.manager);
      }));
  };

  const openManager = (id) => {
    const m = MANAGERS.find((x) => x.id === id);
    if (!m) return openPulse();
    host.innerHTML = `
      <style>${STYLE}</style>
      <div class="l-stack l-stack--4">
        <div class="lp-crumb"><button type="button" class="js-back">← Live pulse</button> · ${m.company}</div>
        <header class="page-header">
          <h1 class="h1">${m.name}</h1>
          <p class="text-ink-dim">${m.company} · last active ${m.lastActive} · ${m.status.label}</p>
        </header>

        <div class="lp-split lp-split--team">
          <div class="lp-card">
            <h3>Their team</h3>
            <p class="lp-hnote">The people ${m.name.split(" ")[0]} runs 1:1s about</p>
            <div class="lp-scroll"><table class="lp-table">
              <tr><th>Person</th><th>Role</th><th>1:1s</th></tr>
              ${m.team.map((p) => `
                <tr>
                  <td><span class="lp-who"><span class="lp-avatar">${initials(p.name)}</span>${p.name}</span></td>
                  <td><span class="lp-crumb">${p.role}</span></td>
                  <td class="num">${p.runs}</td>
                </tr>`).join("")}
            </table></div>
          </div>

          <div class="lp-card">
            <h3>Their runs</h3>
            <p class="lp-hnote">Every 1:1 prep, with its type — click one for the answers and feedback</p>
            <div class="lp-scroll"><table class="lp-table">
              <tr><th>Date</th><th>With</th><th>Type</th><th>Status</th><th>Rating</th><th>Verdict</th></tr>
              ${m.runs.map((r) => `
                <tr data-link data-run="${r.id}">
                  <td>${r.date}</td>
                  <td>${r.person}</td>
                  <td><span class="lp-type">${r.type}</span></td>
                  <td>${r.finished ? pill("back", "finished") : pill("gone", `stopped · ${r.stoppedAt}`)}</td>
                  <td>${stars(r.rating)}</td>
                  <td>${verdictPill(r.verdict)}</td>
                </tr>`).join("")}
            </table></div>
          </div>
        </div>
      </div>`;
    host.querySelector(".js-back").addEventListener("click", openPulse);
    host.querySelectorAll("[data-run]").forEach((el) =>
      el.addEventListener("click", () => openRun(m.id, el.dataset.run)));
  };

  const openRun = (managerId, runId) => {
    const m = MANAGERS.find((x) => x.id === managerId);
    const r = m?.runs.find((x) => x.id === runId);
    if (!m || !r) return openPulse();
    const d = RUN_DETAILS[runId] ?? FALLBACK_DETAIL;
    host.innerHTML = `
      <style>${STYLE}</style>
      <div class="l-stack l-stack--4">
        <div class="lp-crumb"><button type="button" class="js-home">← Live pulse</button> · <button type="button" class="js-back">${m.name}</button> · ${r.date}</div>
        <header class="page-header">
          <h1 class="h1">${r.type} — ${r.person}</h1>
          <p class="text-ink-dim">${m.name}, ${m.company} · ${r.date} · ${d.duration}</p>
        </header>

        <div class="lp-split lp-split--run">
          <div class="lp-card">
            <h3>What ${m.name.split(" ")[0]} typed</h3>
            <p class="lp-hnote">The manager's own answers during this prep</p>
            ${d.answers.map((qa) => `
              <div class="lp-qa">
                <div class="lp-qa__q">${qa.q}</div>
                <div class="lp-qa__a">${qa.a}</div>
              </div>`).join("")}
          </div>

          <div class="lp-card">
            <h3>Feedback on this run</h3>
            ${d.feedback ? `
              <p class="lp-hnote">Left at the briefing, moments after reading it</p>
              <div class="lp-feed">
                <div class="lp-feed__item" style="cursor:default">
                  ${verdictPill(d.feedback.verdict)}
                  <div>
                    <div>${stars(d.feedback.rating)}</div>
                    <div style="margin-top:4px">${d.feedback.note}</div>
                  </div>
                </div>
              </div>` : `
              <p class="lp-hnote">No rating, verdict or note on this run${r.finished ? "" : " — it never reached the briefing"}.</p>`}
          </div>
        </div>
      </div>`;
    host.querySelector(".js-home").addEventListener("click", openPulse);
    host.querySelector(".js-back").addEventListener("click", () => openManager(m.id));
  };

  openPulse();
}
