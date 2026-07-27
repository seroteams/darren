// The welcome: what a brand-new manager sees on Home before they have run a single 1:1.
//
// Rebuilt 2026-07-27 as "start typing" (Carl picked option B of five, prototype at
// stages/tests/welcome-lean.js). The notes box IS the screen: the fastest way to explain
// that Sero runs on rough typed notes is to hand the manager the box and let them type
// into it. What they type is carried straight into the prep wizard's notes step, so the
// first thing they did was the first real step, not a warm-up.
//
// What the version before it got wrong, measured off the live screen rather than taste:
//   1 · It ran 1421px tall at desktop. Headline, then a video line, then an eight-cell
//       grid of complaints, then a sample brief. A manager who came to prep a 1:1 had to
//       scroll past an argument before they could start one.
//   2 · The four "things managers tell us" were the loudest block on the page. That is a
//       landing page for someone deciding whether to buy, and this manager already
//       signed up. Being told your 1:1s are bad, at length, after signing up, is a cost.
//   3 · The one blue action sat at the top and never appeared again through two more
//       screens of reading.
//   4 · "Focus points" and "it gets sharper as you use it" are the two things worth
//       knowing about Sero and neither was on the screen.
//
// So: headline, one line, the box, the button in the box, and one paragraph under it
// that carries both the middle of the flow and the reason to come back. The sample brief
// and the walkthrough are still reachable, as two quiet text links, because the seeded
// example run has no other door on a first visit.
//
// SAMPLE_BRIEF is the seeded example run's real prep brief, quoted verbatim from
// content/demo/demo-run.json (start-welcome.test.ts fails if the two drift apart). It is
// no longer rendered here, but the prototypes under stages/tests/ quote it and the drift
// test still guards it, so it stays exported rather than retyped in five places.
//
// Pure string renderers so the copy contract is unit-tested, mirroring
// intake-firstrun.ts. House rules: UK English, plain words, no em dashes, 14px floor.
import { escapeHtml } from "../ui/html.js";

// The headline asks a question, and the box below it is where the answer goes. That
// pairing is the whole screen: no instruction to read, just somewhere to start.
export const HEADLINE = "Who is your next 1:1 with?";

// The lede's only job is to lower the bar for typing. It is not positioning.
export const INPUT_LINE = "Whatever you already know. Half sentences are fine.";

/** The example inside the empty box. It teaches the input style by being it: fragments,
 *  no capitals, no punctuation to speak of. Written as the notes that would have
 *  produced SAMPLE_BRIEF, so the example a manager reads and the example run they can
 *  open are the same person. */
export const NOTES_PLACEHOLDER = `sofia, product designer, mid level
flat in design reviews lately
shipped checkout fine but quiet in the crits`;

// What happens after the button, in one paragraph. Sentence one is the middle of the
// flow (Dunford seat, committee 2026-07-25: the screen has to name the back and forth,
// or the brief looks like it came from nowhere). Sentence two is the reason to run a
// second one, which is the only thing that turns this into a habit.
export const POSITIONING_LINE =
  "Sero asks you two or three questions back, then hands you the focus points for the conversation. Every 1:1 you run makes the next one sharper.";

// Honest about the typing, not the whole flow: nobody has re-timed end to end.
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
// the link below is local markup, so nothing reaches Google until a manager asks for
// the video. That is also why the CSP only needs frame-src, not img-src.
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

/** The walkthrough and the example, demoted to two quiet text links on one row. Neither
 *  is the job of this screen, but the seeded example has no other way in once the
 *  recents list is hidden, and a dead end is worse than a small link. */
export const VIDEO_LINK = "Watch the two minute walkthrough";
export const EXAMPLE_LINK = "See an example brief";

export interface FirstVisitOpts {
  /** The seeded example run's id, when the account has one: turns the footer link into a
   *  way into the real thing. Absent means no link, never a dead one. */
  exampleRunId?: string | null;
}

// Home's first-visit view. It brings its own eyebrow, title and lede because the
// standard page header ("Work / Prep a 1:1") assumes you already know what Sero is.
export function firstVisitHtml(opts: FirstVisitOpts = {}): string {
  const example = opts.exampleRunId
    ? `<button type="button" class="start-quiet__link js-open-example" data-id="${escapeHtml(opts.exampleRunId)}">${EXAMPLE_LINK}</button>`
    : "";

  // The button lives INSIDE the box, on the same row as the time line, because the box
  // is the thing being submitted. js-start-slot is the hook Home moves the one blue
  // button into (start-core.js) so the screen still has exactly one accent object.
  return `
    <div class="start-welcome">
      <header class="start-welcome__intro">
        <div class="eyebrow">Welcome to Sero</div>
        <h1 class="h1">${HEADLINE}</h1>
        <p class="start-welcome__lede">${INPUT_LINE}</p>
      </header>

      <div class="start-notes">
        <textarea
          class="start-notes__field js-first-notes"
          aria-label="Rough notes about the person and what is on your mind"
          rows="4"
          placeholder="${escapeHtml(NOTES_PLACEHOLDER)}"
        ></textarea>
        <div class="start-notes__foot">
          <span class="text-ink-dim text-sm">${TIME_LINE}</span>
          <span class="js-start-slot"></span>
        </div>
      </div>

      <p class="start-welcome__after">${POSITIONING_LINE}</p>

      <div class="start-quiet">
        <span class="start-video js-video">
          <button type="button" class="start-quiet__link js-play-video">${VIDEO_LINK}</button>
        </span>
        ${example}
      </div>
    </div>
  `;
}
