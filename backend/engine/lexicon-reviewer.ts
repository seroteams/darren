// Lexicon session review — barrel re-export. Core AI + I/O live under ./lexicon/.

import { reviewSession, parseInput, partition } from "./lexicon/cli-interactive.ts";
import {
  shouldReview,
  generateSuggestions,
  commitDecisions,
  suggestionId,
  extractBankQuestions,
  buildPrompt,
  normalizeTranscriptForReview,
  normalizeEvaluation,
} from "./lexicon/review-core.ts";
import {
  appendCandidates,
  ensureCandidateDoc,
  writeTrace,
  readTrace,
  tracePathFor,
} from "./lexicon/candidates-io.ts";

export {
  reviewSession,
  shouldReview,
  generateSuggestions,
  commitDecisions,
  suggestionId,
  readTrace,
  tracePathFor,
  buildPrompt,
  normalizeTranscriptForReview,
  normalizeEvaluation,
  extractBankQuestions,
};

export const _internals = {
  parseInput,
  partition,
  appendCandidates,
  writeTrace,
  ensureCandidateDoc,
  extractBankQuestions,
};
