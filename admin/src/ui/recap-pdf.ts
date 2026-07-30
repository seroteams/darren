// Recap → designed PDF (guest recap "Save as PDF"). Builds a pdfmake document
// definition from the briefing the engine produced — same content as the screen,
// no rewriting — and downloads it client-side. pdfmake (+ its Roboto fonts) is
// dynamically imported so the main bundle stays untouched.
//
// Colors are the design-token hex values (tokens.css) — pdfmake can't read CSS
// variables, so the source token is named beside each one.

type Axis = {
  id: string;
  score: number;
  meaning?: string;
  read_status?: string;
};

type NextAction = { when?: string; action?: string };

type EngagementRead = {
  read_status?: string;
  level?: string;
  recommended_action?: string;
};

export type RecapBriefing = {
  headline?: string;
  summary_bullets?: string[];
  understanding_paragraph?: string;
  axes?: Axis[];
  brutal_truth_employee?: string;
  brutal_truth_manager?: string;
  next_actions?: NextAction[];
  watch_for?: string[];
  engagement_read?: EngagementRead;
  completedAt?: string | number | null;
};

// What the manager gave Sero at intake — shown at the top of the PDF so the
// recap is self-explaining when it's forwarded or filed.
export type RecapCtx = {
  name?: string;
  role?: string;
  seniority?: string;
  meetingType?: string;
  notes?: string;
};

// A locked-in agreement from the promises step (promises-before-recap). When
// these exist they replace the raw next_actions in "What to do next" — the PDF
// says who promised what, not what the engine merely suggested.
export type RecapPromise = { owner?: string; action?: string; when?: string };

const COLOR = {
  ink: "#1f2a37",        // --color-ink
  inkDim: "#636363",     // --color-ink-dim
  inkMute: "#757575",    // --color-ink-mute
  accent: "#5aa9e6",     // --color-accent
  accentDark: "#1b5d91", // --color-accent-dark
  border: "#e8e8e8",     // --color-border
  positive: "#1aa887",   // --color-positive (mint-800)
  negative: "#f76b5e",   // --color-negative (coral-700)
  mintBg: "#f8fefc",     // --sero-mint-100
  mintLine: "#e1faf4",   // --sero-mint-300
  mintText: "#0c4b3c",   // --color-positive-text (mint-900)
  goldBg: "#fffbf4",     // --sero-gold-100
  goldLine: "#fff0d1",   // --sero-gold-300
  goldText: "#523600",   // --sero-gold-900
  accentBg: "#e9f3fb",   // --color-accent-soft (primary-200)
  accentLine: "#d7eaf8", // --sero-primary-300
  negText: "#ac1608",    // --color-negative-text (coral-800)
  lavTrack: "#f4f1fa",   // --sero-lavender-200
  lavMid: "#d5c9eb",     // --sero-lavender-500
  lavFill: "#b49edb",    // --sero-lavender-700
  lavLine: "#c5b5e4",    // --sero-lavender-600
};

// The app logo (session-topbar.js), with the CSS-variable fill resolved to the
// ink token — pdfmake renders it as a vector.
const LOGO_SVG = `<svg viewBox="0 0 48 48" width="22" height="22">
  <rect width="48" height="48" rx="12" fill="#1f2a37"/>
  <rect x="9" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <rect x="32.5" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <circle cx="24" cy="18.5" r="5" fill="#fff"/>
  <circle cx="24" cy="31" r="5" fill="#fff"/>
</svg>`;

const VISUAL_MAX = 6; // same visual clamp as the on-screen axis bars (ui/axes.js)

const WHEN_ORDER = ["today", "this week", "this month", "next 1:1"];

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// The PDF font (Roboto subset) has no glyphs for arrows or emoji — swap the
// common ones for ASCII and drop the rest so no tofu boxes reach the page.
// The words themselves are never rewritten.
function pdfSafe(s: unknown): string {
  return String(s ?? "")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↑/g, "^")
    .replace(/↓/g, "v")
    .replace(/✓|✔/g, "+")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}️]/gu, "")
    .replace(/ {2,}/g, " ");
}

function capWhen(w: string | undefined): string {
  const s = String(w || "").trim();
  if (!s) return "";
  if (s === "next 1:1") return "Next 1:1";
  return cap(s);
}

function whenRank(w: string | undefined): number {
  const i = WHEN_ORDER.indexOf(String(w || ""));
  return i === -1 ? WHEN_ORDER.length : i;
}

function axisWasRead(a: Axis): boolean {
  return a.read_status ? a.read_status !== "not_read" : a.score !== 0;
}

/* =============================================================================
   THE PRINT LADDER (type-system P6)

   The screen's fourteen roles, converted once, here, instead of eight free
   pt values scattered through the builder. Before this the file held 8, 8.5, 9,
   9.5, 10, 10.5, 15 and 20pt with three different characterSpacing values for
   what is one object (an uppercase eyebrow), which is the same T2 defect the
   screen migration exists to fix.

   THE CONVERSION, and why it is the only defensible one.
   pdfmake measures in POINTS. 1pt = 1/72 inch and CSS 1px = 1/96 inch, so
        pt = px x 0.75
   Any other factor prints the page at a different size from the screen for no
   stated reason. The file was already half on this conversion by accident, which
   is the strongest evidence for adopting it rather than inventing a print scale:
   defaultStyle was fontSize 10.5 / lineHeight 1.4, and 10.5pt IS 14px with a
   20/14 leading. The PDF's body copy was .type-body-sm all along. The "Sero"
   wordmark at 15pt is likewise exactly .type-heading-md (20px x 0.75).

   TWO pdfmake UNITS THAT ARE NOT CSS UNITS, and both bite:
   - `lineHeight` is a MULTIPLIER, not a length. So it is leadingPx / sizePx, and
     the locked pairs come through as ratios: 14/20 becomes 1.4286, not 20.
   - `characterSpacing` is ABSOLUTE POINTS, not em. So it is emValue x sizePt.
     .type-overline's 0.08em at 10.5pt is 0.84pt.

   WEIGHTS WITH NO PDF EQUIVALENT. Only three static faces ship
   (admin/src/assets/pdf-fonts/): inter-regular, inter-bold, bricolage-semibold.
   Rather than invent files, the gaps are named and substituted here:
   - Inter 600 (heading-sm, heading-xs, label-strong, overline) has no
     inter-semibold.ttf. All four fall to inter-bold 700 and print a step heavier
     than they look on screen.
   - Inter 500 (label) has no inter-medium.ttf. It falls to regular 400, so
     `label` and `bodySm` are indistinguishable in print. label is therefore not
     used below: anything that needed to separate from body takes labelStrong.
   - .type-code has NO mono TTF at all, so it has no print form. Nothing in the
     recap renders code today, so this is a gap rather than a bug.
   - .type-metric's tabular figures cannot be delivered either: pdfmake exposes no
     font-feature control. The Final read column is one digit wide, so it does not
     bite, and metric is not used below.
   Bricolage 600 is covered exactly. Its `normal` and `bold` both point at
   bricolage-semibold.ttf, so bold:true on Bricolage is a no-op and no synthetic
   emboldening happens. That is correct and should stay.

   CONSEQUENCE, stated plainly: the screen ladder has no rung below 14px, so the
   print ladder has no rung below 10.5pt. Six of the eight sizes this file used
   (8, 8.5, 9, 9.5, 10 and the 20pt headline) were below or off it, so the
   eyebrows, the labels, the axis lines, the when-pills and the footer all rise.
   Expect the document to grow by roughly a page. That is a visible change to
   something customers forward and file, and it is the point of the phase.

   Held by admin/src/ui/recap-pdf.test.ts, which is the ONLY thing that can hold
   this file: it is allowlisted out of the CSS guard at
   scripts/lint-design-tokens.js because pdfmake cannot read a CSS variable.
   ============================================================================= */
export const PRINT = {
  //          pt     lineHeight (leadingPx/sizePx)   from the screen role
  display:     { fontSize: 27,   lineHeight: 40 / 36, font: "Bricolage", characterSpacing: -0.54 },
  headingXl:   { fontSize: 22.5, lineHeight: 36 / 30, font: "Bricolage", characterSpacing: -0.225 },
  headingLg:   { fontSize: 18,   lineHeight: 32 / 24, font: "Bricolage", characterSpacing: -0.18 },
  headingMd:   { fontSize: 15,   lineHeight: 28 / 20, font: "Bricolage" },
  headingSm:   { fontSize: 13.5, lineHeight: 28 / 18, bold: true },
  headingXs:   { fontSize: 12,   lineHeight: 24 / 16, bold: true },
  bodyLg:      { fontSize: 13.5, lineHeight: 28 / 18 },
  body:        { fontSize: 12,   lineHeight: 24 / 16 },
  bodySm:      { fontSize: 10.5, lineHeight: 20 / 14 },
  labelStrong: { fontSize: 10.5, lineHeight: 20 / 14, bold: true },
  overline:    { fontSize: 10.5, lineHeight: 20 / 14, bold: true, characterSpacing: 0.84 },
} as const;

// Every fontSize the ladder above can produce. The test asserts the document uses
// nothing else, which is what stops a ninth loose number appearing next year.
export const PRINT_RUNGS = [10.5, 12, 13.5, 15, 18, 22.5, 27] as const;

/*
 * ONE uppercase label recipe, not four. This helper carried 8.5pt / cs 1.2, while
 * three hand-written copies of the same object elsewhere in the builder used 8pt /
 * cs 1 ("WHO THIS WAS FOR", "WHAT SERO WAS TOLD GOING IN", the promise group
 * label). All four are the same thing: an uppercase section eyebrow. They now all
 * come through here on .type-overline.
 */
function eyebrow(text: string, opts: Record<string, unknown> = {}) {
  return {
    text: text.toUpperCase(),
    ...PRINT.overline,
    color: COLOR.accentDark,
    margin: [0, 18, 0, 6],
    ...opts,
  };
}

// Centre-zero score bar, mirroring the on-screen Final read meter (user-test-fixes
// P2: the runner's lavender language) — lavender track, centre-out lavender fill,
// a white thumb pill at the fill's leading edge. The score number stays in the
// text column; pdfmake canvases can't carry text, so the pill is the marker.
function axisBar(score: number) {
  const W = 150;
  const H = 6;
  const half = W / 2;
  const clamped = Math.max(-VISUAL_MAX, Math.min(VISUAL_MAX, score));
  const ratio = Math.abs(clamped) / VISUAL_MAX;
  const fill = half * ratio;
  const shapes: Record<string, unknown>[] = [
    { type: "rect", x: 0, y: 0, w: W, h: H, r: 3, color: COLOR.lavTrack },
  ];
  if (score > 0) shapes.push({ type: "rect", x: half, y: 0, w: fill, h: H, r: 3, color: COLOR.lavFill });
  if (score < 0) shapes.push({ type: "rect", x: half - fill, y: 0, w: fill, h: H, r: 3, color: COLOR.lavFill });
  shapes.push({ type: "rect", x: half - 0.5, y: -1, w: 1, h: H + 2, color: COLOR.lavMid });
  const thumbX = half + (clamped / VISUAL_MAX) * half;
  shapes.push({
    type: "rect", x: Math.max(0, Math.min(W - 18, thumbX - 9)), y: -2.5, w: 18, h: H + 5, r: 5.5,
    color: "#ffffff", lineColor: COLOR.lavLine, lineWidth: 0.75,
  });
  return { canvas: shapes, width: W, margin: [0, 3, 0, 0] };
}

// A soft tinted box (honest reads) — single-cell table so it survives page flow.
function tintedBox(children: unknown[], bg: string, line: string) {
  return {
    table: { widths: ["*"], body: [[{ stack: children, margin: [10, 8, 10, 9] }]] },
    layout: {
      hLineWidth: () => 0.75,
      vLineWidth: () => 0.75,
      hLineColor: () => line,
      vLineColor: () => line,
      fillColor: () => bg,
    },
    margin: [0, 0, 0, 8],
    unbreakable: true,
  };
}

export function recapPdfFilename(name: string | undefined, completedAt?: string | number | null): string {
  const slug = String(name || "1-1")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "1-1";
  const d = completedAt ? new Date(completedAt) : new Date();
  const stamp = isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  return `sero-recap-${slug}-${stamp}.pdf`;
}

export function buildRecapDocDefinition(
  b: RecapBriefing,
  ctx: RecapCtx | undefined,
  promises?: RecapPromise[] | null,
) {
  const name = pdfSafe((ctx?.name || "").trim());
  const role = pdfSafe((ctx?.role || "").trim());
  const meetingType = pdfSafe((ctx?.meetingType || "").trim());
  const notes = pdfSafe((ctx?.notes || "").trim());
  const when = b.completedAt ? new Date(b.completedAt) : new Date();
  const dateLine = isNaN(when.getTime())
    ? ""
    : when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const content: unknown[] = [];

  // Header band: logo + wordmark + date, ruled off in accent.
  content.push({
    columns: [
      { svg: LOGO_SVG, width: 20 },
      // 15pt IS heading-md (20px x 0.75), so the size does not move. It gains the
      // display face, which is what carries it on screen.
      { text: "Sero", ...PRINT.headingMd, bold: true, color: COLOR.accentDark, margin: [7, 1, 0, 0] },
      { text: dateLine, alignment: "right", ...PRINT.bodySm, color: COLOR.inkMute, margin: [0, 5, 0, 0] },
    ],
  });
  content.push({
    canvas: [{ type: "line", x1: 0, y1: 6, x2: 499, y2: 6, lineWidth: 1.25, lineColor: COLOR.accent }],
    margin: [0, 0, 0, 14],
  });

  // Who this was for + what the manager gave Sero at intake — verbatim, so the
  // PDF stands on its own when it's forwarded or filed.
  if (name || role || meetingType || notes) {
    const ctxLines: unknown[] = [];
    if (name || role) {
      ctxLines.push(eyebrow("Who this was for", { margin: [0, 0, 0, 3] }));
      ctxLines.push({
        text: [
          { text: name || "–", bold: true },
          ...(role ? [{ text: `  ·  ${role}`, color: COLOR.inkDim }] : []),
        ],
      });
      if (meetingType) ctxLines.push({ text: `Meeting: ${meetingType}`, ...PRINT.bodySm, color: COLOR.inkDim, margin: [0, 2, 0, 0] });
    }
    if (notes) {
      ctxLines.push(eyebrow("What Sero was told going in", { margin: [0, name || role ? 8 : 0, 0, 3] }));
      ctxLines.push({ text: `“${notes}”`, color: COLOR.inkDim });
    }
    content.push(tintedBox(ctxLines, COLOR.accentBg, COLOR.accentLine));
  }

  content.push(eyebrow("1:1 recap", { margin: [0, 8, 0, 8] }));
  // The most visible change in the document: 20pt was off every print rung (it is
  // 26.67px, between the 24 and 30 rungs). heading-xl is the role this is on screen.
  content.push({ text: pdfSafe(b.headline || "Recap"), ...PRINT.headingXl, color: COLOR.ink });

  const bullets = b.summary_bullets || [];
  if (bullets.length) {
    content.push(eyebrow("What stood out"));
    content.push({
      ul: bullets.map((t) => ({ text: pdfSafe(t), margin: [0, 0, 0, 3] })),
      markerColor: COLOR.accent,
    });
  }

  const para = pdfSafe(b.understanding_paragraph).trim();
  if (para) {
    content.push(eyebrow("What we understood"));
    content.push({ text: para });
  }

  const axes = b.axes || [];
  const readAxes = axes.filter(axisWasRead);
  const unreadAxes = axes.filter((a) => !axisWasRead(a));
  if (axes.length) {
    content.push(eyebrow("Final read"));
    for (const a of readAxes) {
      content.push({
        columns: [
          // width 78 was sized for 10pt; the longest axis name needs a little more room
          // at 10.5pt bold. The row totals 282pt inside a 499pt text column, so the extra
          // 8pt costs nothing.
          { text: cap(a.id), width: 86, ...PRINT.labelStrong },
          axisBar(a.score),
          {
            text: String(a.score),
            width: 26,
            alignment: "right",
            ...PRINT.labelStrong,
            color: a.score > 0 ? COLOR.mintText : a.score < 0 ? COLOR.negText : COLOR.inkDim,
          },
        ],
        columnGap: 10,
        margin: [0, 2, 0, 1],
      });
      if (a.meaning) {
        content.push({ text: pdfSafe(a.meaning), ...PRINT.bodySm, color: COLOR.inkDim, margin: [0, 0, 0, 6] });
      }
    }
    if (unreadAxes.length) {
      const names = unreadAxes.map((a) => cap(a.id));
      const list = names.length > 1
        ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
        : names[0];
      content.push({
        text: `${list}. Not enough signal to read this session.`,
        ...PRINT.bodySm,
        color: COLOR.inkMute,
        margin: [0, 2, 0, 0],
      });
    }
  }

  const empTruth = pdfSafe(b.brutal_truth_employee).trim();
  const mgrTruth = pdfSafe(b.brutal_truth_manager).trim();
  if (empTruth || mgrTruth) {
    content.push(eyebrow("The honest read"));
    if (empTruth) {
      content.push(tintedBox([
        // Sentence case, so this is label-strong and NOT overline: the 0.5pt tracking
        // it used to carry only existed to make 8.5pt legible.
        { text: (name ? `Honest read:${name}` : "Honest read:Them") + "   ·   OK to share", ...PRINT.labelStrong, color: COLOR.mintText, margin: [0, 0, 0, 4] },
        { text: empTruth },
      ], COLOR.mintBg, COLOR.mintLine));
    }
    if (mgrTruth) {
      content.push(tintedBox([
        { text: "Honest read:You   ·   Private, just for you", ...PRINT.labelStrong, color: COLOR.goldText, margin: [0, 0, 0, 4] },
        { text: mgrTruth },
      ], COLOR.goldBg, COLOR.goldLine));
    }
  }

  const er = b.engagement_read;
  if (er && er.read_status === "read" && er.recommended_action) {
    content.push(eyebrow("How engaged they seem"));
    content.push({ text: [{ text: "Your move  ", ...PRINT.labelStrong, color: COLOR.accentDark }, { text: pdfSafe(er.recommended_action) }] });
  }

  // Locked-in promises beat raw suggestions: when the manager confirmed the
  // agreements, the PDF shows those, grouped by owner (manager's own first).
  // Without a lock, the engine's suggestions render as before — labelled as
  // suggestions, never as an agreement.
  const locked = Array.isArray(promises); // [] is a lock too — "confirmed none"
  const agreed = (locked ? promises : []).filter((p) => p && String(p.action || "").trim());
  const actions = (b.next_actions || []).filter((a) => String(a.action || "").trim());
  if (agreed.length) {
    content.push(eyebrow("What you agreed"));
    const groups: [string, RecapPromise[]][] = [
      ["You promised", agreed.filter((p) => p.owner !== "report")],
      [`${name || "They"} promised`, agreed.filter((p) => p.owner === "report")],
    ];
    for (const [label, list] of groups) {
      if (!list.length) continue;
      content.push(eyebrow(label, { margin: [0, 4, 0, 4] }));
      for (const p of list) {
        // No date set → no empty gutter (user-test-fixes P2: the blank pill/gap).
        content.push({
          columns: [
            ...(capWhen(p.when)
              // width 66 was sized for 9pt. "Next 1:1" is the longest value and it has to
              // stay on one line at 10.5pt bold, so the column gains 6pt.
              ? [{ text: capWhen(p.when), width: 72, ...PRINT.labelStrong, color: COLOR.accentDark, margin: [0, 1, 0, 0] as [number, number, number, number] }]
              : []),
            { text: pdfSafe(p.action) },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 5],
        });
      }
    }
  } else if (!locked && actions.length) {
    // A locked-empty list ("confirmed none") suppresses the suggestions too —
    // the manager's explicit call outranks the engine's list, same as on screen.
    content.push(eyebrow("Sero's suggestions"));
    [...actions]
      .sort((x, y) => whenRank(x.when) - whenRank(y.when))
      .forEach((a) => {
        content.push({
          columns: [
            ...(capWhen(a.when)
              // Twin of the promise when-pill above; same widening for the same reason.
              ? [{ text: capWhen(a.when), width: 72, ...PRINT.labelStrong, color: COLOR.accentDark, margin: [0, 1, 0, 0] as [number, number, number, number] }]
              : []),
            { text: pdfSafe(a.action) },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 5],
        });
      });
  }

  const watch = b.watch_for || [];
  if (watch.length) {
    content.push(eyebrow("Reminders"));
    content.push({
      ul: watch.map((t) => ({ text: pdfSafe(t), margin: [0, 0, 0, 3] })),
      markerColor: COLOR.accent,
    });
  }

  return {
    pageSize: "A4",
    pageMargins: [48, 52, 48, 58] as [number, number, number, number],
    // bodySm, which is what this already was by accident: 10.5pt = 14px and the old
    // 1.4 is 1.4286 once it is derived from the pair rather than chosen.
    defaultStyle: { font: "Inter", ...PRINT.bodySm, color: COLOR.ink },
    info: { title: name ? `Sero 1:1 recap. ${name}` : "Sero 1:1 recap", creator: "Sero" },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "Made with Sero · seroapp.com", ...PRINT.bodySm, color: COLOR.inkMute },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", ...PRINT.bodySm, color: COLOR.inkMute },
      ],
      margin: [48, 24, 48, 0],
    }),
    content,
  };
}

// The app's own typefaces (Bricolage headline, Inter everything else), served as
// static TTF instances generated from the same @fontsource variable fonts the
// screens use (admin/src/assets/pdf-fonts/). Fetched once, then cached.
const PDF_FONTS = {
  Inter: { normal: "inter-regular.ttf", bold: "inter-bold.ttf", italics: "inter-regular.ttf", bolditalics: "inter-bold.ttf" },
  Bricolage: { normal: "bricolage-semibold.ttf", bold: "bricolage-semibold.ttf", italics: "bricolage-semibold.ttf", bolditalics: "bricolage-semibold.ttf" },
};

let vfsPromise: Promise<Record<string, string>> | null = null;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function loadFontVfs(): Promise<Record<string, string>> {
  if (!vfsPromise) {
    vfsPromise = (async () => {
      const files: [string, URL][] = [
        ["inter-regular.ttf", new URL("../assets/pdf-fonts/inter-regular.ttf", import.meta.url)],
        ["inter-bold.ttf", new URL("../assets/pdf-fonts/inter-bold.ttf", import.meta.url)],
        ["bricolage-semibold.ttf", new URL("../assets/pdf-fonts/bricolage-semibold.ttf", import.meta.url)],
      ];
      const vfs: Record<string, string> = {};
      await Promise.all(files.map(async ([nameKey, url]) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`font fetch failed: ${nameKey} (${res.status})`);
        vfs[nameKey] = toBase64(await res.arrayBuffer());
      }));
      return vfs;
    })();
    // A failed fetch shouldn't poison every later click.
    vfsPromise.catch(() => { vfsPromise = null; });
  }
  return vfsPromise;
}

export async function downloadRecapPdf(
  b: RecapBriefing,
  ctx: RecapCtx | undefined,
  promises?: RecapPromise[] | null,
): Promise<void> {
  // @ts-expect-error pdfmake's browser build ships without type declarations
  const pdfMakeMod = await import("pdfmake/build/pdfmake");
  const pdfMake = pdfMakeMod.default ?? pdfMakeMod;
  const vfs = await loadFontVfs();
  pdfMake.addVirtualFileSystem(vfs);
  pdfMake.addFonts(PDF_FONTS);
  pdfMake
    .createPdf(buildRecapDocDefinition(b, ctx, promises))
    .download(recapPdfFilename(ctx?.name, b.completedAt));
}
