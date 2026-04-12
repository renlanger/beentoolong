"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPlayerSecret } from "@/lib/client";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create game");
      }

      const { gameId, creatorSecret } = await res.json();
      setPlayerSecret(gameId, creatorSecret);
      router.push(`/game/${gameId}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Been Too Long
          </h1>
          <p className="text-lg text-muted">
            A game for reconnecting with old friends
          </p>
        </div>

        <div className="space-y-2 text-muted">
          <p>Share life updates. Guess what&apos;s real.</p>
          <p>See how well you really know each other.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
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
            {loading ? "Creating..." : "Start a Game"}
          </button>

          {error && <p className="text-danger text-sm">{error}</p>}
        </form>

        <p className="text-sm text-muted/70">
          You&apos;ll get a link to share with a friend
        </p>
      </div>
    </main>
  );
}
