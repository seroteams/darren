// Test: the "Promises loop" inside the REAL runner (the /interview screen). Mock only —
// hardcoded data, zero API/engine calls, nothing saved. Opened from the /test gallery.
//
// Four scenes, advanced by each scene's own call-to-action:
//   1 · Question 9 of 9    — the last question of a 1:1, with Carl's fork:
//                            PRIMARY "Agree next actions →" · ghost "Finish — skip to briefing".
//   2 · "Before we wrap"   — lock in what you two agreed (mirrors the agenda closing-check
//                            card in questioning.js — the same spot the real feature would live).
//   3 · "Before question 1"— two weeks later: CARD ZERO of the next runner. The promises come
//                            back — the MANAGER'S OWN first, then Aisha's (mutual follow-through,
//                            not an accountability audit), ~90 seconds, one tap each
//                            (yes/partly/no/changed — the orphaned Session.outcomeCheck enum).
//   4 · Question 1 of 9    — the session begins, and the first question REFERENCES the check-in.
// Placement per the design verdict (2026-07-11): beginning wins — follow-through on prior
// commitments is the strongest trust signal in recurring meetings; end-of-meeting slots get
// cut. Two rules: manager's promises first; 90 seconds then move on.
// Built with the app's real classes so it inherits the true runner look.

// ---- Mock data ---------------------------------------------------------------------------
const CTX_SEGMENTS = ["Aisha", "junior", "Product designer", "Onboarding check-in"];

// owner: "you" = the manager's own commitment — always listed FIRST (mutual follow-through).
const PROMISES = [
  { owner: "you", when: "this week", action: "Book Aisha's onboarding buddy" },
  { owner: "Aisha", when: "before next 1:1", action: "Track where her hours actually go for a week" },
];
const EXTRA_PROMISE = { owner: "you", when: "this month", action: "Intro Aisha to the design guild" };

const OUTCOMES = [
  { value: "yes", label: "Yes" },
  { value: "partly", label: "Partly" },
  { value: "no", label: "No" },
  { value: "changed", label: "Changed" },
];
const OUTCOME_LABEL = { yes: "done", partly: "partly done", no: "not done", changed: "changed" };

const Q9_NOTES = "buddy still not sorted — i'll book it this week. workload heavy but she can't tell where the time goes — she'll track her hours for a week and we look at it together next time.";

// End-of-session axis read (scene 1–2); the fresh session (scene 3–4) shows baselines.
const AXES_END = [
  { label: "Wellbeing", value: -1, scale: 0.25 },
  { label: "Engagement", value: 2, scale: 0.5 },
  { label: "Clarity", value: 1, scale: 0.25 },
  { label: "Growth", value: 0, scale: 0 },
];

// ---- Prototype-only CSS (scoped .pl-) — chips, promise rows, owner pills, interstitial.
// Everything else on screen comes from the app's real stylesheets. ---------------------------
const STYLE = `
  .pl-later { display:flex; align-items:center; gap:var(--sero-space-3);
    color:var(--color-ink-mute); font-size:14px; margin:var(--sero-space-2) 0; }
  .pl-later::before, .pl-later::after { content:""; flex:1; height:1px;
    background:var(--color-border); }

  .pl-promise { display:flex; align-items:flex-start; gap:var(--sero-space-3);
    padding:var(--sero-space-3) 0; border-top:1px solid var(--color-border); }
  .pl-promise:first-of-type { border-top:0; }
  .pl-promise__dot { width:8px; height:8px; border-radius:9999px; margin-top:8px; flex:none;
    background:var(--color-accent); }
  .pl-promise__body { flex:1; min-width:0; }
  .pl-promise__action { font-size:16px; color:var(--color-ink); }
  .pl-promise__meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
  .pl-owner { display:inline-block; font-size:14px; font-weight:600; border-radius:9999px;
    padding:1px 10px; }
  .pl-owner--you { background:var(--sero-primary-200); color:var(--color-accent-dark); }
  .pl-owner--them { background:var(--sero-soft-500); color:var(--color-ink-dim); }
  .pl-promise__when { display:inline-block; font-size:14px; color:var(--color-ink-dim);
    border:1px solid var(--color-border); border-radius:9999px; padding:0 10px; }

  .pl-chips { display:flex; flex-wrap:wrap; gap:var(--sero-space-2); margin-top:var(--sero-space-2); }
  .pl-chip { font:inherit; font-size:14px; cursor:pointer; padding:6px 14px;
    background:var(--color-surface); color:var(--color-ink-dim);
    border:1px solid var(--color-border); border-radius:var(--radius-button);
    transition:background .12s ease, color .12s ease, border-color .12s ease; }
  .pl-chip:hover { border-color:var(--color-accent); color:var(--color-ink); }
  .pl-chip:focus-visible { outline:none; box-shadow:var(--shadow-focus); }
  .pl-chip[data-selected] { font-weight:600; }
  .pl-chip[data-value="yes"][data-selected]     { background:var(--sero-mint-100);     color:var(--color-positive-text); border-color:var(--sero-mint-700); }
  .pl-chip[data-value="partly"][data-selected]  { background:var(--sero-gold-100);     color:var(--sero-gold-900);       border-color:var(--sero-gold-700); }
  .pl-chip[data-value="no"][data-selected]      { background:var(--sero-coral-100);    color:var(--color-negative-text); border-color:var(--sero-coral-700); }
  .pl-chip[data-value="changed"][data-selected] { background:var(--sero-lavender-200); color:var(--sero-lavender-800);   border-color:var(--sero-lavender-700); }

  .pl-loopnote { display:flex; align-items:center; gap:var(--sero-space-2);
    font-size:14px; color:var(--sero-lavender-800); background:var(--sero-lavender-200);
    border-radius:var(--radius-button); padding:10px 14px; }
  .pl-mocknote { font-size:14px; color:var(--color-ink-mute); font-style:italic;
    margin-top:var(--sero-space-2); }
  .pl-footnav { display:flex; justify-content:space-between; align-items:center;
    margin-top:var(--sero-space-2); font-size:14px; color:var(--color-ink-mute); }
`;

// ---- small builders (real app classes) -----------------------------------------------------
const ctxHtml = () =>
  CTX_SEGMENTS.map(
    (s, i) => `${i ? `<span class="sep">·</span>` : ""}<span${i === 0 ? ` class="is-strong"` : ""}>${s}</span>`,
  ).join("");

const axesHtml = (fresh) => {
  const rows = AXES_END.map((a) => {
    if (fresh || a.value === 0) {
      return `<div class="axis"><div class="axis__label">${a.label}</div>
        <div class="axis__track"><div class="axis__midline"></div><div class="axis__fill axis__fill--neutral"></div></div>
        <div class="axis__value axis__value--baseline">—</div></div>`;
    }
    const dir = a.value > 0 ? "positive" : "negative";
    return `<div class="axis"><div class="axis__label">${a.label}</div>
      <div class="axis__track"><div class="axis__midline"></div>
        <div class="axis__fill axis__fill--${dir}" style="transform:scaleX(${a.scale})"></div></div>
      <div class="axis__value">${a.value > 0 ? "+" : ""}${a.value}</div></div>`;
  }).join("");
  return `<div class="axes-wrap space-y-2" aria-label="Live scores">
    <div class="eyebrow">Live scores</div><div class="card axes-host">${rows}</div></div>`;
};

const ownerPill = (p) =>
  p.owner === "you"
    ? `<span class="pl-owner pl-owner--you">You</span>`
    : `<span class="pl-owner pl-owner--them">${p.owner}</span>`;

const promiseRow = (p, inner = "") => `
  <div class="pl-promise">
    <span class="pl-promise__dot"></span>
    <div class="pl-promise__body">
      <div class="pl-promise__action">${p.action}</div>
      <div class="pl-promise__meta">${ownerPill(p)}<span class="pl-promise__when">${p.when}</span></div>
      ${inner}
    </div>
  </div>`;

const chipsRow = (i, chosen) =>
  `<div class="pl-chips" role="group" aria-label="Did it happen?">${OUTCOMES.map(
    (o) => `<button type="button" class="pl-chip" data-item="${i}" data-value="${o.value}"${
      chosen === o.value ? " data-selected" : ""
    }>${o.label}</button>`,
  ).join("")}</div>`;

// Manager's own commitments always render first (rule 1: mutual follow-through — "I said
// I'd check the budget, here's where that is" — before asking about theirs).
const yoursFirst = (list) => [...list].sort((a, b) => (a.owner === "you" ? -1 : 1) - (b.owner === "you" ? -1 : 1));

// ---- the four scenes ------------------------------------------------------------------------
function sceneHtml(state) {
  const promises = yoursFirst(state.added ? [...PROMISES, EXTRA_PROMISE] : PROMISES);

  if (state.scene === 0) {
    return {
      label: "Question 9 of 9",
      before: "",
      axes: axesHtml(false),
      card: `
        <div class="question-card-head">
          <div class="question-card-head__text space-y-2">
            <h1 class="question-stem leading-snug">What would make the next two weeks feel lighter for Aisha than the last two?</h1>
          </div>
        </div>
        <label class="block"><span class="sr-only">Your notes</span>
          <textarea class="textarea textarea--question" rows="5" aria-label="Your notes">${Q9_NOTES}</textarea>
        </label>
        <div class="field__actions">
          <button class="btn" data-go="1">Agree next actions →</button>
          <button class="btn btn--ghost" data-mock-finish>Finish — skip to briefing</button>
        </div>
        <div class="pl-mocknote" data-finish-note hidden>(mock) That path ends the 1:1 at the briefing — nothing carries forward. The primary button is where the loop starts.</div>
        <p class="hint hint--kbd text-xs text-ink-mute">Enter · Skip · Esc</p>`,
    };
  }

  if (state.scene === 1) {
    const rows = promises.map((p) => promiseRow(p)).join("");
    return {
      label: "Before we wrap",
      before: "",
      axes: axesHtml(false),
      card: `
        <div class="question-card-head">
          <div class="question-card-head__text space-y-2">
            <h1 class="question-stem leading-snug">Lock in what you two agreed</h1>
            <div class="question-desc">Sero heard these in your notes — yours first. They'll come back at the start of your next 1:1, so nothing gets lost.</div>
          </div>
        </div>
        <div>${rows}</div>
        ${state.added ? "" : `<button class="btn btn--ghost" data-add>+ Add another</button>`}
        <div class="pl-loopnote">↩&nbsp; These come back at the start of your next 1:1 with Aisha.</div>
        <div class="field__actions">
          <button class="btn" data-go="2">Lock these in → briefing</button>
          <button class="btn btn--ghost" data-go="0">← Back</button>
        </div>`,
    };
  }

  if (state.scene === 2) {
    const allAnswered = promises.every((_, i) => state.outcomes[i]);
    const rows = promises.map((p, i) => promiseRow(p, chipsRow(i, state.outcomes[i]))).join("");
    return {
      label: "Before question 1",
      before: `<div class="pl-later">two weeks later — your next 1:1 with Aisha</div>`,
      axes: axesHtml(true),
      card: `
        <div class="question-card-head">
          <div class="question-card-head__text space-y-2">
            <h1 class="question-stem leading-snug">Last time's promises — did they happen?</h1>
            <div class="question-desc">Yours first, then Aisha's. One tap each — about 90 seconds, then into the questions.</div>
          </div>
        </div>
        <div>${rows}</div>
        <div class="field__actions">
          <button class="btn" data-go="3" ${allAnswered ? "" : "disabled"}>Start the questions →</button>
          <button class="btn btn--ghost" data-go="1">← Back</button>
        </div>`,
    };
  }

  // scene 3 — Question 1 of 9: the first question references the check-in (the payoff).
  const open = promises.findIndex((_, i) => state.outcomes[i] && state.outcomes[i] !== "yes");
  const p = open >= 0 ? promises[open] : null;
  const stem = p
    ? p.owner === "you"
      ? `You marked “${p.action.toLowerCase()}” as ${OUTCOME_LABEL[state.outcomes[open]]} — where does that stand today?`
      : `You marked “${p.action.toLowerCase()}” as ${OUTCOME_LABEL[state.outcomes[open]]} — what got in the way for Aisha?`
    : `Everything you agreed last time landed — nice. What deserves the spotlight today?`;
  return {
    label: "Question 1 of 9",
    before: "",
    axes: axesHtml(true),
    card: `
      <div class="question-drill-hint text-ink-dim">↳ Picked up from your check-in a moment ago.</div>
      <div class="question-card-head">
        <div class="question-card-head__text space-y-2">
          <h1 class="question-stem leading-snug">${stem}</h1>
        </div>
      </div>
      <label class="block"><span class="sr-only">Your notes</span>
        <textarea class="textarea textarea--question" rows="5" placeholder="Jot what they said — your shorthand, not a transcript" aria-label="Your notes"></textarea>
      </label>
      <div class="field__actions">
        <button class="btn" data-mock-submit>Submit answer</button>
        <button class="btn btn--ghost" data-mock-submit>Skip</button>
      </div>
      <div class="pl-mocknote" data-submit-note hidden>(mock) From here it's the normal runner — question by question to the briefing, where the loop wraps again.</div>
      <div class="pl-loopnote">↻&nbsp; That's the loop — every 1:1 picks up exactly where the last one left off.</div>
      <p class="hint hint--kbd text-xs text-ink-mute">Enter · Skip · Esc</p>
      <div class="pl-footnav">
        <button class="btn btn--ghost" data-go="2">← Back</button>
        <button class="btn btn--ghost" data-restart>Start over ↻</button>
      </div>`,
  };
}

// ---- render + wire ---------------------------------------------------------------------------
// Mounts into a host element provided by the /test gallery stage.
export function mount(root) {
  const state = { scene: 0, outcomes: {}, added: false };

  const render = () => {
    const s = sceneHtml(state);
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="stage-questioning l-stack l-stack--6">
        ${s.before}
        <header class="page-header">
          <div class="page-header__row">
            <div class="questioning-head min-w-0 space-y-1">
              <p class="turn-label page-header__step">${s.label}</p>
              <div class="question-session-ctx ctx-segments" aria-label="Session context">${ctxHtml()}</div>
            </div>
            <button class="btn btn--ghost shrink-0" data-mock-finish type="button">Skip to briefing</button>
          </div>
        </header>
        <div class="question-host">
          <div class="card questioning-card space-y-4 reveal">${s.card}</div>
        </div>
        ${s.axes}
      </div>`;
    // Settle the card in with the runner's own reveal motion.
    const card = root.querySelector(".questioning-card");
    requestAnimationFrame(() => card?.classList.add("is-in"));
    wire();
  };

  const go = (scene) => {
    state.scene = scene;
    render();
    root.scrollIntoView({ block: "start" });
  };

  function wire() {
    root.querySelectorAll("[data-go]").forEach((b) =>
      b.addEventListener("click", () => go(Number(b.dataset.go))));
    root.querySelector("[data-add]")?.addEventListener("click", () => { state.added = true; render(); });
    root.querySelector("[data-restart]")?.addEventListener("click", () => {
      state.outcomes = {}; state.added = false; go(0);
    });
    // The dead-end paths just explain themselves instead of pretending to work.
    root.querySelectorAll("[data-mock-finish]").forEach((b) =>
      b.addEventListener("click", () => {
        const note = root.querySelector("[data-finish-note]");
        if (note) note.hidden = false;
      }));
    root.querySelectorAll("[data-mock-submit]").forEach((b) =>
      b.addEventListener("click", () => {
        const note = root.querySelector("[data-submit-note]");
        if (note) note.hidden = false;
      }));
    // Check-in chips: single-select per promise, persisted in state across re-renders.
    root.querySelectorAll(".pl-chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        state.outcomes[chip.dataset.item] = chip.dataset.value;
        render();
      }));
  }

  render();
}
