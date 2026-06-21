// lib/geminiQueue.ts
// Global semaphore + unified retry lock for all Gemini API calls

import {
  getGeminiConfig,
  parseRetryAfterMs,
  formatGeminiError,
  isQuotaExhausted,
  getGeminiErrorStatus,
  type GeminiRetryOptions,
} from "./geminiConfig";

const DEFAULT_MAX_CONCURRENT = 3;

let activeCount = 0;
let cooldownUntil = 0;
const waitQueue: Array<() => void> = [];

function getMaxConcurrent(): number {
  const env = Number(process.env.GEMINI_MAX_CONCURRENT);
  if (Number.isFinite(env) && env >= 1) return Math.floor(env);
  return DEFAULT_MAX_CONCURRENT;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterMs(): number {
  return 100 + Math.floor(Math.random() * 200);
}

export function setGeminiCooldown(delayMs: number): void {
  const until = Date.now() + delayMs;
  if (until > cooldownUntil) {
    cooldownUntil = until;
  }
}

async function waitForCooldown(): Promise<void> {
  const remaining = cooldownUntil - Date.now();
  if (remaining > 0) {
    await sleep(remaining);
  }
}

function acquireSlot(): Promise<void> {
  const max = getMaxConcurrent();
  if (activeCount < max) {
    activeCount++;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeCount++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeCount = Math.max(0, activeCount - 1);
  const next = waitQueue.shift();
  if (next) next();
}

export interface GeminiRequestOptions extends GeminiRetryOptions {
  agentName: string;
}

/**
 * Holds the queue slot for the entire retry loop so agents cannot thundering-herd
 * after a 429 when concurrent slots are limited.
 */
export async function runGeminiWithRetries<T>(
  fn: () => Promise<T>,
  options: GeminiRequestOptions
): Promise<T> {
  const { agentName, onRetry } = options;
  const { maxRetries } = getGeminiConfig();
  let lastError: unknown;

  await waitForCooldown();
  await acquireSlot();
  await sleep(jitterMs());

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;

        if (isQuotaExhausted(err)) {
          throw formatGeminiError(err, agentName);
        }

        const status = getGeminiErrorStatus(err);
        const retryable = status === 429 || status === 503;

        if (!retryable || attempt === maxRetries) {
          throw formatGeminiError(err, agentName);
        }

        const delayMs = parseRetryAfterMs(err, attempt);
        setGeminiCooldown(delayMs);
        onRetry?.({ attempt: attempt + 1, delayMs });
        await sleep(delayMs);
        await waitForCooldown();
      }
    }

    throw formatGeminiError(lastError, agentName);
  } finally {
    releaseSlot();
  }
}
