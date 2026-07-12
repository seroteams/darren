// Composes notification emails and hands them to the send helper. Kept separate
// from the send transport (email-client.ts) so the WHAT (subject, body, recipients)
// is unit-testable with a fake sender and never needs a network.
//
// Admin alerts go to the SUPERADMIN_EMAILS allowlist (the same env var that gates the
// superadmin console) — i.e. Carl. An empty/unset list means nobody is notified, which
// is a clean no-op, never an error. The invite email instead goes to the invitee.

import { sendEmailQuietly } from "../../../engine/email-client.ts";
import type { EmailMessage } from "../../../engine/email-client.ts";
import {
  renderSeroEmail,
  emailParagraph,
  emailDetailPanel,
  emailButton,
  emailFinePrint,
} from "./email-layout.ts";

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

interface AdminAlert {
  subject: string; // email subject line
  heading: string; // big title in the card
  lead: string; // friendly one-liner under the title
  textLabel: string; // prefix for the plain-text fallback
}

// Shared body for the admin account alerts (signup, new member), wrapped in the branded
// shell. No-op if nobody is on the allowlist. Fire-and-forget — the caller must never
// await or depend on it.
function adminAccountAlert(user: RegisteredUser, a: AdminAlert, send: Send): void {
  const to = adminRecipients();
  if (to.length === 0) return;
  const bodyHtml =
    emailParagraph(a.lead) +
    emailDetailPanel([
      ["Name", esc(user.name)],
      ["Email", esc(user.email)],
      ["Company", esc(user.orgId)],
    ]);
  send({
    to,
    subject: a.subject,
    html: renderSeroEmail({ eyebrow: "Admin notification", heading: a.heading, bodyHtml }),
    text: `${a.textLabel} — ${user.name} <${user.email}> (org ${user.orgId})`,
  });
}

/** Email the admin(s) that a new account just registered. */
export function notifyAdminOfNewRegistration(user: RegisteredUser, send: Send = sendEmailQuietly): void {
  adminAccountAlert(
    user,
    { subject: `New Sero signup: ${user.name}`, heading: "New signup on Sero", lead: "Someone just created an account.", textLabel: "New Sero signup" },
    send,
  );
}

/** Email the admin(s) that an invited person just accepted and became a member. */
export function notifyAdminOfNewMember(user: RegisteredUser, send: Send = sendEmailQuietly): void {
  adminAccountAlert(
    user,
    { subject: `New member joined: ${user.name}`, heading: "New member joined", lead: "A new member just joined a team via an invite.", textLabel: "New member joined" },
    send,
  );
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
  const bodyHtml =
    emailParagraph(`${inviter} has invited you to join <b>${org}</b> on Sero — the place your 1:1 notes and prep live.`) +
    emailDetailPanel([
      ["Invited by", inviter],
      ["Team", org],
    ]) +
    emailButton("Accept your invite", url) +
    emailFinePrint("This link is just for you and expires in 7 days.");
  send({
    to: params.to,
    subject: `${inviterPlain} invited you to Sero`,
    html: renderSeroEmail({ heading: "You're invited to Sero", bodyHtml }),
    text: `${inviterPlain} invited you to join ${orgPlain} on Sero. Accept your invite: ${params.joinUrl} (single-use, expires in 7 days).`,
  });
}

/** What the reset email needs — the recipient and their absolute, single-use link. */
export interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

/** Email a user their password-reset link. Sent to the user themselves. Fire-and-forget
 *  by default — the token is already saved and the request always answers 200, so a
 *  failed email never blocks anything. */
export function notifyPasswordReset(params: PasswordResetEmailParams, send: Send = sendEmailQuietly): void {
  const url = esc(params.resetUrl);
  const bodyHtml =
    emailParagraph(
      "We got a request to reset your Sero password. Click below to choose a new one. " +
        "If this wasn't you, you can safely ignore this email — nothing changes.",
    ) +
    emailButton("Reset your password", url) +
    emailFinePrint("This link is just for you and expires in 1 hour.");
  send({
    to: params.to,
    subject: "Reset your Sero password",
    html: renderSeroEmail({ eyebrow: "Password reset", heading: "Reset your password", bodyHtml }),
    text: `Reset your Sero password: ${params.resetUrl} (single-use, expires in 1 hour). If you didn't ask for this, ignore this email.`,
  });
}
