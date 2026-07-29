// Pure render for the org Members page (members-page Phase 1) — DOM-free and CSS-free, so it
// runs under `node --test`. members.ts imports this + the styles + does the mount/fetch. One
// row per login account or pending invite: who they are, their role, and their status
// (Active / Invited / Deactivated). Reuses the admin-tables `um-*` classes for visual parity.

import { escapeHtml } from "../../../admin/src/ui/html.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { MoreHorizontal } from "lucide";
import { initialsAvatar } from "./team-card.ts";

export type MemberStatus = "active" | "invited" | "deactivated";

export interface MemberRow {
  kind: "account" | "invite";
  id: string;
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
}

/** Coloured pill for the account role. Unknown roles fall back to the neutral member style. */
export function roleBadge(role: string): string {
  const variant = new Set(["admin", "manager", "member"]).has(role) ? role : "member";
  return `<span class="um-badge um-badge--${variant}">${escapeHtml(role)}</span>`;
}

/** Status tag — Active (calm), Invited (pending), Deactivated (muted error). */
export function statusTag(status: MemberStatus): string {
  if (status === "invited") return `<span class="um-badge um-badge--pending">Invited</span>`;
  if (status === "deactivated") return `<span class="um-badge um-badge--off">Deactivated</span>`;
  return `<span class="um-badge um-badge--active">Active</span>`;
}

/** Map a member's status onto the shared avatar tints: active reads as on-Sero (mint),
 *  invited as pending (gold), deactivated as the neutral grey. */
function avatarState(status: MemberStatus): string {
  if (status === "invited") return "invited";
  if (status === "deactivated") return "none";
  return "joined";
}

/** Client-side search over the already-fetched members: name or email, case-insensitive. */
export function filterMembers(rows: MemberRow[], query: string): MemberRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
}

/** Does this viewer get a ⋯ menu on this row? (audit-fixes F16)
 *
 *  Mirrors the server's `canActOn` in backend/api/services/members/account-guards.ts: only an
 *  admin may act on an admin. The server refusal is the actual wall — this exists so nobody is
 *  invited to hit it. Every action the menu offers on an account row (change role, switch off)
 *  is now refused for this case, so an empty menu would be worse than no menu.
 *  Invite rows are unaffected: their role is what the invite WILL grant, not power held today. */
export function canManageRow(viewerIsAdmin: boolean, m: Pick<MemberRow, "kind" | "role">): boolean {
  if (m.kind === "invite") return true;
  if (m.role !== "admin") return true;
  return viewerIsAdmin;
}

function memberRow(m: MemberRow, viewerIsAdmin: boolean): string {
  const off = m.status === "deactivated";
  // A pending invite has no name yet — its email carries the row.
  const primary = m.name || m.email;
  const sub = m.name ? `<div class="um-user__email">${escapeHtml(m.email)}</div>` : "";
  // Most rows get a ⋯ menu (the shared Lucide glyph via ui/icon.js, matching the Team rows) —
  // account rows: role / deactivate / reactivate; invite rows: resend / revoke. The menu
  // contents are chosen from data-kind in members.ts. A manager looking at an ADMIN row gets
  // no menu at all (audit F16): every action it would offer is refused server-side.
  const actions = canManageRow(viewerIsAdmin, m)
    ? `<button type="button" class="um-menu-btn js-member-menu" data-kind="${escapeHtml(m.kind)}" data-id="${escapeHtml(m.id)}" data-role="${escapeHtml(m.role)}" data-status="${escapeHtml(m.status)}" data-name="${escapeHtml(primary)}" aria-haspopup="menu" aria-label="Manage ${escapeHtml(primary)}">${icon(MoreHorizontal, { size: 18 })}</button>`
    : "";
  return `
    <tr class="um-row${off ? " um-row--off" : ""}">
      <td>
        <div class="mem-user">
          ${initialsAvatar(primary, avatarState(m.status))}
          <div class="mem-user__text">
            <div class="um-user__open">${escapeHtml(primary)}</div>
            ${sub}
          </div>
        </div>
      </td>
      <td>${roleBadge(m.role)}</td>
      <td>${statusTag(m.status)}</td>
      <td class="um-actions">${actions}</td>
    </tr>`;
}

/** The whole table (header + rows). Rows arrive already ordered by the service.
 *  `.mem-table` scopes the avatar-row alignment tweaks (members.css) to this page only.
 *  `viewerIsAdmin` defaults to false so a caller that forgets it hides admin-row actions
 *  rather than offering ones the server will refuse. */
export function membersTable(rows: MemberRow[], viewerIsAdmin = false): string {
  return `
    <div class="um-table-wrap mem-table">
      <table class="um-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Status</th>
            <th class="um-actions-th" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>${rows.map((m) => memberRow(m, viewerIsAdmin)).join("")}</tbody>
      </table>
    </div>`;
}
