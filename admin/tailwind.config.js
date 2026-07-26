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
        sans: ["InterVariable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
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
        // xs/sm override Tailwind's defaults and are heavily used — do not drop them.
        xs: ["var(--type-small)", { lineHeight: "1.5" }], // text-xs ×7
        sm: ["var(--type-body-sm)", { lineHeight: "1.5" }], // text-sm ×107
        display: ["var(--type-display)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }], // ×2
      },
      letterSpacing: {
        tight: "var(--type-tracking-tight)", // tracking-tight ×3
        wide: "var(--type-tracking-wide)", // tracking-wide ×2
      },
      lineHeight: {
        tight: "var(--type-leading-tight)", // leading-tight ×3
        snug: "var(--type-leading-snug)", // leading-snug ×12
        normal: "var(--type-leading-normal)", // leading-normal ×14
        relaxed: "var(--type-leading-relaxed)", // leading-relaxed ×10
      },
    },
  },
  plugins: [],
};
