// Composes notification emails and hands them to the send helper. Kept separate
// from the send transport (email-client.ts) so the WHAT (subject, body, recipients)
// is unit-testable with a fake sender and never needs a network.
//
// Admin alerts go to the SUPERADMIN_EMAILS allowlist (the same env var that gates the
// superadmin console) — i.e. Carl. An empty/unset list means nobody is notified, which
// is a clean no-op, never an error. The invite email instead goes to the invitee.

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

/** What the invitee email needs. inviterName / orgName may be null (fall back cleanly). */
export interface InviteEmailParams {
  to: string;
  inviterName: string | null;
  orgName: string | null;
  joinUrl: string; // absolute, single-use /join link
}

/** Email an invited member their join link. Sent to the invitee (not the admin list).
 *  Fire-and-forget by default — the invite is already saved; a failed email never blocks it. */
export function notifyInviteeOfInvite(params: InviteEmailParams, send: Send = sendEmailQuietly): void {
  const inviterPlain = params.inviterName || "Your manager";
  const orgPlain = params.orgName || "their team";
  const inviter = esc(inviterPlain);
  const org = esc(orgPlain);
  const url = esc(params.joinUrl);
  send({
    to: params.to,
    subject: `${inviterPlain} invited you to Sero`,
    html:
      `<p>${inviter} invited you to join <b>${org}</b> on Sero — where you can see the notes and prep from your 1:1s.</p>` +
      `<p><a href="${url}">Accept your invite</a></p>` +
      `<p>Or paste this link into your browser:<br>${url}</p>` +
      `<p>The link is single-use and expires in 7 days.</p>`,
    text: `${inviterPlain} invited you to join ${orgPlain} on Sero. Accept your invite: ${params.joinUrl} (single-use, expires in 7 days).`,
  });
}
