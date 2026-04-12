"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlayerSecret } from "@/lib/client";
import { UPDATE_PROMPTS, NUM_REAL_UPDATES } from "@/lib/types";

export default function Setup() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [updates, setUpdates] = useState<string[]>(
    Array(NUM_REAL_UPDATES).fill("")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(index: number, value: string) {
    setUpdates((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const allFilled = updates.every((u) => u.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled) return;

    const secret = getPlayerSecret(gameId);
    if (!secret) {
      setError("Session expired. Please rejoin the game.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/games/${gameId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          updates: updates.map((u) => u.trim()),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit updates");
      }

      router.push(`/game/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            What&apos;s been going on?
          </h1>
          <p className="text-muted">
            Share 5 updates about your life. Your friend will have to figure out
            which ones are real.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {UPDATE_PROMPTS.map((prompt, i) => (
            <div key={i} className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                {prompt.prompt}
              </label>
              <textarea
                value={updates[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder={prompt.placeholder}
                maxLength={200}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface
                  resize-none
                  focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                  placeholder:text-muted/50"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={!allFilled || loading}
            className="w-full px-6 py-3 text-lg font-medium rounded-xl
              bg-accent text-white hover:bg-accent-hover
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors cursor-pointer"
          >
            {loading ? "Submitting..." : "Lock It In"}
          </button>

          {error && <p className="text-danger text-sm text-center">{error}</p>}
        </form>
      </div>
    </main>
  );
}
