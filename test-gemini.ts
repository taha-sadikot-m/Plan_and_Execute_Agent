import { GoogleGenerativeAI } from "@google/generative-ai";
import { DOMAIN_SYSTEM_PROMPT } from "./lib/prompts";

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: DOMAIN_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.7,
    },
  });

  const res = await model.generateContent("Problem statement: \"Build a creator marketplace platform\"");
  const text = res.response.text();
  console.log("----- HEAD -----");
  console.log(text.slice(0, 500));
  console.log("----- TAIL -----");
  console.log(text.slice(-500));
}

run();
