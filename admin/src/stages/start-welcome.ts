// The brief-first welcome: what a brand-new manager sees on Home before they have
// run a single 1:1 (onboarding-firstrun Phase 2, Direction A).
//
// Why it leads with a finished brief instead of instructions: a stranger cannot want
// something they have not seen. The old first-visit card described three steps of
// typing, so the reward stayed invisible until the end of the wizard. This screen
// shows the artefact first, names the moment to use it, and offers one way in.
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
// what Sero makes but never when to reach for it. This is the "when".
export const POSITIONING_LINE = "Before your next 1:1: type rough notes, walk in with a clear plan.";

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

  return `
    <div class="start-welcome">
      <div class="start-welcome__main l-stack l-stack--4">
        <header class="start-welcome__intro">
          <div class="eyebrow">Welcome to Sero</div>
          <h1 class="h1">A brief for your next 1:1</h1>
          <p class="start-welcome__lede">${POSITIONING_LINE}</p>
        </header>

        <div class="start-sample card-flat">
          <div class="start-sample__head">
            <span class="start-sample__who">${SAMPLE_BRIEF.name} · ${SAMPLE_BRIEF.meetingType}</span>
            <span class="run-list__example">Sample brief</span>
          </div>
          ${rows}
          ${link}
        </div>

        <div class="start-welcome__action">
          <span class="js-start-slot"></span>
          <span class="text-ink-dim text-sm">${TIME_LINE}</span>
        </div>
      </div>

      <aside class="start-welcome__aside">
        <div class="eyebrow">New here?</div>
        <div class="start-video js-video">
          <button type="button" class="start-video__poster js-play-video" aria-label="Play the video: ${VIDEO.title}">
            <span class="start-video__play" aria-hidden="true"></span>
          </button>
        </div>
        <div class="start-video__cap">See how Sero works</div>
      </aside>
    </div>
  `;
}
