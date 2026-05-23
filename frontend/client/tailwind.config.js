import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper: build a scale that reads from CSS variables, so Tailwind utilities
// and design-token consumers resolve through the same source.
const seroScale = (name, steps) =>
  Object.fromEntries(steps.map((s) => [s, `var(--sero-${name}-${s})`]));

const primaryScale   = seroScale("primary",   [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const mintScale      = seroScale("mint",      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const skyScale       = seroScale("sky",       [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const lavenderScale  = seroScale("lavender",  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const coralScale     = seroScale("coral",     [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const goldScale      = seroScale("gold",      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const tealScale      = seroScale("teal",      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const navyScale      = seroScale("navy",      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const softScale      = seroScale("soft",      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
const charcoalScale  = seroScale("charcoal",  [50, 100, 200, 300, 400, 500, 600, 700, 750, 800, 900, 950]);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{js,html}"),
  ],
  theme: {
    extend: {
      colors: {
        // Legacy semantic aliases (kept — they now resolve through Sero tokens)
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        ink: "var(--color-ink)",
        "ink-dim": "var(--color-ink-dim)",
        "ink-mute": "var(--color-ink-mute)",
        accent: "var(--color-accent)",
        "accent-dark": "var(--color-accent-dark)",
        "accent-soft": "var(--color-accent-soft)",
        purple: "var(--color-purple)",
        "purple-soft": "var(--color-purple-soft)",
        deep: "var(--color-deep)",
        positive: "var(--color-positive)",
        negative: "var(--color-negative)",
        neutral: "var(--color-neutral)",

        // Sero palette — full scales
        "sero-primary": primaryScale,
        "sero-mint": mintScale,
        "sero-sky": skyScale,
        "sero-lavender": lavenderScale,
        "sero-coral": coralScale,
        "sero-gold": goldScale,
        "sero-teal": tealScale,
        "sero-navy": navyScale,
        "sero-soft": softScale,
        "sero-charcoal": charcoalScale,
        "sero-offwhite": {
          50: "var(--sero-offwhite-50)",
          700: "var(--sero-offwhite-700)",
        },

        // Sero semantic roles
        "sero-success": "var(--sero-success)",
        "sero-success-light": "var(--sero-success-light)",
        "sero-warning": "var(--sero-warning)",
        "sero-warning-light": "var(--sero-warning-light)",
        "sero-error": "var(--sero-error)",
        "sero-error-light": "var(--sero-error-light)",
        "sero-info": "var(--sero-info)",
        "sero-info-light": "var(--sero-info-light)",
        "sero-link": "var(--sero-link)",
        "sero-link-hover": "var(--sero-link-hover)",
        "sero-active": "var(--sero-active-state)",
        "sero-active-bg": "var(--sero-active-state-bg)",
        "sero-completed": "var(--sero-completed)",
        "sero-ai": "var(--sero-ai)",
        "sero-purple": "var(--sero-purple)",
        "sero-block-tasks": "var(--sero-block-tasks)",
        "sero-block-processes": "var(--sero-block-processes)",
        "sero-block-team": "var(--sero-block-team)",
        "sero-block-development": "var(--sero-block-development)",
        "sero-block-fun": "var(--sero-block-fun)",
        "sero-block-fulfilment": "var(--sero-block-fulfilment)",
      },
      fontFamily: {
        sans: ["InterVariable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        measure: "var(--measure)",
        wide: "var(--container-wide)",
      },
      spacing: {
        "sero-0": "var(--sero-space-0)",
        "sero-px": "var(--sero-space-px)",
        "sero-0.5": "var(--sero-space-0-5)",
        "sero-1": "var(--sero-space-1)",
        "sero-2": "var(--sero-space-2)",
        "sero-3": "var(--sero-space-3)",
        "sero-4": "var(--sero-space-4)",
        "sero-5": "var(--sero-space-5)",
        "sero-6": "var(--sero-space-6)",
        "sero-8": "var(--sero-space-8)",
        "sero-12": "var(--sero-space-12)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
        input: "var(--radius-input)",
        "sero-none": "var(--sero-radius-none)",
        "sero-sm": "var(--sero-radius-sm)",
        "sero-md": "var(--sero-radius-md)",
        "sero-lg": "var(--sero-radius-lg)",
        "sero-xl": "var(--sero-radius-xl)",
        "sero-2xl": "var(--sero-radius-2xl)",
        "sero-full": "var(--sero-radius-full)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        "sero-xs": "var(--sero-shadow-xs)",
        "sero-sm": "var(--sero-shadow-sm)",
        "sero-md": "var(--sero-shadow-md)",
        "sero-lg": "var(--sero-shadow-lg)",
        "sero-xl": "var(--sero-shadow-xl)",
        "sero-2xl": "var(--sero-shadow-2xl)",
        "sero-inner": "var(--sero-shadow-inner)",
        "sero-focus": "var(--sero-shadow-focus)",
        "sero-raised": "var(--sero-elevation-raised)",
        "sero-floating": "var(--sero-elevation-floating)",
        "sero-overlay": "var(--sero-elevation-overlay)",
      },
      screens: {
        "sero-sm": "640px",
        "sero-md": "768px",
        "sero-lg": "1024px",
        "sero-xl": "1280px",
        "sero-2xl": "1536px",
      },
      zIndex: {
        "sero-base": "0",
        "sero-dropdown": "10",
        "sero-sticky": "20",
        "sero-fixed": "30",
        "sero-modal-backdrop": "40",
        "sero-modal": "50",
        "sero-popover": "60",
        "sero-tooltip": "70",
        "sero-toast": "80",
        "sero-max": "9999",
      },
      transitionTimingFunction: {
        "out-expo": "var(--ease-out-expo)",
        "in-out-cubic": "var(--ease-in-out-cubic)",
        spring: "var(--ease-spring)",
      },
      transitionDuration: {
        instant: "120ms",
        fast: "240ms",
        medium: "420ms",
        slow: "720ms",
        hero: "1200ms",
      },
    },
  },
  plugins: [],
};
