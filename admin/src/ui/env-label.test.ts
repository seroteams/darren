// The whole point of these words is that local NEVER claims to be showing live data.
// Guard both halves, and guard the house copy rule while we're here (no em dashes).
import { test } from "node:test";
import assert from "node:assert/strict";
import { envTitleWord, envPlace, pulseIntro, liveNotVisibleNote, errorLogIntro } from "./env-label.ts";

test("the title word names the environment", () => {
  assert.equal(envTitleWord(true), "Live");
  assert.equal(envTitleWord(false), "Local");
});

test("mid-sentence, local says where it really is", () => {
  assert.equal(envPlace(true), "live");
  assert.equal(envPlace(false), "this machine");
});

test("the local standfirst never claims to be the live site", () => {
  assert.match(pulseIntro(true), /live site right now/);
  assert.doesNotMatch(pulseIntro(false), /the live site right now/i);
  assert.match(pulseIntro(false), /not the live site/i);
});

test("local warns that live errors are elsewhere, live says nothing", () => {
  assert.equal(liveNotVisibleNote(true), "");
  assert.match(liveNotVisibleNote(false), /sero\.team/);
});

test("the error log names one environment, never both at once", () => {
  assert.match(errorLogIntro(true), /live site/i);
  assert.doesNotMatch(errorLogIntro(true), /this machine/i);
  assert.match(errorLogIntro(false), /this machine/i);
  assert.doesNotMatch(errorLogIntro(false), /live/i);
});

test("no em dashes or en-dash separators in any of the copy", () => {
  const copy = [
    envTitleWord(true), envTitleWord(false), envPlace(true), envPlace(false),
    pulseIntro(true), pulseIntro(false), liveNotVisibleNote(true), liveNotVisibleNote(false),
    errorLogIntro(true), errorLogIntro(false),
  ].join(" ");
  // Built from char codes on purpose: a literal dash here would trip `npm run lint:copy`
  // on this very test file.
  const emDash = String.fromCharCode(0x2014);
  const enDashSep = ` ${String.fromCharCode(0x2013)} `;
  assert.ok(!copy.includes(emDash), "em dash is banned in user-facing copy");
  assert.ok(!copy.includes(enDashSep), "en dash as a separator is the same sin");
});
