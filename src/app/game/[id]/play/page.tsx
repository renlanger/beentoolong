"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlayerSecret } from "@/lib/client";
import type { GameView, PublicQuizStatement } from "@/lib/types";

export default function Play() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [statements, setStatements] = useState<PublicQuizStatement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guesses, setGuesses] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opponentName, setOpponentName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchQuiz = useCallback(async () => {
    const secret = getPlayerSecret(gameId) ?? "";
    try {
      const res = await fetch(
        `/api/games/${gameId}?secret=${encodeURIComponent(secret)}`
      );
      if (!res.ok) throw new Error("Failed to load game");

      const game: GameView = await res.json();

      if (game.status !== "ready" && game.status !== "finished") {
        router.push(`/game/${gameId}`);
        return;
      }

      if (!game.myQuiz) {
        router.push(`/game/${gameId}`);
        return;
      }

      setStatements(game.myQuiz);
      const opponent =
        game.myRole === "creator" ? game.friend : game.creator;
      setOpponentName(opponent?.name ?? "your friend");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  }, [gameId, router]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  async function handleGuess(guessedReal: boolean) {
    const statement = statements[currentIndex];
    const newGuesses = { ...guesses, [statement.id]: guessedReal };
    setGuesses(newGuesses);

    if (currentIndex < statements.length - 1) {
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

  if (submitting) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">&#127919;</div>
          <p className="text-lg text-muted">Tallying your answers...</p>
        </div>
      </main>
    );
  }

  const current = statements[currentIndex];
  const progress = currentIndex + 1;
  const total = statements.length;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted">
            About {opponentName}
          </p>
          <div className="flex items-center justify-center gap-1">
            {statements.map((_, i) => (
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

        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <p className="text-xl leading-relaxed">&ldquo;{current.text}&rdquo;</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleGuess(false)}
            className="flex-1 px-6 py-4 text-lg font-medium rounded-xl
              border-2 border-danger/30 text-danger
              hover:bg-danger/10 transition-colors cursor-pointer"
          >
            No Way
          </button>
          <button
            onClick={() => handleGuess(true)}
            className="flex-1 px-6 py-4 text-lg font-medium rounded-xl
              border-2 border-success/30 text-success
              hover:bg-success/10 transition-colors cursor-pointer"
          >
            That Happened
          </button>
        </div>
      </div>
    </main>
  );
}
