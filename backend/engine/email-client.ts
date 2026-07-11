// The email send helper. One place that talks to the email provider (Resend), so
// every notification goes out the same way. Deliberately lean: it mirrors the
// fetch + timeout + retry shape of ai-client.ts but shares no code with it — email
// is plumbing, not an AI call, and must not pull in cost tracking / cassettes.
//
// Two ways to send:
//   sendEmail        — awaits the send, THROWS on failure (for tests / callers that care).
//   sendEmailQuietly — fire-and-forget: catches every error, logs it, never throws.
//                      Use this from request handlers so a failed email can NEVER
//                      break the thing the user actually asked for (e.g. signup).

const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string; // optional plain-text fallback
}

// Error carrying the optional HTTP status / Retry-After, so withRetry can decide
// whether to retry and how long to wait.
interface RetryableError extends Error {
  status?: number;
  retryAfter?: number;
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
      // Respect the Retry-After the API told us; fall back to exponential backoff.
      const delay = lastErr?.retryAfter ?? 1000 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      return await fn();
    } catch (err) {
      const e: RetryableError = err instanceof Error ? err : new Error(String(err));
      lastErr = e;
      const isAbort = e.name === "AbortError";
      // A status-less error means we never got an HTTP response — a network drop.
      // Those are transient: retry them.
      const isNetworkError = e.status == null;
      const isRetryable = isAbort || isNetworkError || RETRY_STATUSES.has(e.status ?? -1);
      if (!isRetryable) throw e;
      console.warn(`[email-client] ${label} attempt ${attempt + 1} failed (${e.message}), retrying…`);
    }
  }
  throw lastErr;
}

/** Send an email through Resend. Throws on failure. */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) throw new Error("EMAIL_API_KEY not set");
  const from = process.env.EMAIL_FROM || "Sero <onboarding@resend.dev>";

  await withRetry(async () => {
    const res = await fetchWithTimeout(RESEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
      }),
    });
    if (!res.ok) {
      const err: RetryableError = new Error(`Resend ${res.status}: ${await res.text()}`);
      err.status = res.status;
      const retryAfter = res.headers.get("retry-after");
      if (retryAfter) err.retryAfter = parseFloat(retryAfter) * 1000;
      throw err;
    }
  }, "send");
}

/** Fire-and-forget send: never throws, never rejects — logs failures and moves on.
 *  Safe to call from a request handler without awaiting. */
export function sendEmailQuietly(msg: EmailMessage): void {
  void sendEmail(msg).catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[email-client] send failed (dropped): ${message}`);
  });
}
