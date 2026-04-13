import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NUM_FAKE_OPTIONS, NUM_ROUND_QUESTIONS } from "./types";

// ── Base game: fake answer generation ────────────────────────────────────────

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

// ── Extra rounds: question suggestion generation ──────────────────────────────

export interface RoundSuggestion {
  followUp: string;      // Option A: a follow-up on the real answer
  newQuestion: string;   // Option C: a fresh AI-picked question
  followUpQuiz: string;  // quiz prompt for the follow-up
  newQuestionQuiz: string; // quiz prompt for the new question
}

export async function generateRoundSuggestions(
  opponentName: string,
  originalQA: Array<{ question: string; realAnswer: string }>
): Promise<RoundSuggestion[]> {
  const count = Math.min(originalQA.length, NUM_ROUND_QUESTIONS);

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.9,
    prompt: `You are helping two old friends play a reconnection game. They are playing a second round where they ask each other deeper follow-up questions.

For each question below about ${opponentName}, generate two things:
1. A "follow-up" question that digs deeper into their real answer
2. A "new" question — something fresh and interesting you'd want to ask an old friend (unrelated to their answer)

Also for each, write a short "quiz prompt" version (like a multiple choice question stem) in the style "What does ____ [verb phrase]?" — use ____ as placeholder for the person's name.

${originalQA.slice(0, count)
  .map(({ question, realAnswer }, i) =>
    `${i + 1}. Original: "${question}"
   Their answer: "${realAnswer}"`
  )
  .join("\n\n")}

Return ONLY a JSON array of ${count} objects with this shape (no other text):
[{
  "followUp": "...",
  "newQuestion": "...",
  "followUpQuiz": "What does ____ ...",
  "newQuestionQuiz": "What does ____ ..."
}, ...]`,
  });

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed: RoundSuggestion[] = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === count) return parsed;
    return generateFallbackSuggestions(count);
  } catch {
    return generateFallbackSuggestions(count);
  }
}

function generateFallbackSuggestions(count: number): RoundSuggestion[] {
  const fallbacks = [
    { followUp: "What do you love most about it?", newQuestion: "What's something you've changed your mind about recently?", followUpQuiz: "What does ____ love most about their situation?", newQuestionQuiz: "What has ____ recently changed their mind about?" },
    { followUp: "How did you end up there?", newQuestion: "What's a goal you're working toward right now?", followUpQuiz: "How did ____ end up where they are?", newQuestionQuiz: "What goal is ____ currently working toward?" },
    { followUp: "How has it changed you?", newQuestion: "What's something you wish more people knew about you?", followUpQuiz: "How has ____ been changed by recent events?", newQuestionQuiz: "What does ____ wish more people knew about them?" },
    { followUp: "Would you do it again?", newQuestion: "What are you most proud of from the past year?", followUpQuiz: "Would ____ make the same decision again?", newQuestionQuiz: "What is ____ most proud of from the past year?" },
    { followUp: "Who else knows about this?", newQuestion: "What's been taking up most of your mental energy lately?", followUpQuiz: "Who in ____'s life knows about this?", newQuestionQuiz: "What has been taking up most of ____'s mental energy?" },
  ];
  return fallbacks.slice(0, count);
}
