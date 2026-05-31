const fs = require("node:fs");
const path = require("node:path");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function personaTerms(scenario) {
  const terms = new Set();
  const addWords = (text) => {
    for (const w of String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
      if (w.length >= 4) terms.add(w);
    }
  };
  if (scenario.name) terms.add(scenario.name.toLowerCase());
  addWords(scenario.role || scenario.roleTitle);
  addWords(scenario.manager_notes || scenario.observedShift);
  for (const kw of ["ux", "ui", "api", "lead", "backend", "engineer", "product"]) {
    const blob = `${scenario.role || scenario.roleTitle || ""} ${scenario.manager_notes || scenario.observedShift || ""}`.toLowerCase();
    if (blob.includes(kw)) terms.add(kw);
  }
  return [...terms];
}

function questionMentionsPersona(text, terms) {
  return terms.some((t) => String(text || "").toLowerCase().includes(t));
}

function scoreQuestionSpecificity(bankQuestions, scenario) {
  const qs = Array.isArray(bankQuestions) ? bankQuestions : [];
  if (!qs.length) return { score: 0, evidence: "0/0 bank questions" };
  const terms = personaTerms(scenario);
  const grounded = qs.filter((q) => questionMentionsPersona(q.name, terms)).length;
  return { score: grounded / qs.length, evidence: `${grounded}/${qs.length} mention persona` };
}

function isSkipOrShallow(answer) {
  const a = String(answer || "").trim();
  if (!a || a === "(skipped)") return true;
  return a.split(/\s+/).filter(Boolean).length <= 3;
}

function answerHasThread(answer) {
  const a = String(answer || "").trim();
  if (isSkipOrShallow(a)) return false;
  if (/^(fine|ok|yeah|yes|no|good|not much)\.?$/i.test(a)) return false;
  return a.split(/\s+/).length >= 5;
}

function followReferencesAnswer(answer, questionName) {
  const words = String(answer || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const q = String(questionName || "").toLowerCase();
  if (!words.length) return false;
  return words.filter((w) => q.includes(w)).length >= 1;
}

function scoreThreadFollow(transcript) {
  let threads = 0;
  let followed = 0;
  for (let i = 0; i < transcript.length - 1; i += 1) {
    const turn = transcript[i];
    const next = transcript[i + 1];
    if (!answerHasThread(turn.answer) || turn.skipped) continue;
    threads += 1;
    const nextQ = next?.question || {};
    if (nextQ.source === "planner_added" && followReferencesAnswer(turn.answer, nextQ.name)) {
      followed += 1;
    }
  }
  return { score: threads ? followed / threads : 1, evidence: `${followed}/${threads} threads followed` };
}

function scoreDeltaAccuracy(transcript) {
  let substantive = 0;
  let scored = 0;
  for (const turn of transcript) {
    if (turn.skipped || isSkipOrShallow(turn.answer)) continue;
    substantive += 1;
    const deltas = turn.realized_deltas || {};
    if (Object.values(deltas).some((v) => v !== 0)) scored += 1;
  }
  return { score: substantive ? scored / substantive : 1, evidence: `${scored}/${substantive} turns scored non-zero` };
}

function loadBankQuestions(sessionDir) {
  const bankPath = path.join(sessionDir, "03-question-bank/response.json");
  if (!fs.existsSync(bankPath)) return [];
  const data = loadJson(bankPath);
  if (Array.isArray(data.questions)) return data.questions;
  if (typeof data.raw === "string") {
    try {
      const parsed = JSON.parse(data.raw);
      return Array.isArray(parsed.questions) ? parsed.questions : [];
    } catch {
      return [];
    }
  }
  return [];
}

function scoreSessionDir(sessionDir, scenario) {
  const transcriptPath = path.join(sessionDir, "transcript.json");
  const transcript = fs.existsSync(transcriptPath) ? loadJson(transcriptPath) : [];
  const bankQuestions = loadBankQuestions(sessionDir);
  const qspec = scoreQuestionSpecificity(bankQuestions, scenario);
  const thread = scoreThreadFollow(transcript);
  const delta = scoreDeltaAccuracy(transcript);
  const mean = (qspec.score + thread.score + delta.score) / 3;
  return { dimensions: { question_specificity: qspec, plan_thread_follow: thread, plan_delta_accuracy: delta }, mean };
}

function aggregateRuns(runs) {
  const keys = ["question_specificity", "plan_thread_follow", "plan_delta_accuracy"];
  const out = {};
  for (const k of keys) {
    const scores = runs.map((r) => r.scores.dimensions[k].score);
    out[k] = {
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
      n: scores.length,
    };
  }
  out.overall_mean = runs.reduce((a, r) => a + r.scores.mean, 0) / runs.length;
  return out;
}

module.exports = {
  loadBankQuestions,
  scoreSessionDir,
  aggregateRuns,
};
