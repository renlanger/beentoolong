"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlayerSecret } from "@/lib/client";
import type { GameView, PublicQuizQuestion } from "@/lib/types";

export default function Play() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [questions, setQuestions] = useState<PublicQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opponentName, setOpponentName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchQuiz = useCallback(async () => {
    // Don't re-fetch if we already submitted — prevents flash back to question 1
    if (submitted) return;

    const secret = getPlayerSecret(gameId) ?? "";
    try {
      const res = await fetch(
        `/api/games/${gameId}?secret=${encodeURIComponent(secret)}`
      );
      if (!res.ok) throw new Error("Failed to load game");

      const game: GameView = await res.json();

      if (!game.myQuiz) {
        router.push(`/game/${gameId}`);
        return;
      }

      setQuestions(game.myQuiz);
      const opponent =
        game.myRole === "creator" ? game.friend : game.creator;
      setOpponentName(opponent?.name ?? "your friend");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  }, [gameId, router, submitted]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  async function handleChoose(chosenOptionId: string) {
    const question = questions[currentIndex];
    const newGuesses = { ...guesses, [question.id]: chosenOptionId };
    setGuesses(newGuesses);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    setSubmitting(true);
    const secret = getPlayerSecret(gameId);

    try {
      const res = await fetch(`/api/games/${gameId}/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, guesses: newGuesses }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit");
      }

      setSubmitted(true);
      router.push(`/game/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit guesses");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-muted text-lg">Loading quiz...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-danger">{error}</p>
          <button
            onClick={() => router.push(`/game/${gameId}`)}
            className="text-accent hover:underline cursor-pointer"
          >
            Back to game
          </button>
        </div>
      </main>
    );
  }

  if (submitting || submitted) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">&#127919;</div>
          <p className="text-lg text-muted">Tallying your answers...</p>
        </div>
      </main>
    );
  }

  const current = questions[currentIndex];
  const progress = currentIndex + 1;
  const total = questions.length;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 max-w-8 rounded-full transition-colors ${
                  i < currentIndex
                    ? "bg-accent"
                    : i === currentIndex
                      ? "bg-accent/50"
                      : "bg-border"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted">
            {progress} of {total}
          </p>
        </div>

        <div className="text-center">
          <p className="text-lg font-medium text-foreground">
            {current.promptText}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {current.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleChoose(option.id)}
              className="w-full px-6 py-4 text-left text-lg rounded-xl
                bg-surface border-2 border-border
                hover:border-accent/50 hover:bg-accent/5
                transition-colors cursor-pointer"
            >
              &ldquo;{option.text}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
