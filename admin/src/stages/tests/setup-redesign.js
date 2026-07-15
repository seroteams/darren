// Test: the redesigned "/new" setup screen ("Who are you prepping for?"). Mock only —
// hardcoded data, zero API/engine calls, nothing saved. Opened from the /test gallery.
//
// Three changes Carl asked for on the live setup screen, shown here as a static mockup
// before touching the real stage (admin/src/stages/intake.js):
//   1 · No stage rail. The "Setup — Focus areas — … — Briefing" strip is gone; it belongs
//        only once a real 1:1 is running. (In this test area the global rail never renders,
//        so what you see is exactly the intended setup screen without it.)
//   2 · 50/50 layout. The "First time?" guide moves to the RIGHT; the picker sits on the
//        LEFT. Built on the design-system pair grid (.l-grid--pair), which collapses to one
//        column on phones.
//   3 · Name input on top. "Or add someone new" now sits ABOVE the existing people, not
//        below — adding someone is the primary move.
// Built with the app's real classes (.eyebrow/.h1/.hint/.input/.btn/.meeting-card/
// .intake-firstrun/.intake-progress) so it inherits the true setup look.

// ---- Mock data ---------------------------------------------------------------------------
const ROSTER = [
  { name: "Brandy", role: "Web Designer" },
  { name: "Render", role: "UX Lead" },
];

const FIRST_RUN_STEPS = [
  { title: "Who it's with", body: "Their first name and role. That's all Sero needs." },
  { title: "What's on your mind", body: "Rough notes, half-sentences, whatever's prompting this 1:1." },
  { title: "Your prep brief", body: "A focused plan: how to open, what to explore, what to listen for." },
];

// ---- Prototype-only CSS (scoped .sr-) — everything else is real app classes ---------------
const STYLE = `
  .sr-page { max-width:64rem; margin:0 auto; width:100%; }
  .sr-headrow { display:flex; align-items:flex-start; justify-content:space-between;
    gap:var(--sero-space-4); }
  .sr-progress { margin-top:var(--sero-space-3); }

  /* The two-column body: picker left, first-time guide right. Falls back to one column
     on phones via .l-grid--pair's own breakpoint. */
  .sr-body { align-items:start; }
  .sr-guide { align-self:start; }

  /* Roster cards — the same look as the real .meeting-card list. */
  .sr-cards { display:grid; gap:var(--sero-space-3); }
  .sr-or { display:flex; align-items:center; gap:var(--sero-space-3);
    color:var(--color-ink-mute); font-size:14px; margin:var(--sero-space-1) 0; }
  .sr-or::before, .sr-or::after { content:""; flex:1; height:1px; background:var(--color-border); }
`;

// ---- small builders (real app classes) -----------------------------------------------------
const rosterCardHtml = (p) => `
  <button type="button" class="meeting-card">
    <span class="meeting-card__label">${p.name}</span>
    <span class="meeting-card__meta">${p.role}</span>
  </button>`;

const firstRunGuideHtml = () => {
  const steps = FIRST_RUN_STEPS.map(
    (s, i) => `
      <li class="intake-firstrun__step">
        <span class="intake-firstrun__n" aria-hidden="true">${i + 1}</span>
        <span class="intake-firstrun__step-body">
          <span class="intake-firstrun__step-title">${s.title}</span>
          <span class="text-ink-dim text-sm">${s.body}</span>
        </span>
      </li>`,
  ).join("");
  return `
    <div class="intake-firstrun card-flat sr-guide">
      <div class="eyebrow">First time?</div>
      <div class="intake-firstrun__title">Your first prep, in three moves</div>
      <ol class="intake-firstrun__steps">${steps}</ol>
      <p class="text-ink-dim text-sm">About two minutes. Most managers spend zero.</p>
    </div>`;
};

// ---- mount ---------------------------------------------------------------------------------
export async function mount(root) {
  root.innerHTML = `
    <style>${STYLE}</style>
    <div class="sr-page l-stack l-stack--8">
      <header class="l-stack l-stack--2">
        <div class="sr-headrow">
          <div class="l-stack l-stack--1">
            <div class="eyebrow">Setup</div>
            <div class="text-ink-dim text-sm">Step 1 of 5</div>
          </div>
          <button type="button" class="btn btn--ghost">Cancel setup</button>
        </div>
        <p class="text-ink-dim">Two minutes of prep. One sharper conversation.</p>
        <div class="intake-progress sr-progress" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100">
          <div class="intake-progress__fill"></div>
        </div>
      </header>

      <div class="l-grid l-grid--pair sr-body">
        <!-- LEFT: the picker — name input ON TOP, existing people below -->
        <div class="l-stack l-stack--5">
          <div class="l-stack l-stack--1">
            <h1 class="h1">Who are you prepping for?</h1>
            <div class="hint">Pick someone from your team, or add someone new.</div>
          </div>

          <div class="l-stack l-stack--2">
            <div class="eyebrow">Add someone new</div>
            <input class="input" type="text" placeholder="e.g. Priya" aria-label="New person's name">
            <div class="field__actions">
              <button type="button" class="btn">Add &amp; continue</button>
            </div>
          </div>

          <div class="sr-or">or pick from your team</div>

          <div class="sr-cards">
            ${ROSTER.map(rosterCardHtml).join("")}
          </div>
        </div>

        <!-- RIGHT: the first-time guide -->
        ${firstRunGuideHtml()}
      </div>
    </div>`;
}
