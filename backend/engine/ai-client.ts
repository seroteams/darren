import * as cost from "./cost.ts";
import { isReplaying, replayResponse, maybeRecord } from "./cassette.ts";
import { aiGuard } from "./ai-guard.ts";
import type { OpenAiUsage } from "../shared/cost.types.ts";

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 5;
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

// JSON-shaped value, for the schema objects we transform for Gemini.
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// Error carrying the optional HTTP status / Retry-After we attach to thrown
// errors so withRetry can decide whether to retry and how long to wait.
interface RetryableError extends Error {
  status?: number;
  retryAfter?: number;
}

// Arguments shared by callAI and the per-provider callers.
interface CallAIArgs {
  system: string;
  user: string;
  schema: JsonValue;
  schemaName: string;
  temperature: number;
  model: string;
  costLabel: string;
}

// OpenAI chat.completions response — only the fields we read.
interface OpenAIChatResponse {
  usage?: OpenAiUsage;
  choices?: Array<{ message?: { content?: string } }>;
}

// Gemini generateContent response — only the fields we read.
interface GeminiResponse {
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

function isGemini(model: unknown): boolean {
  return typeof model === "string" && model.startsWith("gemini-");
}

// Strip OpenAI-specific schema fields unsupported by Gemini's responseSchema,
// and convert union null types (["string","null"]) to Gemini's nullable flag.
function toGeminiSchema(schema: JsonValue): JsonValue {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;
  const out: { [key: string]: JsonValue } = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "additionalProperties") continue;
    if (k === "type" && Array.isArray(v)) {
      const nonNull = v.filter((t) => t !== "null");
      if (nonNull.length === 1) {
        const only = nonNull[0];
        if (only !== undefined) out.type = only;
      }
      if (v.includes("null")) out.nullable = true;
      continue;
    }
    if (k === "properties" && v && typeof v === "object") {
      const props: { [key: string]: JsonValue } = {};
      for (const [pk, pv] of Object.entries(v)) props[pk] = toGeminiSchema(pv);
      out[k] = props;
    } else if (k === "items" && v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = toGeminiSchema(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: RetryableError | undefined;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Respect the Retry-After the API told us; fall back to exponential backoff
      const delay = lastErr?.retryAfter ?? 1000 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      return await fn();
    } catch (err) {
      const e: RetryableError = err instanceof Error ? err : new Error(String(err));
      lastErr = e;
      const isAbort = e.name === "AbortError";
      // A status-less error means we never got an HTTP response — a network drop
      // (ECONNRESET, DNS failure, fetch TypeError). Those are transient: retry them.
      const isNetworkError = e.status == null;
      const isRetryable = isAbort || isNetworkError || RETRY_STATUSES.has(e.status ?? -1);
      if (!isRetryable) throw e;
      console.warn(`[ai-client] ${label} attempt ${attempt + 1} failed (${e.message}), retrying…`);
    }
  }
  throw lastErr;
}

const UNRESOLVED_PLACEHOLDER_RE = /\{\{[A-Z][A-Z0-9_]*\}\}/g;

function assertNoUnresolvedPlaceholders(text: unknown, where: string): void {
  if (typeof text !== "string") return;
  const hits = text.match(UNRESOLVED_PLACEHOLDER_RE);
  if (hits && hits.length) {
    const unique = [...new Set(hits)];
    throw new Error(`Unresolved prompt placeholders in ${where}: ${unique.join(", ")}`);
  }
}

async function callAI({
  system,
  user,
  schema,
  schemaName,
  temperature,
  model,
  costLabel,
}: CallAIArgs): Promise<string> {
  assertNoUnresolvedPlaceholders(system, `${costLabel} system prompt`);
  assertNoUnresolvedPlaceholders(user, `${costLabel} user prompt`);
  // Cassette replay (agent-native P1): serve the recorded response — no network,
  // no API key, $0. Sits AFTER the placeholder asserts so replay never hides a
  // prompt-fill bug. The call is still recorded in the cost log (honestly, at
  // zero tokens/$0) so downstream "cost tracked" checks see the real call count.
  if (isReplaying()) {
    const response = replayResponse(costLabel);
    cost.record(costLabel, `${model} (cassette)`, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
    return response;
  }
  // Live calls only: cap concurrency and trip a breaker on a failing provider.
  // Replay returned above, so tests/evals never touch the guard.
  const response = isGemini(model)
    ? await aiGuard.run(() => _callGemini({ system, user, schema, temperature, model, costLabel }))
    : await aiGuard.run(() => _callOpenAI({ system, user, schema, schemaName, temperature, model, costLabel }));
  // Cassette record: capture exactly the raw string we return.
  maybeRecord({ label: costLabel, model, system, user, response });
  return response;
}

async function _callOpenAI({
  system,
  user,
  schema,
  schemaName,
  temperature,
  model,
  costLabel,
}: CallAIArgs): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  return withRetry(async () => {
    const startedAt = Date.now();
    const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema },
        },
        temperature,
      }),
    });
    if (!res.ok) {
      const err: RetryableError = new Error(`OpenAI ${res.status}: ${await res.text()}`);
      err.status = res.status;
      const retryAfter = res.headers.get("retry-after");
      if (retryAfter) err.retryAfter = parseFloat(retryAfter) * 1000;
      throw err;
    }
    const data: OpenAIChatResponse = JSON.parse(await res.text());
    cost.record(costLabel, model, data.usage, Date.now() - startedAt);
    return data.choices?.[0]?.message?.content ?? "";
  }, `OpenAI/${costLabel}`);
}

async function _callGemini({
  system,
  user,
  schema,
  temperature,
  model,
  costLabel,
}: Omit<CallAIArgs, "schemaName">): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  return withRetry(async () => {
    const startedAt = Date.now();
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
            responseSchema: toGeminiSchema(schema),
          },
        }),
      },
    );
    if (!res.ok) {
      const err: RetryableError = new Error(`Gemini ${res.status}: ${await res.text()}`);
      err.status = res.status;
      throw err;
    }
    const data: GeminiResponse = JSON.parse(await res.text());
    // Normalise to OpenAI-style usage so cost.record works unchanged
    const usage: OpenAiUsage = {
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
    };
    cost.record(costLabel, model, usage, Date.now() - startedAt);
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }, `Gemini/${costLabel}`);
}

function findUnresolvedPlaceholderFields(
  value: unknown,
  path = "",
): Array<{ path: string; tokens: string[] }> {
  const hits: Array<{ path: string; tokens: string[] }> = [];
  if (typeof value === "string") {
    const m = value.match(UNRESOLVED_PLACEHOLDER_RE);
    if (m) hits.push({ path: path || "(root)", tokens: [...new Set(m)] });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findUnresolvedPlaceholderFields(v, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      hits.push(...findUnresolvedPlaceholderFields(v, path ? `${path}.${k}` : k));
    }
  }
  return hits;
}

function parseAIJson(raw: string, label: string, requiredKeys: string[] = []): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const preview = (raw || "").slice(0, 300);
    throw new Error(`${label} returned invalid JSON: ${preview}${(raw || "").length > 300 ? "…" : ""}`);
  }
  if (requiredKeys.length) {
    const obj: object = parsed && typeof parsed === "object" ? parsed : {};
    const missing = requiredKeys.filter((k) => !(k in obj));
    if (missing.length) {
      throw new Error(`${label} returned schema-invalid response — missing fields: ${missing.join(", ")}`);
    }
  }
  const leaks = findUnresolvedPlaceholderFields(parsed);
  if (leaks.length) {
    const summary = leaks.map((l) => `${l.path}=${l.tokens.join(",")}`).join("; ");
    throw new Error(`${label} response contains unresolved placeholders: ${summary}`);
  }
  return parsed;
}

export { callAI, isGemini, parseAIJson, assertNoUnresolvedPlaceholders };
