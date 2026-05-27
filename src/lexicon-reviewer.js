// Lexicon session review — barrel re-export. Core AI + I/O live under ./lexicon/.

const { reviewSession } = require("./lexicon/cli-interactive");
const {
  shouldReview,
  generateSuggestions,
  commitDecisions,
  suggestionId,
  extractBankQuestions,
} = require("./lexicon/review-core");
const {
  appendCandidates,
  ensureCandidateDoc,
  writeTrace,
  readTrace,
  tracePathFor,
} = require("./lexicon/candidates-io");
const { parseInput, partition } = require("./lexicon/cli-interactive");

module.exports = {
  reviewSession,
  shouldReview,
  generateSuggestions,
  commitDecisions,
  suggestionId,
  readTrace,
  tracePathFor,
  _internals: {
    parseInput,
    partition,
    appendCandidates,
    writeTrace,
    ensureCandidateDoc,
    extractBankQuestions,
  },
};
