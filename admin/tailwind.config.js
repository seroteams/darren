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
    /*
     * NOT under `extend`. This one key REPLACES Tailwind's font-size scale instead of
     * adding to it, and that is the whole point of it being here (type-system P6).
     *
     * Under `extend` the default ramp stayed live underneath, so `text-xs` still
     * generated 12px and `text-2xl` 24px with a 1-ratio leading, both off the house
     * ladder and the first below the 14px floor. The comment on the block below said
     * "No `xs`" and had said so since P3; it was describing an intent that the config
     * shape quietly cancelled. A markup sweep can remove every `text-xs` in the tree
     * and the utility that breaches the floor is still one keystroke away.
     *
     * Replacing the scale means `text-sm` is the ONLY size utility that exists.
     * Measured across both apps before the swap: `text-sm` x119 and `text-xl` x1, and
     * that one site (admin/src/main.js) took a role in the same commit. Any other
     * `text-*` now generates nothing at all, which is the correct failure: it is
     * visible in the browser rather than silently off-ladder.
     */
    fontSize: {
      // 14px is the floor, so there is deliberately no rung below `sm`, and the
      // leading is the role's absolute 20px rather than a ratio: a ratio applied to
      // markup lands on whatever size the element happens to be.
      sm: ["var(--type-size-sm)", { lineHeight: "var(--type-leading-sm)" }], // text-sm x119
    },
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
      letterSpacing: {
        tight: "var(--type-tracking-tight)", // tracking-tight ×3
        wide: "var(--type-tracking-wide)", // tracking-wide ×2
      },
    },
    /*
     * Also a REPLACEMENT rather than an extension, for the same reason as fontSize
     * above: under `extend` Tailwind's own `leading-none` / `leading-loose` /
     * `leading-3`..`leading-10` stayed live beside these four, and `leading-10` is a
     * flat 2.5rem line box on whatever size it lands on. Measured across both apps
     * before the swap: these four are the only leading utilities any markup uses.
     *
     * They are RATIOS, written out, and they cannot be repointed at the P1 scale:
     * that scale's leadings are absolute lengths married to one size, and a utility
     * lands on markup at whatever size the element happens to be, so `leading-normal`
     * on a 30px heading would become a 24px line box.
     *
     * These 62 markup sites are still real debt: a line-height set from markup is a
     * type decision taken outside design/type.css. P6 did NOT retire them, because
     * retiring them means giving 62 sites a role and that is a markup sweep in files
     * this phase does not open. The previous version of this comment said "P6 owns
     * retiring them", which was a promise rather than a record. Named in P6's report
     * as remaining work instead.
     */
    lineHeight: {
      tight: "1.1", // leading-tight x9
      snug: "1.25", // leading-snug x12
      normal: "1.5", // leading-normal x25
      relaxed: "1.6", // leading-relaxed x16
    },
  },
  plugins: [],
};
