import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NUM_FAKE_OPTIONS } from "./types";

export async function generatePairedFakes(
  playerName: string,
  promptsAndAnswers: Array<{ prompt: string; realAnswer: string }>
): Promise<string[][]> {
  const numFakes = NUM_FAKE_OPTIONS;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.9,
    prompt: `You are helping create a social reconnection game. Two old friends are catching up.

For each question below, ${playerName} gave a REAL answer. Generate ${numFakes} convincing FAKE answers that their friend might believe instead.

Rules:
- Match the tone and specificity of the real answer
- Make each fake plausible for someone at a similar life stage — not absurd
- The fakes should be genuine alternatives, not obviously wrong
- Keep them roughly the same length as the real answer
- Make the ${numFakes} fakes distinct from each other

${promptsAndAnswers
  .map(
    ({ prompt, realAnswer }, i) =>
      `${i + 1}. Question: "${prompt}"
   Real answer: "${realAnswer}"
   Fake answers (${numFakes}):`
  )
  .join("\n\n")}

Return ONLY a JSON array of ${promptsAndAnswers.length} arrays, each containing ${numFakes} fake answer strings (in order).
Example format: [["fake1a", "fake1b"], ["fake2a", "fake2b"], ...]. No other text.`,
  });

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === promptsAndAnswers.length) {
      return parsed.map((fakes: unknown) =>
        Array.isArray(fakes)
          ? (fakes as string[]).slice(0, numFakes)
          : [String(fakes)]
      );
    }
    return generateFallbackFakes(promptsAndAnswers.length, numFakes);
  } catch {
    return generateFallbackFakes(promptsAndAnswers.length, numFakes);
  }
}

function generateFallbackFakes(count: number, numFakes: number): string[][] {
  const fallbacks = [
    "Denver, Colorado",
    "I'm in finance now",
    "I adopted a rescue dog",
    "I got really into ceramics",
    "I ran a half marathon",
    "I moved abroad for a year",
    "I started learning to surf",
    "I got my real estate license",
    "I changed careers completely",
    "I started freelancing full-time",
    "I bought a house in the suburbs",
    "I've been doing a lot of travel",
  ];
  const shuffled = [...fallbacks].sort(() => Math.random() - 0.5);
  return Array.from({ length: count }, (_, i) =>
    shuffled.slice(i * numFakes, i * numFakes + numFakes)
  );
}
