// Shared account-role guards (members-page Phase 3). The invariant every mutation protects:
// "never leave a workspace with no active manager/admin who can run it." Kept tiny + pure so
// both the org Members service and the superadmin console reason about roles the same way.
// (The superadmin console keeps its own cross-tenant copies; this is the org-scoped seam.)

/** "Lead" = a manager/admin who can run the workspace (a member cannot). */
export function isLead(role: string): boolean {
  return role === "manager" || role === "admin";
}

/** An *active* lead — a deactivated lead doesn't count toward the "someone can run it" floor. */
export function isActiveLead(u: { role: string; deactivatedAt?: Date | null }): boolean {
  return isLead(u.role) && !u.deactivatedAt;
}

/** Can `actorRole` act on an account whose role is `targetRole`? (audit-fixes F16)
 *
 *  The rule is one line: only an admin may touch an admin. `requireAdmin` on the members
 *  routes lets managers AND admins through — that is correct for managing members, but it
 *  meant a plain manager could demote or switch off the admin account that runs the
 *  workspace. Rank is not a hierarchy beyond this: manager and member are peers to act on.
 *
 *  An unknown/absent actor role is treated as NOT admin, so a lookup miss fails closed. */
export function canActOn(actorRole: string | null | undefined, targetRole: string): boolean {
  if (targetRole !== "admin") return true;
  return actorRole === "admin";
}
