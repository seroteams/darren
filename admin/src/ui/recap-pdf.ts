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

function eyebrow(text: string, opts: Record<string, unknown> = {}) {
  return {
    text: text.toUpperCase(),
    fontSize: 8.5,
    bold: true,
    color: COLOR.accentDark,
    characterSpacing: 1.2,
    margin: [0, 18, 0, 6],
    ...opts,
  };
}

// Centre-zero score bar, mirroring the on-screen axis meter: grey track,
// mint fill rightwards for positive, coral leftwards for negative.
function axisBar(score: number) {
  const W = 150;
  const H = 5;
  const half = W / 2;
  const ratio = Math.min(Math.abs(score), VISUAL_MAX) / VISUAL_MAX;
  const fill = half * ratio;
  const shapes: Record<string, unknown>[] = [
    { type: "rect", x: 0, y: 0, w: W, h: H, r: 2.5, color: COLOR.border },
  ];
  if (score > 0) shapes.push({ type: "rect", x: half, y: 0, w: fill, h: H, r: 2.5, color: COLOR.positive });
  if (score < 0) shapes.push({ type: "rect", x: half - fill, y: 0, w: fill, h: H, r: 2.5, color: COLOR.negative });
  shapes.push({ type: "rect", x: half - 0.75, y: -1, w: 1.5, h: H + 2, color: "#cccccc" });
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

export function buildRecapDocDefinition(b: RecapBriefing, ctx: RecapCtx | undefined) {
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
      { text: "Sero", fontSize: 15, bold: true, color: COLOR.accentDark, margin: [7, 1, 0, 0] },
      { text: dateLine, alignment: "right", fontSize: 9, color: COLOR.inkMute, margin: [0, 5, 0, 0] },
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
      ctxLines.push({ text: "Who this was for".toUpperCase(), fontSize: 8, bold: true, color: COLOR.accentDark, characterSpacing: 1, margin: [0, 0, 0, 3] });
      ctxLines.push({
        text: [
          { text: name || "—", bold: true },
          ...(role ? [{ text: `  ·  ${role}`, color: COLOR.inkDim }] : []),
        ],
      });
      if (meetingType) ctxLines.push({ text: `Meeting: ${meetingType}`, fontSize: 9.5, color: COLOR.inkDim, margin: [0, 2, 0, 0] });
    }
    if (notes) {
      ctxLines.push({ text: "What Sero was told going in".toUpperCase(), fontSize: 8, bold: true, color: COLOR.accentDark, characterSpacing: 1, margin: [0, name || role ? 8 : 0, 0, 3] });
      ctxLines.push({ text: `“${notes}”`, color: COLOR.inkDim });
    }
    content.push(tintedBox(ctxLines, COLOR.accentBg, COLOR.accentLine));
  }

  content.push(eyebrow("1:1 recap", { margin: [0, 8, 0, 8] }));
  content.push({ text: pdfSafe(b.headline || "Recap"), font: "Bricolage", fontSize: 20, color: COLOR.ink, lineHeight: 1.12 });

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
          { text: cap(a.id), width: 78, bold: true, fontSize: 10 },
          axisBar(a.score),
          {
            text: String(a.score),
            width: 26,
            alignment: "right",
            bold: true,
            fontSize: 10,
            color: a.score > 0 ? COLOR.positive : a.score < 0 ? COLOR.negative : COLOR.inkDim,
          },
        ],
        columnGap: 10,
        margin: [0, 2, 0, 1],
      });
      if (a.meaning) {
        content.push({ text: pdfSafe(a.meaning), color: COLOR.inkDim, fontSize: 9.5, margin: [0, 0, 0, 6] });
      }
    }
    if (unreadAxes.length) {
      const names = unreadAxes.map((a) => cap(a.id));
      const list = names.length > 1
        ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
        : names[0];
      content.push({
        text: `${list} — not enough signal to read this session.`,
        color: COLOR.inkMute,
        fontSize: 9.5,
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
        { text: (name ? `Honest read — ${name}` : "Honest read — them") + "   ·   OK to share", fontSize: 8.5, bold: true, color: COLOR.mintText, characterSpacing: 0.5, margin: [0, 0, 0, 4] },
        { text: empTruth },
      ], COLOR.mintBg, COLOR.mintLine));
    }
    if (mgrTruth) {
      content.push(tintedBox([
        { text: "Honest read — you   ·   Private, just for you", fontSize: 8.5, bold: true, color: COLOR.goldText, characterSpacing: 0.5, margin: [0, 0, 0, 4] },
        { text: mgrTruth },
      ], COLOR.goldBg, COLOR.goldLine));
    }
  }

  const er = b.engagement_read;
  if (er && er.read_status === "read" && er.recommended_action) {
    content.push(eyebrow("How engaged they seem"));
    content.push({ text: [{ text: "Your move  ", bold: true, color: COLOR.accentDark, fontSize: 9.5 }, { text: pdfSafe(er.recommended_action) }] });
  }

  const actions = (b.next_actions || []).filter((a) => String(a.action || "").trim());
  if (actions.length) {
    content.push(eyebrow("What to do next"));
    [...actions]
      .sort((x, y) => whenRank(x.when) - whenRank(y.when))
      .forEach((a) => {
        content.push({
          columns: [
            { text: capWhen(a.when), width: 66, fontSize: 9, bold: true, color: COLOR.accentDark, margin: [0, 1, 0, 0] },
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
    defaultStyle: { font: "Inter", fontSize: 10.5, color: COLOR.ink, lineHeight: 1.4 },
    info: { title: name ? `Sero 1:1 recap — ${name}` : "Sero 1:1 recap", creator: "Sero" },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "Made with Sero · seroapp.com", fontSize: 8.5, color: COLOR.inkMute },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", fontSize: 8.5, color: COLOR.inkMute },
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

export async function downloadRecapPdf(b: RecapBriefing, ctx: RecapCtx | undefined): Promise<void> {
  // @ts-expect-error pdfmake's browser build ships without type declarations
  const pdfMakeMod = await import("pdfmake/build/pdfmake");
  const pdfMake = pdfMakeMod.default ?? pdfMakeMod;
  const vfs = await loadFontVfs();
  pdfMake.addVirtualFileSystem(vfs);
  pdfMake.addFonts(PDF_FONTS);
  pdfMake
    .createPdf(buildRecapDocDefinition(b, ctx))
    .download(recapPdfFilename(ctx?.name, b.completedAt));
}
