import { test } from "node:test";
import assert from "node:assert/strict";
import { personCard, type Person, type OrgUser } from "./team-card.ts";

// The Team card, post access-redesign: one card renderer for everyone (no mode). Every card
// carries an access line — a linked person shows their account, an unlinked person shows
// "No access yet" with a way to give it. Pure string render, so we assert on the markup.

const linked: Person = {
  key: "p1", name: "Priya", userId: "u1", role: "Product Designer",
  count: 2, openCount: 0, lastMet: 1752000000000, ratedCount: 2, avgStars: 4.5, met: true,
};
const unlinked: Person = {
  key: "p2", name: "Carl", userId: null, role: "UX Designer",
  count: 0, openCount: 1, lastMet: 0, ratedCount: 0, avgStars: null, met: false,
};
const users: OrgUser[] = [{ id: "u1", name: "Dev Member", email: "member@seroteams.com" }];

test("linked person's card shows their account email and a Change control", () => {
  const html = personCard(linked, users);
  assert.ok(html.includes("member@seroteams.com"), "shows the linked account email");
  assert.ok(html.includes(">Change<"), "offers Change");
  assert.ok(html.includes("js-access"), "access control is on the card");
  assert.ok(!html.includes("No access"), "a linked person is not shown as no-access");
});

test("unlinked person's card shows No access yet and Give access", () => {
  const html = personCard(unlinked, users);
  assert.ok(html.includes("No access yet"), "shows the no-access chip");
  assert.ok(html.includes(">Give access<"), "offers Give access");
  assert.ok(!html.includes("member@seroteams.com"), "no account email for an unlinked person");
});

test("card keeps Prep and the ⋯ menu (nothing else moved)", () => {
  assert.ok(personCard(linked, users).includes(">Prep 1:1<"), "met person: Prep 1:1");
  assert.ok(personCard(unlinked, users).includes(">Prep first 1:1<"), "unmet person: Prep first 1:1");
  assert.ok(personCard(linked, users).includes("js-row-menu"), "the ⋯ View/Edit/Delete menu stays");
});

test("linked but org accounts unavailable still shows access + Change, no crash", () => {
  const html = personCard(linked, []);
  assert.ok(html.includes(">Change<"), "can still change/remove access");
  assert.ok(!html.includes("No access yet"), "a linked person is never shown as no-access");
});
