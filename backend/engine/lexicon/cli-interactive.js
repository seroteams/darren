const path = require("node:path");

const { canonicalPath, candidatePath } = require("../lexicon");
const { bold, cyan, dim, gray, green, yellow, HR } = require("../ui");
const { appendCandidates, writeTrace } = require("./candidates-io");
const { generateSuggestions } = require("./review-core");
const { ROOT } = require("../paths");

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function describeSuggestion(s) {
  if (s.type === "prefer_term") return `Add preferred term: "${s.value}"`;
  if (s.type === "prefer_phrase") return `Add preferred phrase: "${s.value}"`;
  if (s.type === "avoid_phrase") {
    const better = s.better_as ? ` (better: "${s.better_as}")` : "";
    return `Avoid phrase: "${s.value}"${better}`;
  }
  return `${s.type}: "${s.value}"`;
}

function renderSuggestions(suggestions, scopeLabel) {
  console.log();
  console.log("  " + bold(`Sero found ${suggestions.length} possible wording updates for ${scopeLabel}:`));
  console.log();
  suggestions.forEach((s, i) => {
    console.log(`  ${yellow(`[${i + 1}]`)} ${describeSuggestion(s)}`);
    if (s.reason) console.log(`       ${gray(s.reason)}`);
    if (s.evidence) console.log(`       ${dim("evidence: " + s.evidence)}`);
  });
  console.log();
}

function parseInput(raw) {
  const s = (raw || "").trim().toLowerCase();
  if (s === "q") return { action: "skip" };
  if (s === "n") return { action: "none" };
  if (s === "") return { action: "approve_all" };
  const nums = s
    .split(/[\s,]+/)
    .map((x) => parseInt(x, 10))
    .filter((x) => Number.isInteger(x) && x > 0);
  if (nums.length) return { action: "approve_except", remove: new Set(nums) };
  return { action: "approve_all" };
}

function partition(suggestions, parsed) {
  if (parsed.action === "skip" || parsed.action === "none") {
    return { accepted: [], rejected: suggestions.slice() };
  }
  if (parsed.action === "approve_all") {
    return { accepted: suggestions.slice(), rejected: [] };
  }
  const accepted = [];
  const rejected = [];
  suggestions.forEach((s, i) => {
    if (parsed.remove.has(i + 1)) rejected.push(s);
    else accepted.push(s);
  });
  return { accepted, rejected };
}

async function reviewSession({ session, ctx, ask }) {
  const gen = await generateSuggestions({ session, ctx, force: true });
  if (gen.skipped) {
    if (gen.reason === "reviewer-failed") {
      console.log("  " + dim(`reviewer failed: ${gen.error}`));
    }
    return gen;
  }

  const { scope, suggestions, tracePath } = gen;

  console.log();
  console.log(HR);
  console.log("  " + bold("Lexicon review") + dim(` — ${scope.roleFamily} / ${scope.seniority} / ${scope.meetingType}`));

  if (!suggestions.length) {
    console.log("  " + dim("No useful wording updates suggested."));
    console.log();
    return { skipped: false, accepted: [], rejected: [] };
  }

  const scopeLabel = `${capitalize(scope.roleFamily)} ${capitalize(scope.seniority)} + ${capitalize(scope.meetingType)}`;
  renderSuggestions(suggestions, scopeLabel);

  console.log("  " + dim("Enter = approve all as candidates · numbers (e.g. 2 5) = remove those · n = none · q = skip"));
  const raw = await ask(cyan("  Approve as candidates except: "));
  const parsed = parseInput(raw);
  const { accepted, rejected } = partition(suggestions, parsed);

  writeTrace({
    sessionId: session.id,
    scope,
    allSuggestions: suggestions,
    accepted,
    rejected,
    userInput: raw || "",
  });

  let wrote = false;
  if (parsed.action !== "skip" && accepted.length) {
    wrote = appendCandidates(candidatePath(scope.roleFamily, scope.seniority), scope, accepted);
  }

  console.log();
  if (parsed.action === "skip") {
    console.log("  " + dim("Skipped. Trace saved for review."));
  } else if (accepted.length && wrote) {
    console.log("  " + green(`Saved ${accepted.length} to candidates`) + dim(` → ${path.relative(ROOT, candidatePath(scope.roleFamily, scope.seniority))}`));
    console.log("  " + dim(`Canonical (live) lexicon unchanged: ${path.relative(ROOT, canonicalPath(scope.roleFamily, scope.seniority))}`));
  } else if (accepted.length && !wrote) {
    console.log("  " + dim("All accepted suggestions were already in the candidate file — nothing new written."));
  } else {
    console.log("  " + dim("Saved none."));
  }
  console.log("  " + dim(`Trace: ${path.relative(ROOT, tracePath)}`));
  console.log();

  return { skipped: false, accepted, rejected, tracePath };
}

module.exports = {
  reviewSession,
  renderSuggestions,
  parseInput,
  partition,
  describeSuggestion,
};
