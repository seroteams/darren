// The welcome: what a brand-new manager sees on Home before they have run a single 1:1.
//
// Rebuilt 2026-07-29 as "three focus points" (Carl picked option C of five, prototype at
// stages/tests/welcome-lean.js). The real output is the screen: three numbered lines from
// the seeded example, shown before anything is asked for. The bet is that the shape of a
// brief teaches what a good prep is faster than any sentence describing one.
//
// It replaces "start typing" (option B, 2026-07-27), which put an empty notes box on the
// welcome. B was short but it showed a newcomer nothing: an empty rectangle cannot teach
// what comes out the other end, so the screen read as blank.
//
// What the version before B got wrong, measured off the live screen rather than taste:
//   1 · It ran 1421px tall at desktop. Headline, then a video line, then an eight-cell
//       grid of complaints, then a sample brief. A manager who came to prep a 1:1 had to
//       scroll past an argument before they could start one.
//   2 · The four "things managers tell us" were the loudest block on the page. That is a
//       landing page for someone deciding whether to buy, and this manager already
//       signed up. Being told your 1:1s are bad, at length, after signing up, is a cost.
//   3 · The one blue action sat at the top and never appeared again through two more
//       screens of reading.
//
// So: headline, one line, the button, the three points, and one paragraph under them.
// The action sits ABOVE the card, so the proof is what a manager scrolls into rather
// than what they scroll past. The walkthrough and the full example run stay reachable as
// two quiet text links, because the seeded run has no other door on a first visit.
//
// SAMPLE_BRIEF is the seeded example run's real prep brief, quoted verbatim from
// content/demo/demo-run.json (start-welcome.test.ts fails if the two drift apart). The
// card below renders it as-is: what a newcomer reads and the run they can open are the
// same three lines, so the screen can never oversell what the engine actually returns.
//
// Pure string renderers so the copy contract is unit-tested, mirroring
// intake-firstrun.ts. House rules: UK English, plain words, no em dashes, 14px floor.
import { escapeHtml } from "../ui/html.js";

// The headline names the thing a manager walks away with, not the tool. "Three" is load
// bearing: it promises a brief small enough to hold in your head on the way to the room.
export const HEADLINE = "Walk in with three focus points";

// The lede's only job is to frame the card underneath as an output, not a marketing
// sample: rough notes went in, and this specific thing came back.
export const LEDE =
  "Rough notes go in. This comes out, for the person and the meeting you are actually having.";

// What happens after the button, in one paragraph. Sentence one is the middle of the
// flow (Dunford seat, committee 2026-07-25: the screen has to name the back and forth,
// or the brief looks like it came from nowhere). Sentence two is the reason to run a
// second one, which is the only thing that turns this into a habit.
export const POSITIONING_LINE =
  "Sero asks you two or three questions back, then hands you the focus points for the conversation. Every 1:1 you run makes the next one sharper.";

// Honest about the typing, not the whole flow: nobody has re-timed end to end.
export const TIME_LINE = "About two minutes of typing.";

/** The three lines the card shows, and the only three labels used anywhere for them:
 *  the same words appear on the real brief, so a manager who runs one recognises the
 *  shape they were shown here. */
export const POINT_LABELS = ["How to open", "What to explore", "What to listen for"] as const;

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
 *  recents list is hidden, and a dead end is worse than a small link.
 *
 *  The example link says "full" because the card above is already an excerpt of that
 *  same run: three points out of a longer brief, not a different example. */
export const VIDEO_LINK = "Watch the two minute walkthrough";
export const EXAMPLE_LINK = "See the full example";

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

  // Escaped even though it is a local const: SAMPLE_BRIEF is pinned to a JSON fixture,
  // and an ampersand landing in that fixture should not be able to break this screen.
  const points = [SAMPLE_BRIEF.open, SAMPLE_BRIEF.explore, SAMPLE_BRIEF.listenFor]
    .map(
      (text, i) => `
        <li class="start-point">
          <span class="start-point__n">${i + 1}</span>
          <span class="start-point__body">
            <span class="start-point__label">${POINT_LABELS[i]}</span>
            <p class="start-point__text">${escapeHtml(text)}</p>
          </span>
        </li>`,
    )
    .join("");

  // js-start-slot is the hook Home moves its one blue button into (start-core.js), so
  // the screen has exactly one accent object. It sits ABOVE the card: the action is the
  // first thing reachable, and the three points are what a manager reads on the way past.
  //
  // The <h1> wears .type-display, and it is the ONLY markup type-system P5 changed.
  // Every other .h1 in the console is a page title, so that class became the 30px
  // page-title rung and this one hero takes the 36px display rung by name. Both are
  // roles in admin/src/styles/design/type.css.
  return `
    <div class="start-welcome">
      <header class="start-welcome__intro">
        <div class="eyebrow">Welcome to Sero</div>
        <h1 class="type-display">${HEADLINE}</h1>
        <p class="start-welcome__lede">${LEDE}</p>
      </header>

      <div class="start-cta">
        <span class="js-start-slot"></span>
        <span class="text-ink-dim text-sm">${TIME_LINE}</span>
      </div>

      <div class="start-brief">
        <div class="start-brief__head">
          <span class="start-brief__who">${escapeHtml(SAMPLE_BRIEF.name)} · ${escapeHtml(SAMPLE_BRIEF.meetingType)}</span>
          <span class="start-brief__tag">Example brief</span>
        </div>
        <ol class="start-points">${points}</ol>
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
