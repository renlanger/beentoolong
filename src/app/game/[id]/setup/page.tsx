"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlayerSecret } from "@/lib/client";
import { UPDATE_PROMPTS, NUM_REAL_UPDATES } from "@/lib/types";

export default function Setup() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [step, setStep] = useState(0);
  const [updates, setUpdates] = useState<string[]>(
    Array(NUM_REAL_UPDATES).fill("")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = UPDATE_PROMPTS[step];
  const currentValue = updates[step];
  const isFilled = currentValue.trim().length > 0;
  const isLast = step === NUM_REAL_UPDATES - 1;

  function handleChange(value: string) {
    setUpdates((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
  }

  function handleNext() {
    if (!isFilled) return;
    if (!isLast) {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFilled) return;

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
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            {UPDATE_PROMPTS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{
                  backgroundColor:
                    i < step
                      ? "var(--color-accent)"
                      : i === step
                        ? "color-mix(in srgb, var(--color-accent) 45%, transparent)"
                        : "var(--color-border)",
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted text-right">
            {step + 1} of {NUM_REAL_UPDATES}
          </p>
        </div>

        {/* Question */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {current.prompt}
          </h1>
          <p className="text-sm text-muted">
            Your friend will have to figure out whether this is real or AI-generated.
          </p>
        </div>

        {/* Input */}
        <form
          onSubmit={isLast ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}
          className="space-y-4"
        >
          <textarea
            key={step}
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={current.placeholder}
            maxLength={200}
            rows={3}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface
              resize-none
              focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
              placeholder:text-muted/50"
          />

          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-3 font-medium rounded-xl border border-border
                  text-muted hover:text-foreground hover:border-accent/40
                  transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              type="submit"
              disabled={!isFilled || loading}
              className="flex-1 px-6 py-3 text-lg font-medium rounded-xl
                bg-accent text-white hover:bg-accent-hover
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors cursor-pointer"
            >
              {loading
                ? "Submitting..."
                : isLast
                  ? "Lock It In"
                  : "Next"}
            </button>
          </div>

          {error && <p className="text-danger text-sm text-center">{error}</p>}
        </form>
      </div>
    </main>
  );
}
