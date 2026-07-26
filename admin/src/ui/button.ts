// The button (component-consolidation P3) — ONE place that writes a button's markup.
//
// Before this there was no button helper at all: 223 places typed `class="btn …"` by hand,
// which is why four rival button families had grown up alongside it (`.wr-btn`,
// `.ds-btn-quiet`, five `.row-menu-btn` spellings, `.copy-snippet-btn`) and why
// `.btn--cta`, `.btn--md` and `.btn--lg` sit in the CSS with no callers.
//
// It emits exactly the classes the CSS already defines, in one fixed order:
//     btn · variant · size · extraClass · hook
// so adopting it changes no pixels. Deliberately NOT modelled here: `.btn--md` and
// `.btn--lg` (defined, zero callers) and `.btn--cta` (defined, zero callers). If one of
// those is ever wanted, add it to `size` then — an option nobody passes is just noise.
//
// Note on size: the bare `.btn` IS the medium default (padding 0.65rem 1.15rem).
// `.btn--md` is a DIFFERENT padding (8/16px), an opt-in alias, not the default. So
// omitting `size` correctly means "no size class", not "the medium class".

import { escapeHtml } from "./html.js";

export type ButtonVariant = "primary" | "ghost" | "danger";

export interface ButtonOptions {
  /** Visible text. Escaped for you — pass the raw string, never pre-escaped HTML. */
  label?: string;
  /** For the rare button whose label carries markup (an icon plus text). Caller-owned, not escaped. */
  labelHtml?: string;
  /** primary is the one solid accent action; ghost is the quiet outline; danger is destructive. */
  variant?: ButtonVariant;
  /** Only "sm" exists in the CSS today. Omit for the standard size. */
  size?: "sm";
  /** The `js-` class the mount code hooks its listener onto. Space-separate for more than one. */
  hook?: string;
  /** Layout or positioning classes that belong to the screen, not the button (e.g. "notes-panel__close"). */
  extraClass?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Pre-rendered icon markup from ui/icon.js, placed before the label. */
  iconLeft?: string;
  /** Use when the label alone would not name the action (an icon-only button). */
  ariaLabel?: string;
  title?: string;
  /**
   * Anything else: data-*, id, aria-pressed, aria-haspopup. Values are escaped.
   * `true` renders the attribute bare (`data-next`), which is how the guided flow's
   * marker attributes are written; `false`/`null`/`undefined` drop it entirely.
   */
  attrs?: Record<string, string | number | boolean | null | undefined>;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "",
  ghost: "btn--ghost",
  danger: "btn--danger",
};

export function button(opts: ButtonOptions = {}): string {
  const {
    label,
    labelHtml,
    variant = "primary",
    size,
    hook,
    extraClass,
    type = "button",
    disabled = false,
    iconLeft,
    ariaLabel,
    title,
    attrs,
  } = opts;

  const classes = ["btn", VARIANT_CLASS[variant], size ? `btn--${size}` : "", extraClass ?? "", hook ?? ""]
    .filter(Boolean)
    .join(" ");

  const extra = Object.entries(attrs ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(String(v))}"`))
    .join("");

  const inner = `${iconLeft ?? ""}${labelHtml ?? escapeHtml(label ?? "")}`;

  return (
    `<button type="${type}" class="${classes}"` +
    (disabled ? " disabled" : "") +
    (ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : "") +
    (title ? ` title="${escapeHtml(title)}"` : "") +
    `${extra}>${inner}</button>`
  );
}
