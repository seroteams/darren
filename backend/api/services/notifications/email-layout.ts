// The shared branded shell every Sero email uses: soft-blue background, a white card
// with a thin blue top accent, the Sero logo + wordmark up top, and a footer. Built
// email-safe on purpose — tables + inline styles + hex colours (no <style>, no classes,
// no SVG) so it renders the same in Gmail / Outlook / Apple Mail. Composers build only
// the middle `bodyHtml`; this wraps it.

// The logo is a hosted PNG (email clients strip inline SVG). Served by the deployed app
// at /logo.png; falls back to the live URL when APP_BASE_URL isn't set.
function logoUrl(): string {
  const base = (process.env.APP_BASE_URL || "https://sero-obwq.onrender.com").replace(/\/$/, "");
  return `${base}/logo.png`;
}

// Email-safe body stack that reads like Inter without relying on a web font (email
// clients don't load @font-face): San Francisco (Apple), Segoe UI (Windows), Roboto
// (Gmail/Android) are all Inter-adjacent humanist sans; Arial is the universal fallback.
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
// Headings: same safe sans, just heavier — keeps the whole email in one type family
// (Bricolage is a web font and wouldn't load in mail anyway).
const HEAD_FONT = FONT;

export interface SeroEmailParts {
  eyebrow?: string; // small uppercase label above the heading (e.g. "Admin notification")
  heading: string; // the big title
  bodyHtml: string; // the middle content (already HTML-escaped by the composer)
}

/** Wrap composed body content in the branded Sero email shell. Returns full HTML. */
export function renderSeroEmail({ eyebrow, heading, bodyHtml }: SeroEmailParts): string {
  const eyebrowHtml = eyebrow
    ? `<div style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5aa9e6;margin:0 0 10px;">${eyebrow}</div>`
    : "";
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9f3fc;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#e9f3fc;">
  <tr><td align="center" style="padding:30px 16px;">
    <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #d9e8f6;border-radius:16px;overflow:hidden;">
      <tr><td style="height:4px;background:#5aa9e6;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td align="center" style="padding:26px 28px 16px;">
        <img src="${logoUrl()}" width="48" height="48" alt="Sero" style="display:inline-block;vertical-align:middle;border:0;border-radius:12px;">
        <span style="font-family:${HEAD_FONT};font-size:23px;font-weight:600;color:#1b5d91;vertical-align:middle;padding-left:10px;">Sero</span>
      </td></tr>
      <tr><td style="padding:0 28px;"><div style="height:1px;background:#eef4fa;line-height:1px;font-size:0;">&nbsp;</div></td></tr>
      <tr><td style="padding:26px 32px 10px;">
        ${eyebrowHtml}
        <div style="font-family:${HEAD_FONT};font-size:22px;font-weight:600;color:#173a56;line-height:1.25;margin:0 0 12px;">${heading}</div>
        ${bodyHtml}
      </td></tr>
      <tr><td style="background:#fbfdff;border-top:1px solid #eef4fa;padding:18px 28px;text-align:center;">
        <span style="font-family:${FONT};font-size:12px;color:#9aabbb;"><span style="color:#5aa9e6;font-weight:600;">Sero</span> &middot; 1:1 prep that actually helps</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** A friendly body paragraph in the shell's body style. */
export function emailParagraph(text: string): string {
  return `<p style="font-family:${FONT};font-size:15px;line-height:1.6;color:#4a6072;margin:0 0 18px;">${text}</p>`;
}

/** The soft-blue key/value detail panel. Values must already be HTML-escaped. */
export function emailDetailPanel(rows: [string, string][]): string {
  const trs = rows
    .map(
      ([k, v]) =>
        `<tr><td style="font-family:${FONT};font-size:14px;color:#7089a0;padding:5px 0;">${k}</td>` +
        `<td align="right" style="font-family:${FONT};font-size:14px;color:#1b3a54;font-weight:500;padding:5px 0;">${v}</td></tr>`,
    )
    .join("");
  return (
    `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2f8fd;border:1px solid #e0eefa;border-radius:12px;margin:0 0 22px;">` +
    `<tr><td style="padding:8px 16px;"><table width="100%" cellpadding="0" cellspacing="0" role="presentation">${trs}</table></td></tr></table>`
  );
}

/** The brand-blue call-to-action button. url must already be HTML-escaped. */
export function emailButton(label: string, url: string): string {
  return (
    `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:2px 0 4px;"><tr>` +
    `<td style="background:#5aa9e6;border-radius:10px;"><a href="${url}" style="display:inline-block;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;padding:13px 30px;">${label}</a></td>` +
    `</tr></table>`
  );
}

/** Small muted fine-print line. */
export function emailFinePrint(text: string): string {
  return `<p style="font-family:${FONT};font-size:12.5px;color:#8ea3b5;margin:16px 0 4px;">${text}</p>`;
}
