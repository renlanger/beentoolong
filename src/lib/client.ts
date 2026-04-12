import { useState, useEffect, useCallback } from "react";
import type { GameView } from "./types";

const SECRET_PREFIX = "btl_secret_";

export function getPlayerSecret(gameId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${SECRET_PREFIX}${gameId}`);
}

export function setPlayerSecret(gameId: string, secret: string): void {
  localStorage.setItem(`${SECRET_PREFIX}${gameId}`, secret);
}

export function useGameView(gameId: string, pollInterval?: number) {
  const [game, setGame] = useState<GameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    const secret = getPlayerSecret(gameId) ?? "";
    try {
      const res = await fetch(
        `/api/games/${gameId}?secret=${encodeURIComponent(secret)}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load game");
      }
      const data: GameView = await res.json();
      setGame(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    if (pollInterval) {
      const id = setInterval(fetchGame, pollInterval);
      return () => clearInterval(id);
    }
  }, [fetchGame, pollInterval]);

  return { game, loading, error, refetch: fetchGame };
}
