// Team card — the pure render for one person on the Team screen. Kept DOM-free and CSS-free
// (no modal/menu imports) so it unit-tests as a plain string, the way the other stage renders do.
// The mount, data loading and click wiring live in ./team.ts.

import { escapeHtml } from "../../../admin/src/ui/html.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { Star, MoreHorizontal, Link2, Lock } from "lucide";
import { relTime } from "../../../admin/src/ui/time.ts";

export type Person = {
  key: string; // the roster personId
  name: string;
  userId: string | null; // linked member account
  role: string;
  count: number;
  openCount: number;
  lastMet: number;
  ratedCount: number;
  avgStars: number | null;
  met: boolean;
};
export type OrgUser = { id: string; name: string; email: string };

// The meta line under a name. A never-touched roster person reads "not met yet"; one with only
// an open prep says so; a met person shows meetings / last / average.
function metaLine(p: Person): string {
  if (p.count === 0) return escapeHtml(p.openCount > 0 ? "1:1 prep in progress · not met yet" : "not met yet");
  const bits: string[] = [`${p.count} meeting${p.count > 1 ? "s" : ""}`];
  const last = relTime(p.lastMet);
  if (last) bits.push(`last ${last}`);
  if (p.openCount > 0) bits.push("prep in progress");
  const rated =
    p.avgStars != null
      ? `${icon(Star, { size: 16, fill: "currentColor" })} ${escapeHtml(p.avgStars.toFixed(1))} avg (${p.ratedCount} rated)`
      : "not yet rated";
  return `${escapeHtml(bits.join(" · "))} · ${rated}`;
}

// The access line on every card — can this person log in and see their own 1:1s (list-only:
// dates + meeting types, never the notes)? A linked person shows their account; an unlinked one
// shows "No access yet". The single js-access button opens the give/change menu (wired in team.ts).
function accessLine(p: Person, orgUsers: OrgUser[]): string {
  const chip = (body: string) =>
    `<span class="text-sm text-ink-dim l-cluster l-cluster--1" style="align-items:center;gap:6px;">${body}</span>`;
  const btn = (label: string, linked: 0 | 1) =>
    `<button type="button" class="btn btn--ghost btn--sm js-access" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}" data-userid="${escapeHtml(p.userId ?? "")}" data-linked="${linked}">${label}</button>`;
  const row = (inner: string) =>
    `<div class="l-cluster" style="justify-content:space-between;align-items:center;gap:8px;">${inner}</div>`;
  if (p.userId) {
    const u = orgUsers.find((o) => o.id === p.userId);
    const label = u ? escapeHtml(u.email) : "Has access";
    return row(`${chip(`${icon(Link2, { size: 14 })} ${label}`)}${btn("Change", 1)}`);
  }
  return row(`${chip(`${icon(Lock, { size: 14 })} No access yet`)}${btn("Give access", 0)}`);
}

// One card for one person — used for everyone (there is no separate "edit mode" any more). The
// primary Prep stays visible ("Prep first 1:1" until you've met, "Prep 1:1" after); View, Edit and
// Delete tuck into the ⋯ menu; the access line sits below.
export function personCard(p: Person, orgUsers: OrgUser[]): string {
  const role = p.role ? `<span class="text-ink-dim"> · ${escapeHtml(p.role)}</span>` : "";
  const inner = `<span class="l-stack l-stack--2"><span class="text-sm"><strong>${escapeHtml(p.name)}</strong>${role}</span><span class="text-sm text-ink-dim">${metaLine(p)}</span></span>`;
  const prepLabel = p.met ? "Prep 1:1" : "Prep first 1:1";
  return `
    <div class="card-flat runs-list__row l-stack l-stack--3">
      <div class="l-cluster" style="justify-content:space-between;align-items:center;gap:12px;">
        ${inner}
        <span class="l-cluster l-cluster--2" style="flex-shrink:0;">
          <button type="button" class="btn btn--ghost btn--sm js-prep-new" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}" data-role="${escapeHtml(p.role)}">${prepLabel}</button>
          <button type="button" class="row-menu-btn js-row-menu" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}" aria-haspopup="menu" aria-label="More actions for ${escapeHtml(p.name)}">${icon(MoreHorizontal, { size: 18 })}</button>
        </span>
      </div>
      ${accessLine(p, orgUsers)}
    </div>`;
}
