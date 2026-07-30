import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * Sero uses Tailwind for a handful of utilities and its preflight reset. The design
 * system itself is hand-written CSS driven by design/tokens.css — NOT this file.
 *
 * This config used to mirror the whole token layer into utility-land: ~380 generated
 * utilities across 11 colour ramps, 18 spacings, 11 radii, 13 shadows, 10 z-indices,
 * 5 breakpoints and 13 font sizes. Markup used nine of them. Tailwind is JIT, so the
 * unused ones never reached the bundle — but they were a second, parallel design
 * system that anyone could reach for, silently bypassing the tokens and DESIGN.md.
 *
 * So: only what the markup actually uses lives here (counts measured 2026-07-26 across
 * both apps). Adding an entry back means the markup needs it. If you want a token in a
 * screen, use `var(--token)` in CSS — that is the house route, and the guard checks it.
 *
 * frontend/tailwind.config.js spreads this file, so both apps share one theme.
 */
export default {
  content: [
    path.join(__dirname, "index.html"),
    // .ts included: stages ported to TypeScript (welcome.ts, preparation.ts …)
    // use the same utilities, and without this their classes are only generated
    // by luck — because some .js file happens to use them too.
    path.join(__dirname, "src/**/*.{js,ts,html}"),
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)", // bg-bg ×2
        ink: "var(--color-ink)", // text-ink ×12
        "ink-dim": "var(--color-ink-dim)", // text-ink-dim ×155
        "ink-mute": "var(--color-ink-mute)", // text-ink-mute ×59
        negative: "var(--color-negative)", // text-negative ×12
      },
      fontFamily: {
        // Not used as `font-sans` in markup, but Tailwind's preflight sets the html
        // font-family from it. Removing it would change the base face. Keep.
        sans: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        measure: "var(--measure)", // max-w-measure ×5
        wide: "var(--container-wide)", // max-w-wide ×1
      },
      boxShadow: {
        card: "var(--shadow-card)", // shadow-card ×3
      },
      transitionTimingFunction: {
        "out-expo": "var(--ease-out-expo)", // ease-out-expo ×1
      },
      fontSize: {
        // No `xs`. It pointed at --type-small, which is defined nowhere in the repo, so
        // the font-size half of the utility was invalid at computed-value time and every
        // text-xs element silently inherited its parent's size while still taking the
        // line-height: 1.5. Seven shipped sites read it; all seven now say text-sm, which
        // is what they were already rendering as or should have been (type-system P3).
        // 14px is the floor, so there is deliberately no rung below `sm`.
        // The leading is the role's absolute 20px, not the old 1.5 ratio (21px). Measured
        // on the running app: text-sm sites were the only 14px text still off the 4px
        // grid once the roles landed, so .type-body-sm and text-sm read a pixel apart on
        // the same screen. The size token is Phase 5's to retire.
        // Repointed at the P1 scale in type-system P5. Same 14px and the same 20px
        // leading it already had; --type-body-sm was deleted with the rest of the old
        // ladder, and every one of these nine entries had to be cleared before it could
        // go. There is no `display` entry any more: it generated a .text-display utility
        // at weight 700 that COLLIDED with base.css's .text-display at weight 600 (the
        // stylesheet won on source order, so the utility never painted). .text-display
        // is a role in design/type.css now, and one definition beats two that disagree.
        sm: ["var(--type-size-sm)", { lineHeight: "var(--type-leading-sm)" }], // text-sm ×114
      },
      letterSpacing: {
        tight: "var(--type-tracking-tight)", // tracking-tight ×3
        wide: "var(--type-tracking-wide)", // tracking-wide ×2
      },
      // These four are the RATIOS the deleted --type-leading-tight/snug/normal/relaxed
      // held, written out. They cannot be repointed at the P1 scale: those leadings are
      // absolute lengths married to one size, and a utility gets applied to markup at
      // whatever size it happens to be, so `leading-normal` on a 30px heading would have
      // become a 24px line box. Ratios keep all 39 markup sites rendering exactly as
      // they did. The utilities themselves are debt: P6 owns retiring them.
      lineHeight: {
        tight: "1.1", // leading-tight ×3
        snug: "1.25", // leading-snug ×12
        normal: "1.5", // leading-normal ×14
        relaxed: "1.6", // leading-relaxed ×10
      },
    },
  },
  plugins: [],
};
