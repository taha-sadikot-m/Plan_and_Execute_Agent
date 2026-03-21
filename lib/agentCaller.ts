// lib/agentCaller.ts
// Single utility for all Gemini API calls — handles parsing, stripping thinking tags, retries

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AgentCallOptions {
  systemPrompt: string;
  userMessage: string;
  agentName: string;
  maxTokens?: number;
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
  // First, try explicitly labeled json fences
  const jsonFenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonFenceMatch) return jsonFenceMatch[1].trim();

  // If no explicit json fence, find the true outermost object/array
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function callAgent<T>(
  options: AgentCallOptions
): Promise<AgentCallResult<T>> {
  const { systemPrompt, userMessage, agentName, maxTokens = 4096 } = options;
  const start = Date.now();

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    tools: [
      {
        // @ts-ignore - Google SDK types might lag, but this enables Google Search Grounding natively
        googleSearch: {},
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  });

  const result = await model.generateContent(userMessage);

  if (!result.response) {
    throw new Error(`Agent ${agentName} returned no response from Gemini.`);
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
  } catch {
    throw new Error(
      `Agent ${agentName} returned invalid JSON.\nRaw output: ${jsonText.slice(0, 500)}`
    );
  }

  // Extract google search grounding chunks
  const references: Array<{ title: string; uri: string }> = [];
  try {
    const rawChunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
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
    durationMs: Date.now() - start,
    references,
  };
}
