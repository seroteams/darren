// Pure render for the org Members page (members-page Phase 1) — DOM-free and CSS-free, so it
// runs under `node --test`. members.ts imports this + the styles + does the mount/fetch. One
// row per login account or pending invite: who they are, their role, and their status
// (Active / Invited / Deactivated). Reuses the admin-tables `um-*` classes for visual parity.

import { escapeHtml } from "../../../admin/src/ui/html.js";

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

function memberRow(m: MemberRow): string {
  const off = m.status === "deactivated";
  // A pending invite has no name yet — its email carries the row.
  const primary = m.name || m.email;
  const sub = m.name ? `<div class="um-user__email">${escapeHtml(m.email)}</div>` : "";
  // Every row gets a ⋯ menu — account rows: role / deactivate / reactivate; invite rows:
  // resend / revoke. The menu contents are chosen from data-kind in members.ts.
  const actions = `<button type="button" class="um-menu-btn js-member-menu" data-kind="${escapeHtml(m.kind)}" data-id="${escapeHtml(m.id)}" data-role="${escapeHtml(m.role)}" data-status="${escapeHtml(m.status)}" data-name="${escapeHtml(primary)}" aria-haspopup="menu" aria-label="Manage ${escapeHtml(primary)}">⋯</button>`;
  return `
    <tr class="um-row${off ? " um-row--off" : ""}">
      <td>
        <div class="um-user__open">${escapeHtml(primary)}</div>
        ${sub}
      </td>
      <td>${roleBadge(m.role)}</td>
      <td>${statusTag(m.status)}</td>
      <td class="um-actions">${actions}</td>
    </tr>`;
}

/** The whole table (header + rows). Rows arrive already ordered by the service. */
export function membersTable(rows: MemberRow[]): string {
  return `
    <div class="um-table-wrap">
      <table class="um-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Status</th>
            <th class="um-actions-th" aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>${rows.map(memberRow).join("")}</tbody>
      </table>
    </div>`;
}
