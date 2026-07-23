// The one wizard footer for every flow step (design-consolidation Phase 3):
// ghost Back bottom-left, primary bottom-right, optional quiet note beside the
// primary, optional trusted secondary control. Pure string render like the rest
// of the kit; hosts wire js-wf-back / js-wf-continue. Styles: design/flow-kit.css.

import { escapeHtml } from "./html.js";

export type WizardFooterOpts = {
  primary: { label: string; disabled?: boolean };
  back?: { label?: string };
  note?: string;
  secondaryHtml?: string;
};

export function wizardFooter(opts: WizardFooterOpts): string {
  const back = opts.back
    ? `<button type="button" class="btn btn--ghost js-wf-back">${escapeHtml(opts.back.label ?? "Back")}</button>`
    : "";
  const note = opts.note ? `<span class="wizard-footer__note">${escapeHtml(opts.note)}</span>` : "";
  const primary = `<button type="button" class="btn js-wf-continue"${opts.primary.disabled ? " disabled" : ""}>${escapeHtml(opts.primary.label)}</button>`;
  return (
    `<div class="wizard-footer">` +
    `<div class="wizard-footer__left">${back}</div>` +
    `<div class="wizard-footer__right">${note}${opts.secondaryHtml ?? ""}${primary}</div>` +
    `</div>`
  );
}
