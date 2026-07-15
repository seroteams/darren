// Pure field logic for the "Invite people" modal (members-page Phase 2) — no DOM, no CSS, so it
// runs under `node --test`. The modal imports these; the test imports them straight. One rule: a
// real email is required. Role is a two-way choice (manager | member); anything else → member.

export type InviteRole = "manager" | "member";
export type InviteDraft = { email: string; role: InviteRole };

/** Trim + validate the invite form. Returns the draft, or an error string to show inline. */
export function cleanInvite(input: { email?: unknown; role?: unknown }): {
  draft: InviteDraft | null;
  error: string | null;
} {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { draft: null, error: "Enter an email address to invite." };
  const role: InviteRole = String(input.role ?? "member").trim().toLowerCase() === "manager" ? "manager" : "member";
  return { draft: { email, role }, error: null };
}
