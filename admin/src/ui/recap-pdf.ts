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
};

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

export function buildRecapDocDefinition(b: RecapBriefing, ctx: { name?: string } | undefined) {
  const name = pdfSafe((ctx?.name || "").trim());
  const when = b.completedAt ? new Date(b.completedAt) : new Date();
  const dateLine = isNaN(when.getTime())
    ? ""
    : when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const content: unknown[] = [];

  // Header band: wordmark + date, ruled off in accent.
  content.push({
    columns: [
      { text: "Sero", fontSize: 15, bold: true, color: COLOR.accentDark },
      { text: dateLine, alignment: "right", fontSize: 9, color: COLOR.inkMute, margin: [0, 4, 0, 0] },
    ],
  });
  content.push({
    canvas: [{ type: "line", x1: 0, y1: 6, x2: 499, y2: 6, lineWidth: 1.25, lineColor: COLOR.accent }],
    margin: [0, 0, 0, 14],
  });

  content.push(eyebrow(name ? `1:1 recap · for ${name}` : "1:1 recap", { margin: [0, 4, 0, 8] }));
  content.push({ text: pdfSafe(b.headline || "Recap"), fontSize: 20, bold: true, color: COLOR.ink, lineHeight: 1.12 });

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
    defaultStyle: { fontSize: 10.5, color: COLOR.ink, lineHeight: 1.4 },
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

export async function downloadRecapPdf(b: RecapBriefing, ctx: { name?: string } | undefined): Promise<void> {
  // @ts-expect-error pdfmake's browser build ships without type declarations
  const pdfMakeMod = await import("pdfmake/build/pdfmake");
  // @ts-expect-error same — the vfs module is a plain font map
  const vfsMod = await import("pdfmake/build/vfs_fonts");
  const pdfMake = pdfMakeMod.default ?? pdfMakeMod;
  pdfMake.addVirtualFileSystem(vfsMod.default ?? vfsMod);
  pdfMake.createPdf(buildRecapDocDefinition(b, ctx)).download(recapPdfFilename(ctx?.name, b.completedAt));
}
