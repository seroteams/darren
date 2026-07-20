// The read-only recap's own header — a breadcrumb trail plus a profile that names the 1:1
// you're reading. Shared by every superadmin recap surface (the user drilldown and the guest
// pile) so each renders identically and none re-shows its parent list's header above the recap
// (that was the doubled title + a stacked second back button, IA polish 2026-07-21). Reuses
// the run-detail profile classes (.rd-profile / .rd-name / .rd-type-badge) for parity with the
// member's own recap header — nothing new to style.

import { escapeHtml } from "./html.js";
import { breadcrumb, type Crumb } from "./breadcrumb.ts";

export type RecapCtx = { name: string; role: string; seniority: string; meetingType: string };

// First letter of the name (falls back to "?") — the glyph in the avatar circle.
function initialOf(name: string): string {
  const s = (name || "").trim();
  return s ? s[0]!.toUpperCase() : "?";
}

// "Role · Seniority" — middot-joined, matching run-detail's roleLine and the member recap.
// The old comma form ("Role, Seniority") in the admin surfaces was the odd one out.
export function roleLine(c: RecapCtx): string {
  if (!c.role) return c.seniority || "";
  return c.seniority ? `${c.role} · ${c.seniority}` : c.role;
}

// `trail` is the crumbs leading TO this recap (each with the nav key its host stage wires);
// the meeting itself is appended as the current, non-navigating crumb.
export function recapHeader(ctx: RecapCtx, trail: Crumb[]): string {
  const c = ctx || ({} as RecapCtx);
  const crumbs = breadcrumb([...trail, { label: c.meetingType || "1:1" }]);
  const role = roleLine(c);
  return `
    <header class="page-header l-stack l-stack--3">
      ${crumbs}
      <div class="rd-profile">
        <div class="ds-avatar rd-avatar" aria-hidden="true">${escapeHtml(initialOf(c.name))}</div>
        <div class="rd-profile__id">
          <h1 class="rd-name">${escapeHtml(c.name || "This 1:1")}</h1>
          ${role ? `<div class="text-ink-dim text-sm">${escapeHtml(role)}</div>` : ""}
        </div>
        ${c.meetingType ? `<span class="rd-type-badge">${escapeHtml(c.meetingType)}</span>` : ""}
      </div>
    </header>`;
}
