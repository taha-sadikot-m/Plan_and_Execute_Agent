// lib/geminiConfig.ts
// Central Gemini env configuration — read at call time (not module import time)

export interface GeminiConfig {
  apiKey: string;
  model: string;
  maxRetries: number;
  maxParseRetries: number;
}

export interface GeminiRetryOptions {
  onRetry?: (info: {
    attempt: number;
    delayMs: number;
    reason?: "rate_limit" | "parse";
  }) => void;
}

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_PARSE_RETRIES = 3;

function cleanEnvValue(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "");
}

export function getGeminiErrorStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    return Number((err as { status: number }).status);
  }
  return undefined;
}

export function isQuotaExhausted(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /limit:\s*0\b/i.test(message) ||
    /quota.*exhausted/i.test(message) ||
    /exceeded your current quota/i.test(message)
  );
}

export function getGeminiConfig(): GeminiConfig {
  const apiKey = cleanEnvValue(
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  );

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Create .env.local in the project root with:\n" +
        "GEMINI_API_KEY=your-key-from-https://aistudio.google.com/apikey\n" +
        "Then restart the dev server (npm run dev)."
    );
  }

  const envRetries = Number(process.env.GEMINI_MAX_RETRIES);
  const maxRetries =
    Number.isFinite(envRetries) && envRetries >= 0 ? envRetries : DEFAULT_MAX_RETRIES;

  const envParseRetries = Number(process.env.GEMINI_MAX_PARSE_RETRIES);
  const maxParseRetries =
    Number.isFinite(envParseRetries) && envParseRetries >= 0
      ? envParseRetries
      : DEFAULT_MAX_PARSE_RETRIES;

  return {
    apiKey,
    model: cleanEnvValue(process.env.GEMINI_MODEL) || DEFAULT_MODEL,
    maxRetries,
    maxParseRetries,
  };
}

export function parseRetryAfterMs(err: unknown, attempt: number): number {
  const message = err instanceof Error ? err.message : String(err);
  const retryMatch = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (retryMatch) {
    return Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500;
  }
  return Math.min(30_000, 2_000 * 2 ** attempt);
}

export function formatGeminiError(err: unknown, agentName: string): Error {
  const message = err instanceof Error ? err.message : String(err);
  const status = getGeminiErrorStatus(err);

  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID/i.test(message)) {
    return new Error(
      `Gemini rejected the API key for agent "${agentName}". ` +
        "Check GEMINI_API_KEY in .env.local and restart the dev server."
    );
  }

  if (status === 404 || /not found|is not supported/i.test(message)) {
    const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
    return new Error(
      `Gemini model "${model}" is not available for agent "${agentName}". ` +
        "Set GEMINI_MODEL in .env.local and restart."
    );
  }

  if (isQuotaExhausted(err)) {
    return new Error(
      `Gemini quota exhausted for agent "${agentName}". ` +
        "Check billing and rate limits at https://aistudio.google.com/ — retries will not help until quota resets."
    );
  }

  if (status === 429 || /quota|Too Many Requests|RESOURCE_EXHAUSTED/i.test(message)) {
    return new Error(
      `Gemini rate limit exceeded for agent "${agentName}". ` +
        "Wait a minute and retry, or set GEMINI_MAX_CONCURRENT=1 in .env.local. " +
        "Check RPM limits in Google AI Studio for your model."
    );
  }

  return new Error(`Agent "${agentName}" failed: ${message}`);
}
