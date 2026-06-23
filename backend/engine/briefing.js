const {
  bold,
  dim,
  gray,
  green,
  red,
  yellow,
  yellowBold,
  magentaBold,
  cyan,
  pad,
} = require("./ui");

// Renders the final-evaluation JSON to stdout in the same style as cli.js.
function renderBriefing(evalJson, employeeName) {
  const ev = evalJson || {};

  console.log("  " + magentaBold("BRIEFING"));
  console.log("  " + dim("─".repeat(8)));
  console.log();

  if (ev.headline) {
    console.log("  " + yellowBold(ev.headline));
    console.log();
  }

  if (Array.isArray(ev.summary_bullets) && ev.summary_bullets.length) {
    console.log("  " + bold("Headlines"));
    for (const b of ev.summary_bullets) console.log(`    ${yellow("•")} ${b}`);
    console.log();
  }

  if (ev.understanding_paragraph) {
    console.log("  " + bold("What we understood"));
    console.log(`    ${gray(ev.understanding_paragraph)}`);
    console.log();
  }

  if (Array.isArray(ev.axes) && ev.axes.length) {
    console.log("  " + bold("Axes"));
    for (const a of ev.axes) {
      // An unread axis shows "not read", never a seed number — a score of -1
      // that nothing moved is no-data, not a faint negative read.
      const scoreStr =
        a.read_status === "not_read"
          ? dim("not read")
          : a.score > 0
            ? green(`+${a.score}`)
            : a.score < 0
              ? red(`${a.score}`)
              : dim(`${a.score}`);
      console.log(`    ${pad(a.id, 12)} ${scoreStr}  ${dim("—")} ${a.meaning}`);
    }
    console.log();
  }

  if (ev.brutal_truth_employee) {
    console.log("  " + bold("Brutal truth — about " + (employeeName || "them")));
    console.log(`    ${ev.brutal_truth_employee}`);
    console.log();
  }
  if (ev.brutal_truth_manager) {
    console.log("  " + bold("Brutal truth — about you"));
    console.log(`    ${ev.brutal_truth_manager}`);
    console.log();
  }

  if (Array.isArray(ev.next_actions) && ev.next_actions.length) {
    console.log("  " + bold("Next actions"));
    // group by `when`
    const order = ["today", "this week", "this month", "next 1:1"];
    const groups = {};
    for (const a of ev.next_actions) {
      const k = a.when || "unscheduled";
      (groups[k] = groups[k] || []).push(a);
    }
    for (const when of order.concat(Object.keys(groups).filter((k) => !order.includes(k)))) {
      if (!groups[when]) continue;
      for (const a of groups[when]) {
        console.log(`    ${cyan(pad(when, 10))}  ${a.action}`);
      }
    }
    console.log();
  }

  if (Array.isArray(ev.watch_for) && ev.watch_for.length) {
    console.log("  " + bold("Watch for"));
    for (const w of ev.watch_for) console.log(`    ${yellow("▸")} ${w}`);
    console.log();
  }
}

module.exports = { renderBriefing };
