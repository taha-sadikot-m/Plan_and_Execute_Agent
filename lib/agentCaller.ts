// lib/agentCaller.ts
// Single utility for all Gemini API calls — handles parsing, stripping thinking tags, retries

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiConfig, type GeminiRetryOptions } from "./geminiConfig";
import { runGeminiWithRetries } from "./geminiQueue";

export interface AgentCallOptions {
  systemPrompt: string;
  userMessage: string;
  agentName: string;
  maxTokens?: number;
  useGrounding?: boolean;
  onRetry?: GeminiRetryOptions["onRetry"];
}

export interface AgentCallResult<T> {
  data: T;
  thinkingContent: string | null;
  durationMs: number;
  references: Array<{ title: string; uri: string }>;
}

function stripThinkingTags(text: string): string {
  let cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, "");
  cleaned = cleaned.replace(/```thinking\s*[\s\S]*?```/g, "");
  return cleaned.trim();
}

function extractJSON(text: string): string {
  const jsonFenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonFenceMatch) return jsonFenceMatch[1].trim();

  const objStart = text.indexOf("{");
  const objEnd = text.lastIndexOf("}");
  const arrStart = text.indexOf("[");
  const arrEnd = text.lastIndexOf("]");

  let start = -1;
  let end = -1;

  if (objStart !== -1 && objEnd !== -1 && (arrStart === -1 || objStart < arrStart)) {
    start = objStart;
    end = objEnd;
  } else if (arrStart !== -1 && arrEnd !== -1) {
    start = arrStart;
    end = arrEnd;
  }

  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

function extractThinking(text: string): string | null {
  const match = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (match) return match[1].trim();

  const mdMatch = text.match(/```thinking\s*([\s\S]*?)```/);
  return mdMatch ? mdMatch[1].trim() : null;
}

function getClient(): GoogleGenerativeAI {
  const { apiKey } = getGeminiConfig();
  return new GoogleGenerativeAI(apiKey);
}

async function generateWithModel(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  useGrounding: boolean
) {
  const { model } = getGeminiConfig();
  const genAI = getClient();

  const modelConfig: Parameters<GoogleGenerativeAI["getGenerativeModel"]>[0] = {
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  };

  if (useGrounding) {
    modelConfig.tools = [
      {
        // @ts-expect-error Google SDK types may lag behind grounding tool support
        googleSearch: {},
      },
    ];
  }

  const generativeModel = genAI.getGenerativeModel(modelConfig);
  return generativeModel.generateContent(userMessage);
}

export async function callAgent<T>(
  options: AgentCallOptions
): Promise<AgentCallResult<T>> {
  const {
    systemPrompt,
    userMessage,
    agentName,
    maxTokens = 4096,
    useGrounding = true,
    onRetry,
  } = options;
  const start = Date.now();
  let attemptCount = 1;

  const result = await runGeminiWithRetries(
    () => generateWithModel(systemPrompt, userMessage, maxTokens, useGrounding),
    {
      agentName,
      onRetry: (info) => {
        attemptCount = info.attempt + 1;
        onRetry?.(info);
      },
    }
  );

  const durationMs = Date.now() - start;
  console.log(
    `[Gemini] ${agentName} completed in ${durationMs}ms (grounding=${useGrounding}, attempts=${attemptCount})`
  );

  if (!result.response) {
    throw new Error(`Agent ${agentName} returned no response from Gemini.`);
  }

  const finishReason = result.response.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    console.warn(
      `Agent ${agentName} hit MAX_TOKENS limit (${maxTokens}). Response may be incomplete.`
    );
  }

  const fullText = result.response.text();

  if (!fullText) {
    throw new Error(`Agent ${agentName} returned empty text from Gemini.`);
  }

  const thinkingContent = extractThinking(fullText);
  const cleanText = stripThinkingTags(fullText);
  const jsonText = extractJSON(cleanText);

  let data: T;
  try {
    data = JSON.parse(jsonText) as T;
  } catch (parseError) {
    console.error(`JSON Parse Error for ${agentName}:`, parseError);
    console.error(`Full text length: ${fullText.length} chars`);
    console.error(`Finish reason: ${finishReason}`);

    if (finishReason === "MAX_TOKENS") {
      throw new Error(
        `Agent ${agentName} hit token limit (${maxTokens} tokens) and returned incomplete JSON. ` +
          `Increase maxTokens in orchestrator.ts for this agent.`
      );
    }

    throw new Error(
      `Agent ${agentName} returned invalid JSON.\nRaw output: ${fullText.slice(0, 1000)}`
    );
  }

  const references: Array<{ title: string; uri: string }> = [];
  try {
    const rawChunks =
      result.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of rawChunks) {
      if (chunk.web?.uri && chunk.web?.title) {
        references.push({ uri: chunk.web.uri, title: chunk.web.title });
      }
    }
  } catch (e) {
    console.warn("Could not parse grounding chunks", e);
  }

  return {
    data,
    thinkingContent,
    durationMs,
    references,
  };
}
