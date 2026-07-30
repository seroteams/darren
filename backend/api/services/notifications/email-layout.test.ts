// The only thing holding the email shell's type (type-system P6).
//
// scripts/lint-design-tokens.js cannot: it walks admin/src and frontend/src, and even
// with backend/api/services/notifications added to SCAN_DIRS, email-layout.ts has to
// stay allowlisted because an email is inline hex and literal font stacks by
// necessity. So the guarantee lives here instead, and it is a stronger one than the
// linter gives, because assertion 1 reads the REAL design/tokens.css off disk.
//
// Before this file existed nothing in the repo had ever checked this shell. It had
// three font sizes below the 14px accessibility floor and two the design system bans
// by name, and it shipped like that to real managers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EMAIL_TYPE, emailType } from "./email-type.ts";
import {
  renderSeroEmail,
  emailParagraph,
  emailDetailPanel,
  emailButton,
  emailFinePrint,
} from "./email-layout.ts";

// Path off the repo root, not import.meta: this file builds to CommonJS, where the
// meta-property is a hard TS error. Same reason backend/engine/agenda.test.ts does it.
const TOKENS_CSS = join(process.cwd(), "admin/src/styles/design/tokens.css");

// Every --type-size-* / --type-leading-* pair from the real ladder, in px.
// rem x 16 because nothing in either app sets a root font-size.
function ladderFromTokens(): Map<string, number> {
  const css = readFileSync(TOKENS_CSS, "utf8");
  const out = new Map<string, number>();
  for (const m of css.matchAll(/(--type-(?:size|leading)-[a-z0-9]+)\s*:\s*([\d.]+)rem/gi)) {
    const [, name, rem] = m;
    if (!name || !rem) continue;
    out.set(name.toLowerCase(), Math.round(Number(rem) * 16 * 1000) / 1000);
  }
  return out;
}

// role name in email-type.ts -> the token suffix it copies, from design/type.css.
const ROLE_RUNG: Record<keyof typeof EMAIL_TYPE, string> = {
  overline: "sm",
  headingLg: "2xl",
  headingMd: "xl",
  headingXs: "base",
  body: "base",
  bodySm: "sm",
  label: "sm",
  labelStrong: "sm",
};

test("every email role still matches its rung in the real tokens.css", () => {
  const ladder = ladderFromTokens();
  assert.ok(ladder.size >= 14, `only found ${ladder.size} ladder tokens. Did tokens.css move?`);

  for (const [name, role] of Object.entries(EMAIL_TYPE)) {
    const rung = ROLE_RUNG[name as keyof typeof EMAIL_TYPE];
    const size = ladder.get(`--type-size-${rung}`);
    const leading = ladder.get(`--type-leading-${rung}`);
    assert.equal(role.size, size, `${name}: size ${role.size} but --type-size-${rung} is ${size}`);
    assert.equal(role.leading, leading, `${name}: leading ${role.leading} but --type-leading-${rung} is ${leading}`);
  }
});

test("the ladder is the seven Tailwind rungs and it starts at the 14px floor", () => {
  const ladder = ladderFromTokens();
  const sizes = [...ladder]
    .filter(([k]) => k.startsWith("--type-size-"))
    .map(([, v]) => v)
    .sort((a, b) => a - b);
  assert.deepEqual(sizes, [14, 16, 18, 20, 24, 30, 36]);
});

// Render everything the shell can produce, so no helper escapes the sweep.
function everyEmailHtml(): string {
  return [
    renderSeroEmail({ eyebrow: "Admin notification", heading: "Someone joined your team", bodyHtml: "" }),
    renderSeroEmail({ heading: "Password reset", bodyHtml: "" }), // the no-eyebrow branch
    emailParagraph("A friendly line."),
    emailDetailPanel([["Who", "Machar Smith"], ["When", "Today"]]),
    emailButton("Open Sero", "https://sero.team"),
    emailFinePrint("If you did not expect this, ignore it."),
  ].join("\n");
}

test("no email text renders below the 14px floor", () => {
  const sizes = [...everyEmailHtml().matchAll(/font-size:\s*([\d.]+)px/gi)].map((m) => Number(m[1]));
  assert.ok(sizes.length > 0, "found no font-size at all, so this test is not looking at the shell");

  const breaches = sizes.filter((s) => s !== 0 && s < 14);
  assert.deepEqual(
    breaches,
    [],
    `below the 14px floor: ${breaches.join(", ")}px. Use a role from email-type.ts.`
  );
});

test("every email size is on the ladder, and 0 only ever means a spacer strut", () => {
  const html = everyEmailHtml();
  const sizes = [...html.matchAll(/font-size:\s*([\d.]+)px/gi)].map((m) => Number(m[1]));
  const RUNGS = [14, 16, 18, 20, 24, 30, 36];

  const off = [...new Set(sizes)].filter((s) => s !== 0 && !RUNGS.includes(s));
  assert.deepEqual(off, [], `off-ladder email sizes: ${off.join(", ")}px`);

  // The zeroes are the &nbsp; struts holding the 4px accent bar and the 1px hairline
  // open. They are table cells, not text. They are written UNITLESS (`font-size:0`),
  // which is why they need their own pattern: the px sweep above cannot see them, and
  // a sweep that cannot see a declaration is how this file drifted in the first place.
  const struts = [...html.matchAll(/font-size:\s*0\s*[;"]/gi)].length;
  assert.equal(struts, 4, "expected exactly the two struts, in each of the two shells rendered");
});

test("the eyebrow is the overline role: 14px, not the 11px it shipped as", () => {
  const html = renderSeroEmail({ eyebrow: "Admin notification", heading: "H", bodyHtml: "" });
  assert.match(html, /font-size:14px;line-height:20px;font-weight:600;letter-spacing:0\.08em;text-transform:uppercase;/);
  assert.doesNotMatch(html, /font-size:11px/);
});

test("the heading is louder than the wordmark, and they are a rung apart", () => {
  // They used to be 22 and 23px, which DESIGN.md T2 calls a bug rather than a level.
  assert.equal(EMAIL_TYPE.headingLg.size, 24);
  assert.equal(EMAIL_TYPE.headingMd.size, 20);
  assert.ok(
    EMAIL_TYPE.headingLg.size > EMAIL_TYPE.headingMd.size,
    "the email's own heading must outrank the brand wordmark"
  );
});

test("the detail panel separates key from value by weight, not by size", () => {
  const html = emailDetailPanel([["Who", "Machar Smith"]]);
  assert.equal(EMAIL_TYPE.label.size, EMAIL_TYPE.labelStrong.size);
  assert.notEqual(EMAIL_TYPE.label.weight, EMAIL_TYPE.labelStrong.weight);
  assert.match(html, /font-weight:500/);
  assert.match(html, /font-weight:600/);
});

test("emailType writes the whole pair, so a size can never arrive without its leading", () => {
  assert.equal(emailType("body"), "font-size:16px;line-height:24px;font-weight:400;");
  assert.equal(
    emailType("overline"),
    "font-size:14px;line-height:20px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;"
  );
  for (const name of Object.keys(EMAIL_TYPE) as (keyof typeof EMAIL_TYPE)[]) {
    const css = emailType(name);
    assert.match(css, /font-size:\d+px;/, `${name} emitted no size`);
    assert.match(css, /line-height:\d+px;/, `${name} emitted no leading`);
  }
});
