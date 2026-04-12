"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameView, getPlayerSecret, setPlayerSecret } from "@/lib/client";

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

function JoinForm({ gameId }: { gameId: string }) {
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
      router.push(`/game/${gameId}/setup`);
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
        className="w-full px-4 py-3 text-lg rounded-xl border border-border bg-surface
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
          placeholder:text-muted/60"
      />
      <button
        type="submit"
        disabled={!name.trim() || loading}
        className="w-full px-6 py-3 text-lg font-medium rounded-xl
          bg-accent text-white hover:bg-accent-hover
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors cursor-pointer"
      >
        {loading ? "Joining..." : "Join Game"}
      </button>
      {error && <p className="text-danger text-sm">{error}</p>}
    </form>
  );
}

export default function GameHub() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { game, loading, error } = useGameView(gameId, 5000);

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
          <a
            href="/"
            className="inline-block px-6 py-3 font-medium rounded-xl
              bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Create a New Game
          </a>
        </div>
      </main>
    );
  }

  const secret = getPlayerSecret(gameId);
  const isSpectator = game.myRole === "spectator";
  const me = game.myRole === "creator" ? game.creator : game.friend;
  const opponent = game.myRole === "creator" ? game.friend : game.creator;

  if (isSpectator && !game.friend) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{game.creator.name} wants to reconnect!</h1>
            <p className="text-muted">Enter your name to start playing</p>
          </div>
          <JoinForm gameId={gameId} />
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

  if (me && !me.hasSubmittedUpdates) {
    router.push(`/game/${gameId}/setup`);
    return null;
  }

  if (game.status === "finished") {
    router.push(`/game/${gameId}/results`);
    return null;
  }

  if (game.status === "ready") {
    if (me?.finishedPlaying) {
      return (
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
      );
    }

    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">&#127918;</div>
          <h1 className="text-2xl font-bold">
            {opponent?.name ?? "Your friend"} is in!
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
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-5xl">&#9989;</div>
        <h1 className="text-2xl font-bold">Your updates are in!</h1>
        <p className="text-muted">
          {game.friend
            ? `Waiting for ${opponent?.name ?? "your friend"} to share their updates...`
            : "Now share the link with the friend you want to reconnect with."}
        </p>
        {!game.friend && <ShareLink gameId={gameId} />}
        {secret && !game.friend && (
          <p className="text-xs text-muted/60">
            This page will update automatically when they join.
          </p>
        )}
      </div>
    </main>
  );
}
