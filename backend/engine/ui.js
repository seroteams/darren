const TTY = process.stdout.isTTY && !process.env.NO_COLOR;
const sty = (codes) => (s) => (TTY ? `\x1b[${codes}m${s}\x1b[0m` : s);

const bold = sty("1");
const dim = sty("2");
const cyan = sty("36");
const cyanBold = sty("1;36");
const yellow = sty("33");
const yellowBold = sty("1;33");
const magentaBold = sty("1;35");
const gray = sty("90");
const red = sty("31");
const green = sty("32");
const greenBold = sty("1;32");

const HR = dim("─".repeat(60));

function pad(s, n) {
  return s + " ".repeat(Math.max(0, n - s.length));
}

function signedFmt(n) {
  if (n > 0) return `+${n}`;
  return `${n}`;
}

function arrowFor(score, lastDelta) {
  if (lastDelta > 0) return green("▲");
  if (lastDelta < 0) return red("▼");
  return dim("●");
}

function colorForScore(score) {
  if (score >= 3) return greenBold;
  if (score > 0) return green;
  if (score <= -3) return red;
  if (score < 0) return yellow;
  return dim;
}

function renderAxisLine(axes) {
  return axes
    .map((a) => {
      const arrow = arrowFor(a.score, a.lastDelta);
      const scoreStr = colorForScore(a.score)(signedFmt(a.score));
      return `${dim(a.label.toLowerCase())} ${arrow}${scoreStr}`;
    })
    .join("  ");
}

function renderQueuePos(i, total) {
  return yellow(`[Q ${i}/${total}]`);
}

function renderDebugLine(axes, questionAlias) {
  const moved = axes.filter((a) => a.lastDelta !== 0);
  if (!moved.length) return dim(`  (no axis moved) ← ${questionAlias}`);
  const parts = moved.map((a) => `${a.label.toLowerCase()} ${signedFmt(a.lastDelta)}`);
  return dim(`  ${questionAlias} → ${parts.join(", ")}`);
}

async function withThinking(subline, fn) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  let interval = null;
  const supported = TTY;
  const print = () => {
    process.stdout.write(
      `\r  ${dim(frames[i % frames.length])} ${dim("Thinking...")}  ${gray(subline)}   `
    );
    i++;
  };
  if (supported) {
    print();
    interval = setInterval(print, 90);
  } else {
    console.log(`  Thinking... ${subline}`);
  }
  try {
    const out = await fn();
    return out;
  } finally {
    if (interval) clearInterval(interval);
    if (supported) process.stdout.write("\r" + " ".repeat(80) + "\r");
  }
}

module.exports = {
  TTY,
  bold,
  dim,
  cyan,
  cyanBold,
  yellow,
  yellowBold,
  magentaBold,
  gray,
  red,
  green,
  greenBold,
  HR,
  pad,
  signedFmt,
  renderAxisLine,
  renderQueuePos,
  renderDebugLine,
  withThinking,
};
