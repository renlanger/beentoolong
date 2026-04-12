import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NUM_FAKE_UPDATES } from "./types";

export async function generateFakeUpdates(
  playerName: string,
  realUpdates: string[],
  count: number = NUM_FAKE_UPDATES
): Promise<string[]> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.9,
    prompt: `You are helping create a social reconnection game. Two old friends are catching up, and you need to generate fake life updates that will be mixed in with real ones.

Given these REAL life updates from ${playerName}:
${realUpdates.map((u, i) => `${i + 1}. ${u}`).join("\n")}

Generate exactly ${count} FAKE but plausible life updates. Rules:
- Match the tone, length, and specificity of the real updates
- Make them believable for someone with a similar life stage
- Cover different topics than the real updates when possible
- Don't make them obviously absurd or humorous
- Each should be a single sentence or short statement, like the real ones

Return ONLY a JSON array of ${count} strings. No other text.`,
  });

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === count) {
      return parsed;
    }
    return parsed.slice(0, count);
  } catch {
    return generateFallbackFakes(count);
  }
}

function generateFallbackFakes(count: number): string[] {
  const fallbacks = [
    "I started learning to play the piano",
    "I moved to a new city on the west coast",
    "I got really into marathon running",
    "I switched to a completely different career field",
    "I adopted a dog from the local shelter",
    "I went back to school for a graduate degree",
    "I started my own small business",
    "I took a solo trip to Japan",
  ];

  const shuffled = [...fallbacks].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
