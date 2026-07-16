import { test } from "node:test";
import assert from "node:assert/strict";
import { personCard, type Person, type OrgUser, type PersonAccess } from "./team-card.ts";

// The Team card, post redesign (team-page-redesign Phase 3): one card renderer for everyone. Access
// shows as ONE status pill + its action — Not on Sero/Invite · Invited/Remind · Opened/Remind ·
// On Sero/Change. Pure string render, so we assert on the markup.

const access = (over: Partial<PersonAccess>): PersonAccess => ({
  state: "none", inviteId: null, invitedAt: null, openedAt: null, ...over,
});
const base = {
  role: "Product Designer", count: 2, openCount: 0, lastMet: 1752000000000, ratedCount: 2, avgStars: 4.5, met: true,
};
const joined: Person = { key: "p1", name: "Priya", userId: "u1", access: access({ state: "joined" }), ...base };
const none: Person = { key: "p2", name: "Carl", userId: null, access: access({ state: "none" }), role: "UX Designer", count: 0, openCount: 1, lastMet: 0, ratedCount: 0, avgStars: null, met: false };
const invited: Person = { key: "p3", name: "Sam Lee", userId: null, access: access({ state: "invited", inviteId: "i3", invitedAt: 1752000000000 }), ...base, name: "Sam Lee" };
const opened: Person = { key: "p4", name: "Jo Kim", userId: null, access: access({ state: "opened", inviteId: "i4", invitedAt: 1751000000000, openedAt: 1752000000000 }), ...base, name: "Jo Kim" };
const users: OrgUser[] = [{ id: "u1", name: "Dev Member", email: "member@seroteams.com" }];

test("a joined person shows the On Sero pill + a Change control", () => {
  const html = personCard(joined, users);
  assert.match(html, /On Sero/);
  assert.match(html, /team-pill--joined/);
  assert.ok(html.includes(">Change<"), "offers Change");
  assert.doesNotMatch(html, /Not on Sero/);
});

test("a not-on-Sero person shows the Not-on-Sero pill + Invite", () => {
  const html = personCard(none, users);
  assert.match(html, /Not on Sero/);
  assert.match(html, /team-pill--none/);
  assert.ok(html.includes(">Invite<"), "offers Invite");
  assert.ok(html.includes("js-access"), "invite opens the access sheet");
});

test("an invited person shows the Invited pill + Remind carrying the invite id", () => {
  const html = personCard(invited, users);
  assert.match(html, /Invited/);
  assert.match(html, /team-pill--invited/);
  assert.ok(html.includes(">Remind<"), "offers Remind");
  assert.ok(html.includes('data-invite="i3"'), "Remind carries the invite id to resend");
});

test("an opened-link person shows the Opened pill + Remind", () => {
  const html = personCard(opened, users);
  assert.match(html, /Opened link/);
  assert.match(html, /team-pill--opened/);
  assert.ok(html.includes(">Remind<"));
});

test("card keeps Prep and the ⋯ menu", () => {
  assert.ok(personCard(joined, users).includes(">Prep 1:1<"), "met person: Prep 1:1");
  assert.ok(personCard(none, users).includes(">Prep first 1:1<"), "unmet person: Prep first 1:1");
  assert.ok(personCard(joined, users).includes("js-row-menu"), "the ⋯ View/Edit/Delete menu stays");
});

test("the whole card opens the person, with a keyboard-focusable name (audit M8)", () => {
  const html = personCard(joined, users);
  assert.match(html, /team-card js-card-open/, "card root is clickable");
  assert.match(html, /data-key="p1"/, "card carries the personId to open");
  assert.ok(html.includes('js-open-person'), "the name is a focusable open control for keyboards");
});
