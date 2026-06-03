#!/usr/bin/env node
// One-shot generator: build M3 regression fixtures from May-24 batch artifacts.
// Run: node scripts/generate-m3-regression.js

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const RUN_OUTPUTS = path.join(ROOT, "logs/may/2026_May24_batch/run-outputs.json");
const BATCH_DIR = path.join(ROOT, "scenarios/batch");
const OUT_DIR = path.join(ROOT, "scenarios/regression");

const PICKS = [
  {
    id: "priya_biweekly_qspec",
    description: "Priya · Senior Backend Engineer · Bi-weekly — May-24 qspec regression (547a1f92-945)",
    run_id: "547a1f92-945",
    batchFile: "priya-biweekly-checkin.json",
    targetDimension: "question_specificity",
    mean: 0.726,
  },
  {
    id: "lin_biweekly_thread",
    description: "Lin · Head of Product · Bi-weekly — May-24 thread-follow regression (6ae9ead8-32f)",
    run_id: "6ae9ead8-32f",
    batchFile: "lin-biweekly-checkin.json",
    targetDimension: "plan_thread_follow",
    mean: 0.802,
  },
  {
    id: "ahmed_growth_delta",
    description: "Ahmed · Head of Product · Growth — May-24 delta-accuracy regression (835c2df0-e23)",
    run_id: "835c2df0-e23",
    batchFile: "ahmed-growth-career-plan.json",
    targetDimension: "plan_delta_accuracy",
    mean: 0.817,
  },
];

const FLOORS = {
  question_specificity: 0.4,
  plan_thread_follow: 0.55,
  plan_delta_accuracy: 0.65,
};

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function dimScore(scores, name) {
  const row = (scores || []).find((s) => s.dimension === name);
  return row ? row.score : null;
}

function simplifyFocus(fp) {
  return (fp || []).map((p) => ({
    id: p.id,
    label: p.label,
    reason: p.reason,
    source: p.source || "signal",
  }));
}

function batchToPrep(batch) {
  return {
    name: batch.name,
    role: batch.role,
    seniority: batch.seniority,
    meetingType: batch.meeting_type,
    notes: batch.manager_notes,
    answers: batch.answers || [],
  };
}

function buildPriya() {
  return {
    fixtures: [
      {
        label: "may24_bad_bank_shape",
        brief: {
          coreIssue:
            "Priya needs to discuss what specific challenges she faces after the launch and how those challenges might impact her performance going forward.",
          openingQuestion:
            "What specific post-launch challenges have you faced that might impact your transition to the next level?",
          listenFor: [
            "whether she acknowledges post-launch challenges",
            "if she has a plan to address performance issues",
            "whether she mentions mentoring interest",
          ],
          avoid: ["do not ignore the launch", "do not skip mentoring"],
          goodOutcome: "You and Priya have agreed on one specific skill to improve this quarter.",
          suggestedAction: "Schedule a follow-up meeting next month to review progress on the agreed skill.",
        },
        expectIssueSubstrings: ["accusatory", "challenges", "post-meeting follow-up", "goodOutcome may be too generic"],
      },
      {
        label: "may24_good_prep_snapshot",
        brief: {
          coreIssue:
            "Priya shipped a major backend feature and is quieter this week — check post-launch energy before next-quarter ownership and the mentoring thread.",
          openingQuestion: "What's it actually felt like this week, now that Monday's ship is behind you?",
          listenFor: [
            "whether she names depletion, relief, or something unresolved about the launch",
            "if she volunteers the mentoring thread or lights up when you raise it",
            "whether she names concrete expectations for next quarter's ownership",
          ],
          avoid: [
            "do not introduce the billing rewrite in this meeting",
            "do not let recognition become a quick checkbox",
          ],
          goodOutcome:
            "You and Priya agree on one concrete mentoring step for a Senior Backend Engineer — a named pairing, guild slot, or timeline — before the next bi-weekly.",
          suggestedAction:
            "During the 1:1, ask Priya to name one person she would mentor if bandwidth opened up, then agree whether you bring a specific opportunity next time.",
        },
        expectIssueSubstrings: [],
      },
    ],
    live: {
      openingQuestion: {
        mustNotMatch: ["what specific .+ have you", "impact your transition", "performance issues"],
        mustNotContain: ["challenges", "problems", "weakness", "impact your"],
        mustMatchAny: ["\\b(ship|launch|week|quieter|felt|mentor|quarter|monday)\\b"],
      },
      goodOutcome: {
        mustMatchAny: ["\\b(Priya|mentor|quarter|next step|concrete|ship|launch)\\b"],
      },
      suggestedAction: {
        mustNotMatch: ["follow-up meeting", "next month", "schedule a follow"],
        mustMatchAny: ["^(Before|During|Ask|Agree|Identify|Bring)", "\\b(bi-weekly|1:1|mentor)\\b"],
      },
    },
    arc: {
      expectStages: ["pulse", "friction", "momentum", "lift"],
      maxConsecutiveWellbeingClarifiers: 2,
      maxOffArcDrills: 1,
      closerStage: "lift",
    },
  };
}

function buildLin() {
  return {
    fixtures: [
      {
        label: "may24_bad_opener",
        brief: {
          coreIssue: "Lin has specific performance problems with late nights that need to be addressed directly.",
          openingQuestion: "What specific issues are causing you to work late every night this week?",
          listenFor: ["whether Lin acknowledges the late-night problem", "if Lin takes ownership of the workload"],
          avoid: ["do not praise the deliveries", "do not ignore the pattern"],
          goodOutcome: "Lin agrees to stop working late by next week.",
          suggestedAction: "Schedule a check-in next month to confirm Lin is leaving on time.",
        },
        expectIssueSubstrings: ["negative-evaluation", "post-meeting", "goodOutcome may be too generic"],
      },
    ],
    live: {
      openingQuestion: {
        mustNotMatch: ["what specific .+ issues", "every night"],
        mustNotContain: ["problems", "performance issues", "weakness"],
        mustMatchAny: ["\\b(pace|prioriti|shipped|features|late|load|team|deliberate)\\b"],
      },
      goodOutcome: {
        mustMatchAny: ["\\b(Lin|pace|weeks|load|team|distributed|2–3|two)\\b"],
      },
    },
    arc: {
      expectStages: ["pulse", "friction", "momentum", "lift"],
      maxConsecutiveWellbeingClarifiers: 2,
      maxOffArcDrills: 1,
      closerStage: "lift",
    },
  };
}

function buildAhmed() {
  return {
    fixtures: [
      {
        label: "may24_bad_opener",
        brief: {
          coreIssue: "Ahmed has specific leadership weaknesses that are blocking his growth to the next level.",
          openingQuestion: "What specific leadership challenges have you faced that might impact your promotion?",
          listenFor: ["whether Ahmed acknowledges leadership weaknesses", "if he has a development plan"],
          avoid: ["do not focus on tickets", "do not ignore imposter feelings"],
          goodOutcome: "Ahmed agrees to fix his leadership weaknesses this quarter.",
          suggestedAction: "Set a follow-up meeting next month to review his leadership development plan.",
        },
        expectIssueSubstrings: ["accusatory", "challenges", "post-meeting", "goodOutcome may be too generic"],
      },
    ],
    live: {
      openingQuestion: {
        mustNotMatch: ["what specific .+ (challenges|weaknesses)", "impact your promotion"],
        mustNotContain: ["weakness", "challenges", "problems", "promotion"],
        mustMatchAny: ["\\b(leverage|strategic|scope|influence|bet|week|highest)\\b"],
      },
      goodOutcome: {
        mustMatchAny: ["\\b(Ahmed|leverage|ownership|shift|four weeks|strategic)\\b"],
      },
    },
    arc: {
      expectStages: ["anchor", "aspiration", "gap", "investment", "commitment"],
      maxConsecutiveWellbeingClarifiers: 2,
      maxOffArcDrills: 1,
      closerStage: "commitment",
    },
  };
}

const BUILDERS = {
  priya_biweekly_qspec: buildPriya,
  lin_biweekly_thread: buildLin,
  ahmed_growth_delta: buildAhmed,
};

function main() {
  const runs = loadJson(RUN_OUTPUTS);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const pick of PICKS) {
    const run = runs.find((r) => r.run_id === pick.run_id);
    if (!run) throw new Error(`run not found: ${pick.run_id}`);
    const batch = loadJson(path.join(BATCH_DIR, pick.batchFile));
    const prep = batchToPrep(batch);
    const scores = run.scores || [];
    const baseline = {
      question_specificity: dimScore(scores, "question_specificity"),
      plan_thread_follow: dimScore(scores, "plan_thread_follow"),
      plan_delta_accuracy: dimScore(scores, "plan_delta_accuracy"),
      mean: pick.mean,
    };
    const extra = BUILDERS[pick.id]();
    const doc = {
      id: pick.id,
      description: pick.description,
      may24: {
        run_id: pick.run_id,
        targetDimension: pick.targetDimension,
        baseline,
        floors: FLOORS,
      },
      prep: {
        name: prep.name,
        role: prep.role,
        seniority: prep.seniority,
        meetingType: prep.meetingType,
        notes: prep.notes,
        focusPoints: simplifyFocus(run.stages?.focus_points?.focus_points),
        answers: prep.answers,
      },
      may24Bank: run.stages?.bank || [],
      ...extra,
    };
    const outPath = path.join(OUT_DIR, `${pick.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n");
    console.log(`wrote ${outPath}`);
  }
}

main();
