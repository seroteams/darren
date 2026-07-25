// First-run guidance for a brand-new manager account (validation-kit Phase 4).
// A zero-run manager now lands on Home (START), so firstRunIntroHtml() is hosted
// in the zero-run empty state of start-core.js; it is also shown above the first
// intake step. The copy is fixed by the house rules — UK English, plain words,
// no exclamation marks, 14px floor — and kept as pure functions so the copy
// contract is unit-tested (mirrors welcome.ts).

// One honest example of what useful notes look like — a real manager's voice, not
// a "write some notes" prompt. It carries a behaviour change and a rough timeframe,
// which is exactly what makes notes worth writing.
export const GOOD_NOTES_EXAMPLE =
  "Quieter in stand-ups since the reorg about three weeks ago. Still delivering, but the spark has gone. I want to understand what changed before it settles in.";

const STEPS: Array<{ title: string; body: string }> = [
  { title: "Who it's with", body: "Their first name and role. That's all Sero needs." },
  { title: "What's on your mind", body: "Rough notes, half-sentences, whatever's prompting this 1:1." },
  { title: "Your prep brief", body: "A focused plan: how to open, what to explore, what to listen for." },
];

// An honest expectation. It is deliberately about the TYPING, not the whole flow:
// welcome.ts claims "about two minutes" end to end and nobody has timed that
// recently, so we don't repeat an unmeasured promise on a second screen.
const TIME_LINE = "About two minutes of typing.";

export interface FirstRunIntroOpts {
  /** Home only: render an empty host for the screen's ONE blue button, so the
   *  invitation and the way in are the same object. The intake screen leaves this
   *  off and gets exactly the card it always had. */
  actionSlot?: boolean;
}

// The orientation card shown above the first intake step for a zero-run account,
// and (with actionSlot) as Home's zero-run invitation.
export function firstRunIntroHtml(opts: FirstRunIntroOpts = {}): string {
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
  const action = opts.actionSlot
    ? `
      <div class="intake-firstrun__action">
        <span class="js-start-slot"></span>
        <span class="text-ink-dim text-sm">${TIME_LINE}</span>
      </div>`
    : "";
  return `
    <div class="intake-firstrun card-flat">
      <div class="eyebrow">First time?</div>
      <div class="intake-firstrun__title">Your first prep, in three moves</div>
      <ol class="intake-firstrun__steps">${steps}</ol>${action}
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
