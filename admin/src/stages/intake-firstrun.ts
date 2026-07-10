// First-run guidance for a brand-new manager account (validation-kit Phase 4).
// A zero-run manager boots straight into intake (frontend/src/main.js:307-322),
// so the orientation lives here rather than on Home. The copy is fixed by the
// house rules — UK English, plain words, no exclamation marks, 14px floor — and
// kept as pure functions so the copy contract is unit-tested (mirrors welcome.ts).

// One honest example of what useful notes look like — a real manager's voice, not
// a "write some notes" prompt. It carries a behaviour change and a rough timeframe,
// which is exactly what makes notes worth writing.
export const GOOD_NOTES_EXAMPLE =
  "Quieter in stand-ups since the reorg about three weeks ago. Still delivering, but the spark has gone. I want to understand what changed before it settles in.";

const STEPS: Array<{ title: string; body: string }> = [
  { title: "Who it's with", body: "The person and their role." },
  { title: "Your notes", body: "What's prompting this 1:1, in your own words." },
  { title: "Your briefing", body: "Sero turns that into a focused prep and sharper questions." },
];

// The orientation card shown above the first intake step for a zero-run account.
export function firstRunIntroHtml(): string {
  const steps = STEPS.map(
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
    <div class="intake-firstrun card-flat">
      <div class="eyebrow">New here</div>
      <div class="intake-firstrun__title">Here's how your first prep works</div>
      <ol class="intake-firstrun__steps">${steps}</ol>
      <p class="text-ink-dim text-sm">About two minutes, start to finish.</p>
    </div>
  `;
}

// The honest notes example, shown on the notes step for a zero-run account only.
export function firstRunNotesExampleHtml(): string {
  return `
    <div class="intake-firstrun-note">
      <div class="eyebrow">What good notes look like</div>
      <p class="text-ink-dim text-sm">${GOOD_NOTES_EXAMPLE}</p>
    </div>
  `;
}
