"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameView, getPlayerSecret, setPlayerSecret } from "@/lib/client";
import type { QuizQuestionResult } from "@/lib/types";

// ── Scoreboard ────────────────────────────────────────────────────────────────

function Scoreboard({
  creatorName,
  friendName,
  creatorScore,
  friendScore,
  round,
}: {
  creatorName: string;
  friendName: string | null;
  creatorScore: number;
  friendScore: number;
  round: number;
}) {
  if (!friendName) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 py-2 pointer-events-none">
      <div className="bg-surface/90 backdrop-blur border border-border rounded-full px-5 py-2
        flex items-center gap-4 text-sm shadow-sm pointer-events-auto">
        <span className="font-semibold text-foreground">{creatorName}</span>
        <span className="text-accent font-bold">{creatorScore}</span>
        <span className="text-muted/50">·</span>
        <span className="text-muted text-xs">Round {round}</span>
        <span className="text-muted/50">·</span>
        <span className="text-accent font-bold">{friendScore}</span>
        <span className="font-semibold text-foreground">{friendName}</span>
      </div>
    </div>
  );
}

// ── Share link ────────────────────────────────────────────────────────────────

function ShareLink({ gameId }: { gameId: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/game/${gameId}`
      : "";

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <p className="text-muted text-sm">Send this link to your friend:</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm
            focus:outline-none select-all"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={handleCopy}
          className="px-4 py-2 text-sm font-medium rounded-lg
            bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ── Join form ─────────────────────────────────────────────────────────────────

function JoinForm({ gameId, creatorName }: { gameId: string; creatorName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to join");
      }
      const { friendSecret } = await res.json();
      setPlayerSecret(gameId, friendSecret);
      router.push(`/game/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleJoin} className="space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={30}
        autoFocus
        className="w-full px-4 py-3 text-lg rounded-xl border border-border bg-surface
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
          placeholder:text-muted/60"
      />
      <button
        type="submit"
        disabled={!name.trim() || loading}
        className="w-full px-6 py-3 text-lg font-medium rounded-xl
          bg-accent text-white hover:bg-accent-hover
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {loading ? "Joining..." : "I'm in"}
      </button>
      {error && <p className="text-danger text-sm">{error}</p>}
    </form>
  );
}

// ── Animated text reveal ──────────────────────────────────────────────────────

function AnimatedLines({
  lines,
  buttonLabel,
  onButton,
  delayBetween = 1200,
  initialDelay = 400,
}: {
  lines: string[];
  buttonLabel: string;
  onButton: () => void;
  delayBetween?: number;
  initialDelay?: number;
}) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = lines.map((_, i) =>
      setTimeout(() => setPhase(i + 1), initialDelay + i * delayBetween)
    );
    timers.push(
      setTimeout(() => setPhase(lines.length + 1), initialDelay + lines.length * delayBetween)
    );
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-5">
        {lines.map((line, i) => (
          <p
            key={i}
            className={i < 2 ? "text-4xl font-bold text-foreground" : "text-lg text-muted leading-relaxed"}
            style={{
              opacity: phase > i ? 1 : 0,
              transform: phase > i ? "translateY(0)" : "translateY(14px)",
              transition: "opacity 0.9s ease, transform 0.9s ease",
            }}
          >
            {line}
          </p>
        ))}
        <div
          style={{
            opacity: phase > lines.length ? 1 : 0,
            transform: phase > lines.length ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}
        >
          <button
            onClick={onButton}
            className="mt-2 px-10 py-3 text-lg font-medium rounded-xl
              bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Post-quiz score reveal ────────────────────────────────────────────────────

function scoreVerdict(score: number, total: number) {
  const pct = score / total;
  if (pct === 1) return "You know them inside out! 🌟";
  if (pct >= 0.8) return "You still really know them! ✨";
  if (pct >= 0.6) return "Pretty good! A few surprises though.";
  if (pct >= 0.4) return "It's been a while, huh?";
  return "Looks like some catching up to do! 😄";
}

function QuizScoreReveal({
  score,
  results,
  opponentName,
  onContinue,
  continueLabel = "Continue →",
}: {
  score: number;
  results: QuizQuestionResult[];
  opponentName: string;
  onContinue: () => void;
  continueLabel?: string;
}) {
  const total = results.length;
  const emoji = score === total ? "🌟" : score >= total / 2 ? "⭐" : "💫";

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="text-6xl">{emoji}</div>
          <h1 className="text-3xl font-bold">
            You got {score} out of {total}!
          </h1>
          <p className="text-muted">{scoreVerdict(score, total)}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-muted uppercase tracking-wide text-xs">
            {opponentName}&apos;s real answers
          </h2>
          {results.map((r) => (
            <div
              key={r.id}
              className={`p-4 rounded-xl border-2 ${
                r.correct ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
              }`}
            >
              <p className="text-sm font-medium text-muted mb-2">{r.promptText}</p>
              <div className="flex items-start gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-success/20 text-success">
                  Real
                </span>
                <p className="text-foreground">&ldquo;{r.realOptionText}&rdquo;</p>
              </div>
              <p className="mt-2 text-xs text-muted">
                You picked the {r.correct ? "✓ real one" : "✗ fake one"}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onContinue}
          className="w-full px-6 py-3 text-lg font-medium rounded-xl
            bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
        >
          {continueLabel}
        </button>
      </div>
    </main>
  );
}

// ── Main hub ──────────────────────────────────────────────────────────────────

export default function GameHub() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { game, loading, error } = useGameView(gameId, 3000);

  const [introComplete, setIntroComplete] = useState(false);
  const [scoreRevealed, setScoreRevealed] = useState(false);
  const [transitionComplete, setTransitionComplete] = useState(false);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-muted text-lg">Loading...</div>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">Game not found</h1>
          <p className="text-muted">{error ?? "This game doesn't exist or has expired."}</p>
          <a href="/" className="inline-block px-6 py-3 font-medium rounded-xl
            bg-accent text-white hover:bg-accent-hover transition-colors">
            Create a New Game
          </a>
        </div>
      </main>
    );
  }

  const isSpectator = game.myRole === "spectator";
  const me = game.myRole === "creator" ? game.creator : game.friend;
  const opponent = game.myRole === "creator" ? game.friend : game.creator;

  const scoreboard = (
    <Scoreboard
      creatorName={game.creator.name}
      friendName={game.friend?.name ?? null}
      creatorScore={game.cumulativeScore.creator}
      friendScore={game.cumulativeScore.friend}
      round={1}
    />
  );

  // ── Spectator: friend arriving via invite link ──────────────────────────────

  if (isSpectator && !game.friend) {
    if (!introComplete) {
      return (
        <AnimatedLines
          lines={[
            "Hey,",
            "it's been too long.",
            `${game.creator.name} has been wanting to connect with you.`,
            "Can you guess what they've been up to?",
          ]}
          buttonLabel="Let's find out"
          onButton={() => setIntroComplete(true)}
          initialDelay={400}
          delayBetween={1100}
        />
      );
    }
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">What&apos;s your name?</h1>
            <p className="text-muted">So {game.creator.name} knows it&apos;s you</p>
          </div>
          <JoinForm gameId={gameId} creatorName={game.creator.name} />
        </div>
      </main>
    );
  }

  if (isSpectator) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">Game in progress</h1>
          <p className="text-muted">This game already has two players.</p>
        </div>
      </main>
    );
  }

  // ── Finished ────────────────────────────────────────────────────────────────

  if (game.status === "finished") {
    router.push(`/game/${gameId}/results`);
    return null;
  }

  // ── Creator flow ─────────────────────────────────────────────────────────────

  if (game.myRole === "creator") {
    if (!me?.hasSubmittedUpdates) {
      router.push(`/game/${gameId}/setup`);
      return null;
    }

    if (game.status !== "ready") {
      return (
        <>
          {scoreboard}
          <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="text-5xl">&#9989;</div>
              <h1 className="text-2xl font-bold">Your updates are in!</h1>
              <p className="text-muted">
                {!game.friend
                  ? "Now share the link with the friend you want to reconnect with."
                  : `Waiting for ${opponent?.name ?? "your friend"} to finish their turn...`}
              </p>
              {!game.friend && <ShareLink gameId={gameId} />}
              {!game.friend && (
                <p className="text-xs text-muted/60">
                  This page will update automatically when they join.
                </p>
              )}
            </div>
          </main>
        </>
      );
    }

    if (me?.finishedPlaying) {
      return (
        <>
          {scoreboard}
          <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="text-5xl">&#9203;</div>
              <h1 className="text-2xl font-bold">
                Waiting for {opponent?.name ?? "your friend"}
              </h1>
              <p className="text-muted">
                They&apos;re still taking the quiz. Results will show once they&apos;re done.
              </p>
            </div>
          </main>
        </>
      );
    }

    return (
      <>
        {scoreboard}
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="text-5xl">&#127918;</div>
            <h1 className="text-2xl font-bold">
              {opponent?.name ?? "Your friend"} is ready!
            </h1>
            <p className="text-muted">
              Time to see how well you know each other. For each question about{" "}
              {opponent?.name ?? "them"}, pick the answer you think is real.
            </p>
            <button
              onClick={() => router.push(`/game/${gameId}/play`)}
              className="px-8 py-3 text-lg font-medium rounded-xl
                bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
            >
              Play Now
            </button>
          </div>
        </main>
      </>
    );
  }

  // ── Friend flow ──────────────────────────────────────────────────────────────

  // Friend played quiz but hasn't submitted updates yet — show score reveal then transition
  if (me?.finishedPlaying && !me.hasSubmittedUpdates) {
    if (!scoreRevealed && game.myResults) {
      return (
        <QuizScoreReveal
          score={me.score ?? 0}
          results={game.myResults}
          opponentName={opponent?.name ?? "them"}
          onContinue={() => setScoreRevealed(true)}
          continueLabel="Now share your updates →"
        />
      );
    }

    if (!transitionComplete) {
      return (
        <AnimatedLines
          lines={[
            "Now it's my turn.",
            "I'd love to try to guess what you've been up to.",
            "Can you share some updates with me?",
          ]}
          buttonLabel="Share my updates"
          onButton={() => setTransitionComplete(true)}
          initialDelay={400}
          delayBetween={1300}
        />
      );
    }

    router.push(`/game/${gameId}/setup`);
    return null;
  }

  // Friend hasn't played yet — send to quiz
  if (!me?.finishedPlaying) {
    if (game.myQuiz) {
      router.push(`/game/${gameId}/play`);
      return null;
    }
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">&#9203;</div>
          <h1 className="text-2xl font-bold">Almost ready...</h1>
          <p className="text-muted">
            Waiting for {opponent?.name ?? "your friend"} to finish setting up.
          </p>
        </div>
      </main>
    );
  }

  // Friend submitted updates, waiting for creator
  return (
    <>
      {scoreboard}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">&#9203;</div>
          <h1 className="text-2xl font-bold">
            Waiting for {opponent?.name ?? "your friend"}
          </h1>
          <p className="text-muted">
            They&apos;re taking the quiz now. Results will appear once they&apos;re done.
          </p>
        </div>
      </main>
    </>
  );
}
