import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function generatePairedFakes(
  playerName: string,
  promptsAndAnswers: Array<{ prompt: string; realAnswer: string }>
): Promise<string[]> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.9,
    prompt: `You are helping create a social reconnection game. Two old friends are catching up.

For each question below, ${playerName} gave a REAL answer. Generate one convincing FAKE answer that their friend might believe instead.

Rules:
- Match the tone and specificity of the real answer
- Make the fake plausible for someone at a similar life stage — not absurd
- The fake should be a genuine alternative, not obviously wrong
- Keep it roughly the same length as the real answer

${promptsAndAnswers
  .map(
    ({ prompt, realAnswer }, i) =>
      `${i + 1}. Question: "${prompt}"
   Real answer: "${realAnswer}"
   Fake answer:`
  )
  .join("\n\n")}

Return ONLY a JSON array of ${promptsAndAnswers.length} strings (one fake per question, in order). No other text.`,
  });

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === promptsAndAnswers.length) {
      return parsed;
    }
    return parsed.slice(0, promptsAndAnswers.length);
  } catch {
    return generateFallbackFakes(promptsAndAnswers.length);
  }
}

function generateFallbackFakes(count: number): string[] {
  const fallbacks = [
    "Denver, Colorado",
    "I'm in finance now",
    "I adopted a rescue dog",
    "I got really into ceramics",
    "I ran a half marathon",
    "I moved abroad for a year",
    "I started learning to surf",
    "I got my real estate license",
  ];
  return [...fallbacks].sort(() => Math.random() - 0.5).slice(0, count);
}
