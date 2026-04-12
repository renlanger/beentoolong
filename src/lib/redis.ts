import { Redis } from "@upstash/redis";
import type { Game } from "./types";

let redis: Redis;

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

const GAME_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function getGame(id: string): Promise<Game | null> {
  const game = await getRedis().get<Game>(`game:${id}`);
  return game ?? null;
}

export async function saveGame(game: Game): Promise<void> {
  await getRedis().set(`game:${game.id}`, game, { ex: GAME_TTL_SECONDS });
}
