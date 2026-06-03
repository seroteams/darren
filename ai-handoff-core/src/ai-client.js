const cost = require("./cost");

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 5;
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

function isGemini(model) {
  return typeof model === "string" && model.startsWith("gemini-");
}

// Strip OpenAI-specific schema fields unsupported by Gemini's responseSchema,
// and convert union null types (["string","null"]) to Gemini's nullable flag.
function toGeminiSchema(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;
  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "additionalProperties") continue;
    if (k === "type" && Array.isArray(v)) {
      const nonNull = v.filter((t) => t !== "null");
      if (nonNull.length === 1) out.type = nonNull[0];
      if (v.includes("null")) out.nullable = true;
      continue;
    }
    if (k === "properties" && v && typeof v === "object") {
      out[k] = {};
      for (const [pk, pv] of Object.entries(v)) out[k][pk] = toGeminiSchema(pv);
    } else if (k === "items" && v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = toGeminiSchema(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Respect the Retry-After the API told us; fall back to exponential backoff
      const delay = lastErr?.retryAfter ?? 1000 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isAbort = err.name === "AbortError";
      const isRetryable = isAbort || RETRY_STATUSES.has(err.status);
      if (!isRetryable) throw err;
      console.warn(`[ai-client] ${label} attempt ${attempt + 1} failed (${err.message}), retrying…`);
    }
  }
  throw lastErr;
}

const UNRESOLVED_PLACEHOLDER_RE = /\{\{[A-Z][A-Z0-9_]*\}\}/g;

function assertNoUnresolvedPlaceholders(text, where) {
  if (typeof text !== "string") return;
  const hits = text.match(UNRESOLVED_PLACEHOLDER_RE);
  if (hits && hits.length) {
    const unique = [...new Set(hits)];
    throw new Error(`Unresolved prompt placeholders in ${where}: ${unique.join(", ")}`);
  }
}

async function callAI({ system, user, schema, schemaName, temperature, model, costLabel }) {
  assertNoUnresolvedPlaceholders(system, `${costLabel} system prompt`);
  assertNoUnresolvedPlaceholders(user, `${costLabel} user prompt`);
  if (isGemini(model)) {
    return _callGemini({ system, user, schema, temperature, model, costLabel });
  }
  return _callOpenAI({ system, user, schema, schemaName, temperature, model, costLabel });
}

async function _callOpenAI({ system, user, schema, schemaName, temperature, model, costLabel }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  return withRetry(async () => {
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
      const err = new Error(`OpenAI ${res.status}: ${await res.text()}`);
      err.status = res.status;
      const retryAfter = res.headers.get("retry-after");
      if (retryAfter) err.retryAfter = parseFloat(retryAfter) * 1000;
      throw err;
    }
    const data = await res.json();
    cost.record(costLabel, model, data.usage);
    return data.choices?.[0]?.message?.content ?? "";
  }, `OpenAI/${costLabel}`);
}

async function _callGemini({ system, user, schema, temperature, model, costLabel }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  return withRetry(async () => {
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
      }
    );
    if (!res.ok) {
      const err = new Error(`Gemini ${res.status}: ${await res.text()}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    // Normalise to OpenAI-style usage so cost.record works unchanged
    const usage = {
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
    };
    cost.record(costLabel, model, usage);
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }, `Gemini/${costLabel}`);
}

function findUnresolvedPlaceholderFields(value, path = "") {
  const hits = [];
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

function parseAIJson(raw, label, requiredKeys = []) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const preview = (raw || "").slice(0, 300);
    throw new Error(`${label} returned invalid JSON: ${preview}${(raw || "").length > 300 ? "…" : ""}`);
  }
  if (requiredKeys.length) {
    const missing = requiredKeys.filter((k) => !(k in (parsed || {})));
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

module.exports = { callAI, isGemini, parseAIJson, assertNoUnresolvedPlaceholders };
