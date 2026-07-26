// The welcome: what a brand-new manager sees on Home before they have run a single 1:1.
//
// Rebuilt 2026-07-26 as the "stage ladder" (Carl picked version A of five, prototype at
// stages/tests/welcome-redesign.js). What the previous version got wrong, read off the
// live screen rather than taste:
//   1 · Two columns where the right one held only a video poster, and on live that
//       poster was showing YouTube "Error 153". The loudest object on the screen was an
//       error message, and the page ended a third of the way down.
//   2 · It never said what Sero does. A stranger saw a finished brief and had to work
//       the product out backwards from it.
//   3 · The sample brief was carrying both jobs, proof AND explanation, and it cannot
//       carry both.
//
// So: one column, the action high, then four steps that each lead with what the manager
// gets, then the sample brief underneath as proof of step 3. The walkthrough video is
// now a line of text, not a black rectangle.
//
// Committee 2026-07-26 (log: logs/committee/2026-07-26-welcome-screen-five-versions.html)
// changed this before it was built: action above the fold (Seibel), benefit before
// mechanism (Dunford), reported behaviour not invented despair (Rogelberg), and the
// right-hand column deleted rather than refilled (Andersson).
//
// The sample IS the seeded example run's real prep brief, quoted verbatim from
// content/demo/demo-run.json (start-welcome.test.ts fails if the two drift apart).
// Nothing here is invented copy dressed up as engine output, and the card says
// "Sample brief" on its face.
//
// Pure string renderers so the copy contract is unit-tested, mirroring
// intake-firstrun.ts. House rules: UK English, plain words, no em dashes, 14px floor.
import { escapeHtml } from "../ui/html.js";

// The trigger line (Dunford seat, committee 2026-07-25): the screen already showed
// what Sero makes but never when to reach for it. This is the "when". Reworded
// 2026-07-26 to name the middle of the flow too, because the four steps below now
// promise a back and forth and the lede has to set it up.
export const POSITIONING_LINE =
  "Type rough notes before your next 1:1. Sero asks a few questions back, then hands you a plan for the conversation.";

// Honest about the typing, not the whole flow — the same restraint as
// intake-firstrun.ts: nobody has re-timed end to end.
export const TIME_LINE = "About two minutes of typing.";

/** The seeded example's real prep brief. Verbatim from content/demo/demo-run.json
 *  (state.preparationResult.brief + state.ctx), pinned by the drift test. */
export const SAMPLE_BRIEF = {
  name: "Sofia",
  meetingType: "Bi-weekly check-in",
  open: "How has the last couple of weeks felt from your side, especially when you’ve been in design reviews?",
  explore:
    "This bi-weekly check-in is likely about what is changing Sofia’s energy in design reviews and what support a mid-level Product Designer needs right now.",
  listenFor: "whether she names a specific recent review, project, or stakeholder instead of speaking only in generalities",
} as const;

// Carl's walkthrough on YouTube. Privacy mode (youtube-nocookie) AND click to play:
// the poster below is local markup, so nothing reaches Google until a manager asks
// for the video. That is also why the CSP only needs frame-src, not img-src.
export const VIDEO = {
  id: "Xve0NyKH7Co",
  startSeconds: 49,
  host: "https://www.youtube-nocookie.com",
  title: "How Sero works",
} as const;

/** The player, built only on click. autoplay is honest here: the click WAS the play.
 *
 *  referrerpolicy is load-bearing, not decoration. The site sends
 *  `Referrer-Policy: same-origin`, so a cross-origin frame gets no referrer at all
 *  unless the element overrides it, and YouTube then cannot check whether this
 *  domain is allowed to embed: the player answers "Error 153, video player
 *  configuration error" and shows a black box. A 2026-07-26 hardening pass set this
 *  to no-referrer and broke the video on live. Origin only (no path, no query) is
 *  the least we can send and still have a player. */
export function videoIframeHtml(): string {
  const src = `${VIDEO.host}/embed/${VIDEO.id}?start=${VIDEO.startSeconds}&amp;autoplay=1&amp;rel=0`;
  return `
    <iframe
      class="start-video__frame"
      src="${src}"
      title="${VIDEO.title}"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>
  `;
}

const SECTIONS: Array<{ label: string; key: "open" | "explore" | "listenFor" }> = [
  { label: "How to open", key: "open" },
  { label: "What to explore", key: "explore" },
  { label: "What to listen for", key: "listenFor" },
];

/** How Sero works, in the order it happens. Benefit first, mechanism second: a manager
 *  buys "no blank first minute", not "a preparation stage". The order is real, which is
 *  the only reason these carry numbers. */
export const STEPS = [
  {
    benefit: "Two minutes of typing, not a form.",
    title: "Say what is on your mind",
    body: "Their first name, their role, and rough notes. Half sentences are fine.",
  },
  {
    benefit: "It finds the real issue under the notes.",
    title: "Sero asks you back",
    body: "A short back and forth about what you actually saw, so the plan is about this 1:1 and not 1:1s in general.",
  },
  {
    benefit: "No blank first minute.",
    title: "Walk in with a brief",
    body: "How to open, what to explore, what to listen for, what to avoid, and what a good outcome looks like.",
  },
  {
    benefit: "Follow through without a spreadsheet.",
    title: "The next one picks up here",
    body: "What you both agreed comes back at the top of the next 1:1, so nothing quietly evaporates.",
  },
] as const;

/** The walkthrough, demoted to a line of text. It used to be a 16:9 black box holding a
 *  third of the screen; the player still appears in place when it is asked for. */
export const VIDEO_LINK = "Watch the two minute walkthrough";

export interface FirstVisitOpts {
  /** The seeded example run's id, when the account has one: turns the sample card's
   *  footer into a way into the real thing. Absent means no link, never a dead one. */
  exampleRunId?: string | null;
}

// Home's first-visit view. It brings its own eyebrow, title and lede because the
// standard page header ("Work / Prep a 1:1") assumes you already know what Sero is.
export function firstVisitHtml(opts: FirstVisitOpts = {}): string {
  const rows = SECTIONS.map(
    (s) => `
      <div class="start-sample__row">
        <div class="start-sample__label">${s.label}</div>
        <p class="text-ink-dim text-sm">${SAMPLE_BRIEF[s.key]}</p>
      </div>`,
  ).join("");

  const link = opts.exampleRunId
    ? `<button type="button" class="start-sample__link js-open-example" data-id="${escapeHtml(opts.exampleRunId)}">See the whole example 1:1</button>`
    : "";

  const steps = STEPS.map(
    (s, i) => `
      <li class="start-step card-flat">
        <span class="start-step__n" aria-hidden="true">${i + 1}</span>
        <span class="start-step__benefit">${s.benefit}</span>
        <span class="start-step__title">${s.title}</span>
        <p class="start-step__body">${s.body}</p>
      </li>`,
  ).join("");

  return `
    <div class="start-welcome">
      <header class="start-welcome__intro">
        <div class="eyebrow">Welcome to Sero</div>
        <h1 class="h1">Walk in knowing what to say</h1>
        <p class="start-welcome__lede">${POSITIONING_LINE}</p>
        <div class="start-welcome__action">
          <span class="js-start-slot"></span>
          <span class="text-ink-dim text-sm">${TIME_LINE}</span>
          <span class="start-video js-video">
            <button type="button" class="start-video__link js-play-video">${VIDEO_LINK}</button>
          </span>
        </div>
      </header>

      <section class="start-welcome__sec">
        <div class="start-welcome__sec-head">
          <h2 class="start-welcome__sec-title">How it works</h2>
          <p class="start-welcome__sec-sub">Four steps, start to finish.</p>
        </div>
        <ol class="start-steps">${steps}</ol>
      </section>

      <section class="start-welcome__sec">
        <div class="start-welcome__sec-head">
          <h2 class="start-welcome__sec-title">What comes out</h2>
          <p class="start-welcome__sec-sub">The plan a manager walks in with. This one is real, from the example 1:1.</p>
        </div>
        <div class="start-sample card-flat">
          <div class="start-sample__head">
            <span class="start-sample__who">${SAMPLE_BRIEF.name} · ${SAMPLE_BRIEF.meetingType}</span>
            <span class="run-list__example">Sample brief</span>
          </div>
          <div class="start-sample__body">${rows}</div>
          ${link}
        </div>
      </section>
    </div>
  `;
}
