import { test } from "node:test";
import assert from "node:assert/strict";
import { groupRunsByPerson } from "./group-people.js";

type Person = {
  key: string;
  personId?: string | null;
  name: string;
  role?: string;
  count: number;
  openCount: number;
  lastMet: number;
  avgStars: number | null;
};

// Team-for-managers: a started-but-unfinished prep (finished:false) puts the person on
// the Team, but doesn't count as a meeting — count stays finished-only, openCount says
// "prep in progress". Rows without the flag (older payloads, person page) count as before.

test("an open prep creates the person but counts no meeting", () => {
  const people = groupRunsByPerson(
    [{ ctx: { name: "Darren", role: "UX Designer" }, lastSeenAt: 100, finished: false }],
    undefined,
  ) as Person[];
  assert.equal(people.length, 1);
  assert.equal(people[0].name, "Darren");
  assert.equal(people[0].count, 0);
  assert.equal(people[0].openCount, 1);
  assert.equal(people[0].lastMet, 0); // never actually met
});

test("open and finished runs for the same person fold into one card", () => {
  const people = groupRunsByPerson(
    [
      { ctx: { name: "Priya" }, lastSeenAt: 50, finished: true, rating: { stars: 4 } },
      { ctx: { name: "priya" }, lastSeenAt: 200, finished: false },
    ],
    undefined,
  ) as Person[];
  assert.equal(people.length, 1);
  assert.equal(people[0].count, 1);
  assert.equal(people[0].openCount, 1);
  assert.equal(people[0].lastMet, 50); // the open prep is not a meeting
  assert.equal(people[0].avgStars, 4);
});

test("a row without the finished flag counts as a meeting (older payloads unchanged)", () => {
  const people = groupRunsByPerson(
    [{ ctx: { name: "Ade" }, lastSeenAt: 10, rating: { stars: 5 } }],
    undefined,
  ) as Person[];
  assert.equal(people[0].count, 1);
  assert.equal(people[0].openCount, 0);
  assert.equal(people[0].lastMet, 10);
});

// people-roster Phase 4: runs stamped with a personId group on the ROSTER identity, not
// the name string — so "Priya" and "Priya Shah" runs pointing at the same person fold,
// and the roster row's name/role win over the runs' free-text snapshots.

test("runs with the same personId fold into one card even under different names", () => {
  const people = groupRunsByPerson(
    [
      { ctx: { name: "Priya" }, lastSeenAt: 10, finished: true, personId: "p1" },
      { ctx: { name: "Priya Shah" }, lastSeenAt: 20, finished: true, personId: "p1" },
    ],
    undefined,
  ) as Person[];
  assert.equal(people.length, 1);
  assert.equal(people[0].key, "p1");
  assert.equal(people[0].personId, "p1");
  assert.equal(people[0].count, 2);
});

test("the roster supplies the display name/role for personId cards; unstamped runs keep name-keys", () => {
  const roster = {
    people: [{ id: "p1", name: "Priya Shah", role: "Senior Engineer" }],
    merges: {},
  };
  const people = groupRunsByPerson(
    [
      { ctx: { name: "priya", role: "Eng" }, lastSeenAt: 10, finished: true, personId: "p1" },
      { ctx: { name: "Marco" }, lastSeenAt: 5, finished: true }, // legacy, no personId
    ],
    undefined,
    roster,
  ) as Person[];
  assert.deepEqual(people.map((p) => [p.key, p.name]), [["p1", "Priya Shah"], ["marco", "Marco"]]);
  assert.equal(people[0].role, "Senior Engineer");
  assert.equal(people[1].personId, null);
});

test("a run stamped with a merged-away personId folds onto the canonical person via roster merges", () => {
  const roster = {
    people: [{ id: "p2", name: "Priya Shah", role: "" }],
    merges: { p1: "p2" },
  };
  const people = groupRunsByPerson(
    [
      { ctx: { name: "Priya" }, lastSeenAt: 10, finished: true, personId: "p1" },
      { ctx: { name: "Priya Shah" }, lastSeenAt: 20, finished: true, personId: "p2" },
    ],
    undefined,
    roster,
  ) as Person[];
  assert.equal(people.length, 1);
  assert.equal(people[0].key, "p2");
  assert.equal(people[0].count, 2);
});

test("a person with only a fresh open prep sorts by that prep, not to the bottom", () => {
  const people = groupRunsByPerson(
    [
      { ctx: { name: "Old Hand" }, lastSeenAt: 100, finished: true },
      { ctx: { name: "Darren" }, lastSeenAt: 900, finished: false },
    ],
    undefined,
  ) as Person[];
  assert.deepEqual(people.map((p) => p.name), ["Darren", "Old Hand"]);
});
