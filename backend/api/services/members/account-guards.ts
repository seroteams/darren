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
