"use client";

import { useParams, useRouter } from "next/navigation";
import { useGameView } from "@/lib/client";
import type { QuizQuestionResult } from "@/lib/types";

function ResultCard({
  result,
  opponentName,
}: {
  result: QuizQuestionResult;
  opponentName: string;
}) {
  return (
    <div
      className={`p-4 rounded-xl border-2 ${
        result.correct
          ? "border-success/30 bg-success/5"
          : "border-danger/30 bg-danger/5"
      }`}
    >
      <p className="text-sm font-medium text-muted mb-3">
        {result.promptText}
      </p>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0
              bg-success/20 text-success"
          >
            Real
          </span>
          <p className="text-foreground">&ldquo;{result.realOptionText}&rdquo;</p>
        </div>
        <div className="flex items-start gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0
              bg-danger/20 text-danger"
          >
            Fake
          </span>
          <p className="text-foreground">&ldquo;{result.fakeOptionText}&rdquo;</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">
          You picked the {result.correct ? "real" : "fake"} one
        </span>
        <span className="text-lg">{result.correct ? "\u2705" : "\u274C"}</span>
      </div>
    </div>
  );
}

export default function Results() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { game, loading, error } = useGameView(gameId, 5000);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-muted text-lg">Loading results...</div>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-danger">{error ?? "Game not found"}</p>
          <a href="/" className="text-accent hover:underline">
            Start a new game
          </a>
        </div>
      </main>
    );
  }

  if (game.status !== "finished") {
    router.push(`/game/${gameId}`);
    return null;
  }

  const me = game.myRole === "creator" ? game.creator : game.friend;
  const opponent = game.myRole === "creator" ? game.friend : game.creator;

  if (!me || !opponent) return null;

  const myScore = me.score ?? 0;
  const theirScore = opponent.score ?? 0;
  const totalQuestions = game.myResults?.length ?? 0;

  let verdict: string;
  if (myScore > theirScore) {
    verdict = `You win! You know ${opponent.name} better than they know you.`;
  } else if (theirScore > myScore) {
    verdict = `${opponent.name} wins! They know you better than you know them.`;
  } else {
    verdict = "It's a tie! You know each other equally well.";
  }

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Results</h1>
          <p className="text-muted text-lg">{verdict}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-sm text-muted">{me.name} (You)</p>
            <p className="text-3xl font-bold text-accent">
              {myScore}/{totalQuestions}
            </p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-sm text-muted">{opponent.name}</p>
            <p className="text-3xl font-bold text-accent">
              {theirScore}/{totalQuestions}
            </p>
          </div>
        </div>

        {game.myResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Your guesses about {opponent.name}
            </h2>
            <div className="space-y-3">
              {game.myResults.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  opponentName={opponent.name}
                />
              ))}
            </div>
          </div>
        )}

        {game.opponentResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {opponent.name}&apos;s guesses about you
            </h2>
            <div className="space-y-3">
              {game.opponentResults.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  opponentName={me.name}
                />
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-4">
          <a
            href="/"
            className="inline-block px-8 py-3 text-lg font-medium rounded-xl
              bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Play Again
          </a>
        </div>
      </div>
    </main>
  );
}
