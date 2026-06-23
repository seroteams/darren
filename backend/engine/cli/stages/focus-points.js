const { generateFocusPoints } = require("../../generate");
const { bold, dim, cyan, magentaBold, yellow, gray, red, HR, pad, withThinking } = require("../../ui");

function renderFocusPoints(result, name, role, seniority, { regenerated = false } = {}) {
  console.log();
  console.log("  " + dim(pad("Meeting", 8)) + "  " + bold(result.meeting_type));
  console.log(
    "  " +
      dim(pad("With", 8)) +
      "  " +
      bold(name) +
      dim(" · ") +
      role +
      dim(" · ") +
      seniority
  );
  console.log();
  console.log("  " + magentaBold("FOCUS POINTS" + (regenerated ? "  " + dim("(regenerated)") : "")));
  console.log("  " + dim("─".repeat(12)));
  console.log();

  result.focus_points.forEach((fp, i) => {
    const warn = fp.known === false ? "  " + red("[!] not in catalogue") : "";
    const type = fp.type || fp.id || "—";
    console.log(`  ${yellow(`${i + 1}.`)} ${magentaBold(type)}${warn}`);
    if (fp.label && fp.label !== type) console.log(`     ${bold(fp.label)}`);
    if (fp.reason) console.log(`     ${gray(fp.reason)}`);
    console.log();
  });

  console.log(HR);
  console.log();
}

async function runFocusPointsStage({ ctx, session, ask, result }) {
  console.log();
  console.log(HR);

  const generated = await withThinking("Choosing focus points", () => generateFocusPoints(ctx, { session }));

  console.log(HR);
  Object.assign(result, generated);
  renderFocusPoints(result, ctx.name, ctx.role, ctx.seniority);

  while (true) {
    const go = await ask(cyan("  Start the 1:1 questioning stage? ") + dim("[Y/n/r to regenerate] "));
    if (/^n/i.test(go)) {
      return { continue: false };
    }
    if (/^r/i.test(go)) {
      console.log();
      console.log(HR);
      const regen = await withThinking("Regenerating focus points", () => generateFocusPoints(ctx, { session }));
      Object.assign(result, regen);
      console.log(HR);
      renderFocusPoints(result, ctx.name, ctx.role, ctx.seniority, { regenerated: true });
      continue;
    }
    break;
  }

  return { continue: true };
}

module.exports = { runFocusPointsStage, renderFocusPoints };
