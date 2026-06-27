import fs from "node:fs";
import path from "node:path";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

interface DimensionScore {
  score: number;
  evidence: string;
}

function loadJson(p: string): unknown {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function personaTerms(scenario: Record<string, unknown>): string[] {
  const terms = new Set<string>();
  const addWords = (text: unknown) => {
    for (const w of asString(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
      if (w.length >= 4) terms.add(w);
    }
  };
  if (scenario.name) terms.add(asString(scenario.name).toLowerCase());
  addWords(scenario.role || scenario.roleTitle);
  addWords(scenario.manager_notes || scenario.observedShift);
  for (const kw of ["ux", "ui", "api", "lead", "backend", "engineer", "product"]) {
    const blob = `${asString(scenario.role || scenario.roleTitle)} ${asString(scenario.manager_notes || scenario.observedShift)}`.toLowerCase();
    if (blob.includes(kw)) terms.add(kw);
  }
  return [...terms];
}

function questionMentionsPersona(text: unknown, terms: string[]): boolean {
  return terms.some((t) => asString(text).toLowerCase().includes(t));
}

function scoreQuestionSpecificity(bankQuestions: unknown, scenario: Record<string, unknown>): DimensionScore {
  const qs = Array.isArray(bankQuestions) ? bankQuestions : [];
  if (!qs.length) return { score: 0, evidence: "0/0 bank questions" };
  const terms = personaTerms(scenario);
  const grounded = qs.filter((q) => questionMentionsPersona(asRecord(q).name, terms)).length;
  return { score: grounded / qs.length, evidence: `${grounded}/${qs.length} mention persona` };
}

function isSkipOrShallow(answer: unknown): boolean {
  const a = asString(answer).trim();
  if (!a || a === "(skipped)") return true;
  return a.split(/\s+/).filter(Boolean).length <= 3;
}

function answerHasThread(answer: unknown): boolean {
  const a = asString(answer).trim();
  if (isSkipOrShallow(a)) return false;
  if (/^(fine|ok|yeah|yes|no|good|not much)\.?$/i.test(a)) return false;
  return a.split(/\s+/).length >= 5;
}

function followReferencesAnswer(answer: unknown, questionName: unknown): boolean {
  const words = asString(answer)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const q = asString(questionName).toLowerCase();
  if (!words.length) return false;
  return words.filter((w) => q.includes(w)).length >= 1;
}

function scoreThreadFollow(transcript: unknown[]): DimensionScore {
  let threads = 0;
  let followed = 0;
  for (let i = 0; i < transcript.length - 1; i += 1) {
    const turn = asRecord(transcript[i]);
    const next = asRecord(transcript[i + 1]);
    if (!answerHasThread(turn.answer) || turn.skipped) continue;
    threads += 1;
    const nextQ = asRecord(next.question);
    if (nextQ.source === "planner_added" && followReferencesAnswer(turn.answer, nextQ.name)) {
      followed += 1;
    }
  }
  return { score: threads ? followed / threads : 1, evidence: `${followed}/${threads} threads followed` };
}

function scoreDeltaAccuracy(transcript: unknown[]): DimensionScore {
  let substantive = 0;
  let scored = 0;
  for (const t of transcript) {
    const turn = asRecord(t);
    if (turn.skipped || isSkipOrShallow(turn.answer)) continue;
    substantive += 1;
    const deltas = asRecord(turn.realized_deltas);
    if (Object.values(deltas).some((v) => v !== 0)) scored += 1;
  }
  return { score: substantive ? scored / substantive : 1, evidence: `${scored}/${substantive} turns scored non-zero` };
}

// --- Prep → question link diagnostics (Phase 2) -------------------------------

const BRIEF_STOP = new Set(
  ("the a an and or but to of in on for with at by from about is are was were be been do does did " +
    "you your our we they it this that what how when where which who why can could would should i me my " +
    "have has had not no yes get got make made feel feels like right now still just any one")
    .split(" ")
);

function contentWords(text: unknown): Set<string> {
  return new Set(
    asString(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !BRIEF_STOP.has(w))
  );
}

function shareWord(a: Set<string>, b: Set<string>): boolean {
  for (const w of a) if (b.has(w)) return true;
  return false;
}

function loadBrief(sessionDir: string): Record<string, unknown> | null {
  const p = path.join(sessionDir, "01b-preparation/response.json");
  if (!fs.existsSync(p)) return null;
  try {
    let b: unknown = loadJson(p);
    if (isObjectRecord(b) && typeof b.raw === "string") b = JSON.parse(b.raw);
    if (isObjectRecord(b) && b.brief) b = b.brief;
    return isObjectRecord(b) && (b.openingQuestion || b.coreIssue) ? b : null;
  } catch {
    return null;
  }
}

// A pre-written warm intro/opener (not a substantive question).
function isWarmIntro(q: Record<string, unknown>): boolean {
  return Boolean(q) && (q.source === "seed" || q.source === "semi_set");
}

// Did the first substantive question carry the prep opening question / core
// issue? 1 if yes, 0 if no. Neutral (1) when there's no brief.
function scoreOpenerLink(transcript: unknown[], brief: Record<string, unknown> | null): DimensionScore {
  if (!brief) return { score: 1, evidence: "(no brief)" };
  const briefWords = new Set([...contentWords(brief.openingQuestion), ...contentWords(brief.coreIssue)]);
  const firstSub = (transcript || []).map((t) => asRecord(t).question).find((q) => Boolean(q) && !isWarmIntro(asRecord(q)));
  if (!firstSub) return { score: 0, evidence: "no substantive question asked" };
  const fsRec = asRecord(firstSub);
  const linked = shareWord(contentWords(fsRec.name), briefWords);
  return {
    score: linked ? 1 : 0,
    evidence: linked
      ? `first substantive Q ("${asString(fsRec.label)}") links to brief`
      : `first substantive Q ("${asString(fsRec.label)}") not linked to brief`,
  };
}

// What fraction of substantive questions (excluding live thread-follows and warm
// intros) trace to the core issue or a listen-for signal? Neutral (1) with no brief.
function scoreOnBrief(transcript: unknown[], brief: Record<string, unknown> | null): DimensionScore {
  if (!brief) return { score: 1, evidence: "(no brief)" };
  const briefWords = new Set([
    ...contentWords(brief.coreIssue),
    ...(Array.isArray(brief.listenFor) ? brief.listenFor : []).flatMap((s) => [...contentWords(s)]),
  ]);
  const qs = (transcript || [])
    .map((t) => asRecord(t).question)
    .filter((q) => Boolean(q) && !isWarmIntro(asRecord(q)) && asRecord(q).label !== "Thread follow");
  if (!qs.length) return { score: 1, evidence: "0 substantive questions" };
  const onBrief = qs.filter((q) => shareWord(contentWords(asRecord(q).name), briefWords)).length;
  return { score: onBrief / qs.length, evidence: `${onBrief}/${qs.length} on-brief` };
}

function loadBankQuestions(sessionDir: string): unknown[] {
  const bankPath = path.join(sessionDir, "03-question-bank/response.json");
  if (!fs.existsSync(bankPath)) return [];
  const data = asRecord(loadJson(bankPath));
  if (Array.isArray(data.questions)) return data.questions;
  if (typeof data.raw === "string") {
    try {
      const parsed = asRecord(JSON.parse(data.raw));
      return Array.isArray(parsed.questions) ? parsed.questions : [];
    } catch {
      return [];
    }
  }
  return [];
}

function scoreSessionDir(sessionDir: string, scenario: Record<string, unknown>) {
  const transcriptPath = path.join(sessionDir, "transcript.json");
  const loadedTranscript = fs.existsSync(transcriptPath) ? loadJson(transcriptPath) : [];
  const transcript = Array.isArray(loadedTranscript) ? loadedTranscript : [];
  const bankQuestions = loadBankQuestions(sessionDir);
  const qspec = scoreQuestionSpecificity(bankQuestions, scenario);
  const thread = scoreThreadFollow(transcript);
  const delta = scoreDeltaAccuracy(transcript);
  const brief = loadBrief(sessionDir);
  const openerLink = scoreOpenerLink(transcript, brief);
  const onBrief = scoreOnBrief(transcript, brief);
  // opener_link / on_brief are diagnostics only — kept OUT of `mean` so the
  // existing baseline for the three core dimensions is unchanged.
  const mean = (qspec.score + thread.score + delta.score) / 3;
  return {
    dimensions: {
      question_specificity: qspec,
      plan_thread_follow: thread,
      plan_delta_accuracy: delta,
      opener_link: openerLink,
      on_brief: onBrief,
    },
    mean,
  };
}

interface RunWithScores {
  scores: ReturnType<typeof scoreSessionDir>;
}

function aggregateRuns(runs: RunWithScores[]) {
  const keys: Array<keyof ReturnType<typeof scoreSessionDir>["dimensions"]> = [
    "question_specificity",
    "plan_thread_follow",
    "plan_delta_accuracy",
  ];
  const perDimension: Record<string, { mean: number; min: number; max: number; n: number }> = {};
  for (const k of keys) {
    const scores = runs.map((r) => r.scores.dimensions[k].score);
    perDimension[k] = {
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
      n: scores.length,
    };
  }
  return {
    ...perDimension,
    overall_mean: runs.reduce((a, r) => a + r.scores.mean, 0) / runs.length,
  };
}

export { loadBankQuestions, scoreSessionDir, aggregateRuns };
