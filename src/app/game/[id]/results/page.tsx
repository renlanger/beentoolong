"use client";

import { useParams, useRouter } from "next/navigation";
import { useGameView } from "@/lib/client";
import type { QuizQuestionResult } from "@/lib/types";

function ResultCard({ result }: { result: QuizQuestionResult }) {
  return (
    <div className={`p-4 rounded-xl border-2 ${
      result.correct ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
    }`}>
      <p className="text-sm font-medium text-muted mb-3">{result.promptText}</p>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-success/20 text-success">
            Real
          </span>
          <p className="text-foreground">&ldquo;{result.realOptionText}&rdquo;</p>
        </div>
        {result.fakeOptionTexts.map((fakeText, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-danger/20 text-danger">
              Fake
            </span>
            <p className="text-foreground">&ldquo;{fakeText}&rdquo;</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">
          You picked the {result.correct ? "real" : "fake"} one
        </span>
        <span className="text-lg">{result.correct ? "✅" : "❌"}</span>
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
          <a href="/" className="text-accent hover:underline">Start a new game</a>
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

  const myScore = game.myRole === "creator" ? game.cumulativeScore.creator : game.cumulativeScore.friend;
  const theirScore = game.myRole === "creator" ? game.cumulativeScore.friend : game.cumulativeScore.creator;
  const totalQuestions = game.totalQuestions;

  const iWon = myScore > theirScore;
  const tied = myScore === theirScore;

  const myPct = totalQuestions > 0 ? Math.round((myScore / totalQuestions) * 100) : 0;
  const theirPct = totalQuestions > 0 ? Math.round((theirScore / totalQuestions) * 100) : 0;

  let winnerEmoji = tied ? "🤝" : iWon ? "🏆" : "🌟";
  let verdict: string;
  if (tied) {
    verdict = "It's a tie! You know each other equally well.";
  } else if (iWon) {
    verdict = `You win! You know ${opponent.name} better than they know you.`;
  } else {
    verdict = `${opponent.name} wins! They know you better than you know them.`;
  }

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">

        {/* Winner banner */}
        <div className="text-center space-y-3">
          <div className="text-6xl">{winnerEmoji}</div>
          <h1 className="text-3xl font-bold">Results</h1>
          <p className="text-lg text-muted">{verdict}</p>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`bg-surface border-2 rounded-xl p-5 text-center transition-all ${
            !tied && iWon ? "border-accent shadow-sm" : "border-border"
          }`}>
            <p className="text-sm text-muted mb-1">{me.name} {me.isMe ? "(you)" : ""}</p>
            <p className="text-4xl font-bold text-accent">{myScore}<span className="text-lg text-muted font-normal">/{totalQuestions}</span></p>
            <p className="text-sm text-muted">{myPct}%</p>
            {!tied && iWon && <p className="text-xs text-accent font-medium mt-1">winner ✓</p>}
          </div>
          <div className={`bg-surface border-2 rounded-xl p-5 text-center transition-all ${
            !tied && !iWon ? "border-accent shadow-sm" : "border-border"
          }`}>
            <p className="text-sm text-muted mb-1">{opponent.name}</p>
            <p className="text-4xl font-bold text-accent">{theirScore}<span className="text-lg text-muted font-normal">/{totalQuestions}</span></p>
            <p className="text-sm text-muted">{theirPct}%</p>
            {!tied && !iWon && <p className="text-xs text-accent font-medium mt-1">winner ✓</p>}
          </div>
        </div>

        {/* Play another round CTA */}
        <div className="rounded-2xl bg-accent/5 border border-accent/20 p-6 text-center space-y-3">
          <p className="font-semibold text-foreground">Keep re:connecting</p>
          <p className="text-muted text-sm">
            Play another round — ask follow-up questions, go deeper, and keep finding out how much you really know each other.
          </p>
          <button
            onClick={() => router.push(`/game/${gameId}/next-round`)}
            className="px-8 py-3 font-medium rounded-xl bg-accent text-white
              hover:bg-accent-hover transition-colors cursor-pointer"
          >
            Play Another Round →
          </button>
        </div>

        {/* My guesses about opponent */}
        {game.myResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your guesses about {opponent.name}</h2>
            <div className="space-y-3">
              {game.myResults.map((result) => (
                <ResultCard key={result.id} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* Opponent's guesses about me */}
        {game.opponentResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{opponent.name}&apos;s guesses about you</h2>
            <div className="space-y-3">
              {game.opponentResults.map((result) => (
                <ResultCard key={result.id} result={result} />
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-4">
          <a href="/"
            className="inline-block px-8 py-3 text-lg font-medium rounded-xl
              bg-surface border border-border text-muted hover:text-foreground
              hover:border-accent/40 transition-colors"
          >
            Start a New Game
          </a>
        </div>
      </div>
    </main>
  );
}
