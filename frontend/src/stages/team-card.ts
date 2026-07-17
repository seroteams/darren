// Team card — the pure render for one person on the Team screen (team-page-redesign Phase 3).
// DOM-free and CSS-free so it unit-tests as a plain string. The mount, data loading and click
// wiring live in ./team.ts; the card styles live in ../styles/team-card.css (imported there).
//
// The redesign (Carl's mock): one calm row per person — initials avatar, name · role, a quiet
// meta line, then the access shown as ONE clear status pill (Not on Sero / Invited / Opened /
// On Sero) with its action right beside it (Invite / Remind), and Prep 1:1 + the ⋯ menu.

import { escapeHtml } from "../../../admin/src/ui/html.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { Star, MoreHorizontal, Lock, Clock, Eye, Check } from "lucide";
import { relTime } from "../../../admin/src/ui/time.ts";

export type AccessState = "none" | "invited" | "opened" | "joined";
export type PersonAccess = {
  state: AccessState;
  inviteId: string | null;
  invitedAt: number | null;
  openedAt: number | null;
};
export type Person = {
  key: string; // the roster personId
  name: string;
  userId: string | null; // linked member account
  access: PersonAccess;
  role: string;
  count: number;
  openCount: number;
  lastMet: number;
  ratedCount: number;
  avgStars: number | null;
  met: boolean;
};
export type OrgUser = { id: string; name: string; email: string };

/** Up to two initials from a display name (skips punctuation-y bits like "qa-overnight"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts.length ? [parts[0]!, parts[parts.length - 1]!] : [name])
    .map((w) => (w.match(/[a-z0-9]/i)?.[0] ?? "")).join("");
  return (letters || name.slice(0, 2)).slice(0, 2).toUpperCase();
}

// The meta line under a name. A never-touched roster person reads "not met yet"; one with only
// an open prep says so; a met person shows meetings / last / average.
function metaLine(p: Person): string {
  if (p.count === 0) return escapeHtml(p.openCount > 0 ? "First 1:1 in prep — not met yet" : "not met yet");
  const bits: string[] = [`${p.count} meeting${p.count > 1 ? "s" : ""}`];
  const last = relTime(p.lastMet);
  if (last) bits.push(`last ${last}`);
  if (p.openCount > 0) bits.push("prep in progress");
  // The stars rate the PREP, not the person (audit X1) — the label says so out loud.
  const rated =
    p.avgStars != null
      ? `<span aria-label="prep rating ${escapeHtml(p.avgStars.toFixed(1))} out of 5">${icon(Star, { size: 15, fill: "currentColor" })} ${escapeHtml(p.avgStars.toFixed(1))} prep rating</span>`
      : "prep not yet rated";
  return `${escapeHtml(bits.join(" · "))} · ${rated}`;
}

// The access status: one pill + (usually) one inline action. The pill colour + the action are
// chosen from the access state. Invite/Change open the give-access modal (js-access); Remind
// resends the pending invite (js-remind, carries the inviteId).
function accessBlock(p: Person, orgUsers: OrgUser[]): string {
  const st = p.access.state;
  const pill = (mod: AccessState, glyph: string, label: string) =>
    `<span class="team-pill team-pill--${mod}">${glyph}<span>${escapeHtml(label)}</span></span>`;
  const inviteBtn = `<button type="button" class="team-link js-access" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}" data-userid="${escapeHtml(p.userId ?? "")}" data-linked="0">Invite</button>`;
  const remindBtn = `<button type="button" class="team-link js-remind" data-invite="${escapeHtml(p.access.inviteId ?? "")}" data-name="${escapeHtml(p.name)}">Remind</button>`;
  const changeBtn = `<button type="button" class="team-link js-access" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}" data-userid="${escapeHtml(p.userId ?? "")}" data-linked="1">Change</button>`;

  let body: string;
  if (st === "joined") {
    body = `${pill("joined", icon(Check, { size: 13 }), "On Sero")}${changeBtn}`;
  } else if (st === "opened") {
    body = `${pill("opened", icon(Eye, { size: 13 }), "Opened link")}${remindBtn}`;
  } else if (st === "invited") {
    const ago = p.access.invitedAt ? relTime(p.access.invitedAt) : "";
    body = `${pill("invited", icon(Clock, { size: 13 }), ago ? `Invited · ${ago}` : "Invited")}${remindBtn}`;
  } else {
    body = `${pill("none", icon(Lock, { size: 13 }), "Not on Sero")}${inviteBtn}`;
  }
  void orgUsers; // email lookup no longer shown inline — the pill carries the state
  return `<div class="team-card__access">${body}</div>`;
}

// One card for one person. Two columns: identity (avatar + name + meta) on the left, and on the
// right the access pill over the actions (Prep + ⋯).
export function personCard(p: Person, orgUsers: OrgUser[]): string {
  const role = p.role ? ` <span class="team-card__role">· ${escapeHtml(p.role)}</span>` : "";
  // One name for one action (VOICE.md): the button that begins a prep says "Start 1:1"
  // everywhere — the person page's big CTA says the same (Carl, 2026-07-17).
  const prepLabel = p.met ? "Start 1:1" : "Start first 1:1";
  // The whole card opens the person (audit M8) — `js-card-open` on the root handles a mouse
  // click anywhere; the name is a real focusable button so keyboard users can open it too. The
  // action buttons (Invite / Remind / Prep / ⋯) stop propagation in team.ts, so they still do
  // their own job. `data-key` carries the roster personId to open.
  return `
    <div class="card-flat team-card js-card-open" data-key="${escapeHtml(p.key)}">
      <div class="team-card__avatar team-card__avatar--${p.access.state}" aria-hidden="true">${escapeHtml(initials(p.name))}</div>
      <div class="team-card__who">
        <div class="team-card__name"><button type="button" class="team-card__name-btn js-open-person" data-key="${escapeHtml(p.key)}">${escapeHtml(p.name)}</button>${role}</div>
        <div class="team-card__meta">${metaLine(p)}</div>
      </div>
      <div class="team-card__right">
        ${accessBlock(p, orgUsers)}
        <div class="team-card__do">
          <button type="button" class="btn btn--ghost btn--sm js-prep-new" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}" data-role="${escapeHtml(p.role)}">${prepLabel}</button>
          <button type="button" class="row-menu-btn js-row-menu" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}" aria-haspopup="menu" aria-label="More actions for ${escapeHtml(p.name)}">${icon(MoreHorizontal, { size: 18 })}</button>
        </div>
      </div>
    </div>`;
}
