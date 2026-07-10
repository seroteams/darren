import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./paths.mts";
import type { OpenAiUsage, CostCall, CostSummary, CostTracker } from "../shared/cost.types.ts";

const PRICING_PATH = path.join(DATA_DIR, "openai-models.json");

interface ModelPrice {
  input_per_1m_usd: number;
  output_per_1m_usd: number;
  cached_input_per_1m_usd?: number | null;
}
interface Pricing {
  models: Record<string, ModelPrice>;
}

let _pricing: Pricing | null = null;

function loadPricing(): Pricing {
  if (_pricing) return _pricing;
  const parsed = JSON.parse(fs.readFileSync(PRICING_PATH, "utf8"));
  _pricing = parsed;
  return parsed;
}

function priceOf(model: string): ModelPrice | null {
  const data = loadPricing();
  const entry = data.models[model];
  if (entry) return entry;
  // Loose match: "gpt-4o-mini-2024-07-18" → "gpt-4o-mini"
  const longest = Object.keys(data.models)
    .filter((id) => model.startsWith(id))
    .sort((a, b) => b.length - a.length)[0];
  return longest ? data.models[longest] ?? null : null;
}

// Convert an OpenAI chat.completions usage block to a cost in USD. The block
// looks like:
//   { prompt_tokens, completion_tokens, total_tokens,
//     prompt_tokens_details: { cached_tokens } }
// Cached tokens (when present) are billed at the cached rate; the remaining
// prompt tokens at the standard input rate; completion at the output rate.
function costOf(
  model: string,
  usage: OpenAiUsage | undefined
): { usd: number | null; known: boolean; reason?: string } {
  const p = priceOf(model);
  if (!p) return { usd: null, known: false, reason: `no pricing for ${model}` };
  const prompt = Number(usage?.prompt_tokens || 0);
  const completion = Number(usage?.completion_tokens || 0);
  const cached = Number(usage?.prompt_tokens_details?.cached_tokens || 0);
  const uncachedPrompt = Math.max(0, prompt - cached);
  const cachedRate = p.cached_input_per_1m_usd == null ? p.input_per_1m_usd : p.cached_input_per_1m_usd;
  const usd =
    (uncachedPrompt * p.input_per_1m_usd +
      cached * cachedRate +
      completion * p.output_per_1m_usd) /
    1_000_000;
  return { usd, known: true };
}

function createTracker(): CostTracker {
  const calls: CostCall[] = [];
  const record = (stage: string, model: string, usage: OpenAiUsage | undefined, ms = 0): void => {
    const { usd, known, reason } = costOf(model, usage);
    calls.push({
      stage,
      model,
      prompt_tokens: Number(usage?.prompt_tokens || 0),
      completion_tokens: Number(usage?.completion_tokens || 0),
      cached_tokens: Number(usage?.prompt_tokens_details?.cached_tokens || 0),
      total_tokens: Number(usage?.total_tokens || 0),
      usd_cost: usd,
      known_price: known,
      price_note: reason,
      at: new Date().toISOString(),
      ms: Number(ms) || 0,
    });
  };
  const summary = (): CostSummary => {
    let usd = 0;
    let unknownCalls = 0;
    let prompt = 0;
    let completion = 0;
    let cached = 0;
    let ms = 0;
    for (const c of calls) {
      if (c.known_price && c.usd_cost != null) usd += c.usd_cost;
      else unknownCalls += 1;
      prompt += c.prompt_tokens;
      completion += c.completion_tokens;
      cached += c.cached_tokens;
      ms += c.ms;
    }
    return {
      call_count: calls.length,
      usd_total: usd,
      unknown_price_calls: unknownCalls,
      prompt_tokens: prompt,
      completion_tokens: completion,
      cached_tokens: cached,
      total_tokens: prompt + completion,
      total_ms: ms,
      calls,
    };
  };
  return { record, summary };
}

// Single process-scoped active tracker. Modules that make API calls import
// and call record() without having to thread the tracker through every layer.
let _active: CostTracker | null = null;
const setActive = (t: CostTracker | null): void => {
  _active = t;
};
const getActive = (): CostTracker | null => _active;
const record = (stage: string, model: string, usage: OpenAiUsage | undefined, ms = 0): void => {
  if (_active) _active.record(stage, model, usage, ms);
};

function formatUsd(usd: number | null | undefined): string {
  if (usd == null || Number.isNaN(usd)) return "—";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export {
  loadPricing,
  priceOf,
  costOf,
  createTracker,
  setActive,
  getActive,
  record,
  formatUsd,
  formatTokens,
};
