// Composes admin-facing notification emails and hands them to the send helper.
// Kept separate from the send transport (email-client.ts) so the WHAT (subject,
// body, recipients) is unit-testable with a fake sender and never needs a network.
//
// Recipients are the SUPERADMIN_EMAILS allowlist (the same env var that gates the
// superadmin console) — i.e. Carl. An empty/unset list means nobody is notified,
// which is a clean no-op, never an error.

import { sendEmailQuietly } from "../../../engine/email-client.ts";
import type { EmailMessage } from "../../../engine/email-client.ts";

/** The bits of a freshly-created account we put in an alert. */
export interface RegisteredUser {
  name: string;
  email: string;
  orgId: string;
}

/** A sender seam: the real fire-and-forget helper in production, a fake in tests. */
type Send = (msg: EmailMessage) => void;

// Same normalise + comma-split as the superadmin gate (require-auth.ts). Replicated
// (not imported) so this composer doesn't reach into auth middleware internals; both
// read the same env var, so the list can't drift.
function adminRecipients(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Email the admin(s) that a new account just registered. No-op if nobody is on the
 *  allowlist. Fire-and-forget by default — the caller must never await or depend on it. */
export function notifyAdminOfNewRegistration(user: RegisteredUser, send: Send = sendEmailQuietly): void {
  const to = adminRecipients();
  if (to.length === 0) return;

  const name = esc(user.name);
  const email = esc(user.email);
  send({
    to,
    subject: `New Sero signup: ${user.name}`,
    html:
      `<p>A new account just registered on Sero.</p>` +
      `<ul>` +
      `<li><b>Name:</b> ${name}</li>` +
      `<li><b>Email:</b> ${email}</li>` +
      `<li><b>Org:</b> ${esc(user.orgId)}</li>` +
      `</ul>`,
    text: `New Sero signup — ${user.name} <${user.email}> (org ${user.orgId})`,
  });
}
