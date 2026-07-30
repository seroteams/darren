// The type ladder, copied into email (type-system P6).
//
// WHY A COPY, when the whole point of the type system is that there is one source.
// email-layout.ts's own header explains the constraint and it is real: mail clients
// strip <style> blocks, so an email has no stylesheet, no CSS classes and no CSS
// custom properties. Every value has to be baked into an inline style attribute at
// build time. There is no route by which an email can read design/tokens.css.
//
// So the choice is not "share or copy", it is "copy honestly or drift silently".
// Before this file the email shell was a FOURTH type system that nothing in the repo
// had ever checked: no test referenced it, the design guard never walked backend/,
// and it had quietly accumulated font-size 11, 12, 12.5, 14, 15, 22 and 23px. Three
// of those are below Sero's 14px accessibility floor and two are the 15px DESIGN.md
// T2 bans by name. It shipped like that to real managers.
//
// email-layout.test.ts is what keeps this copy honest: it parses the REAL
// design/tokens.css off disk and asserts every entry below still matches its rung.
// A generator was considered and rejected. It would add a build step plus a "did
// anyone re-run it" failure mode, and the test gives the identical guarantee.
//
// NOT a generator, NOT the roles wholesale: only the seven roles email actually
// uses. Adding one means email needs it.

/** One rung of the ladder, as email can express it: absolute px, baked in. */
export interface EmailRole {
  /** font-size in px. Never below 14: that is Sero's accessibility floor. */
  size: number;
  /** line-height in px. The locked partner of `size` (design/tokens.css). */
  leading: number;
  /** font-weight. Email has no variable font, so these are real weights. */
  weight: number;
  /** letter-spacing, verbatim from the role. Only .type-overline carries one. */
  tracking?: string;
  /** text-transform: uppercase. Only .type-overline. */
  upper?: boolean;
}

/*
 * The seven roles email uses, each named after the screen role it copies, so a
 * reader can put them side by side with design/type.css and see the same numbers.
 *
 * Absent on purpose:
 *   display / heading-xl  no email needs a hero, and a 30px+ heading in a 520px
 *                         card cannot drop a rung on a phone (no media queries).
 *   body-lg               nothing in an email is a lede.
 *   code / metric         no mono face and no tabular figures in mail.
 */
export const EMAIL_TYPE = {
  /** .type-overline. The little uppercase label above the heading. */
  overline: { size: 14, leading: 20, weight: 600, tracking: "0.08em", upper: true },
  /** .type-heading-lg. The email's own heading: the loudest thing in the card. */
  headingLg: { size: 24, leading: 32, weight: 600 },
  /** .type-heading-md. The "Sero" wordmark in the header band. */
  headingMd: { size: 20, leading: 28, weight: 600 },
  /** .type-heading-xs. Body-size text that has to outrank the body: the CTA label. */
  headingXs: { size: 16, leading: 24, weight: 600 },
  /** .type-body. Every paragraph a person actually reads. */
  body: { size: 16, leading: 24, weight: 400 },
  /** .type-body-sm. Footer and fine print. */
  bodySm: { size: 14, leading: 20, weight: 400 },
  /** .type-label. The key column of the detail panel. */
  label: { size: 14, leading: 20, weight: 500 },
  /** .type-label-strong. The value column of the detail panel. */
  labelStrong: { size: 14, leading: 20, weight: 600 },
} as const satisfies Record<string, EmailRole>;

export type EmailRoleName = keyof typeof EMAIL_TYPE;

/**
 * The role as an inline-style fragment, so no call site writes a number.
 *
 * That is the whole job: every `font-size:` in email-layout.ts used to be a literal
 * typed by hand, which is how three of them ended up under the floor. A call site
 * now names what the text IS, exactly as a screen does when it picks a role.
 */
export function emailType(role: EmailRoleName): string {
  const r: EmailRole = EMAIL_TYPE[role];
  return (
    `font-size:${r.size}px;line-height:${r.leading}px;font-weight:${r.weight};` +
    (r.tracking ? `letter-spacing:${r.tracking};` : "") +
    (r.upper ? "text-transform:uppercase;" : "")
  );
}
