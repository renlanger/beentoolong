import { NextResponse } from "next/server";
import { createGame } from "@/lib/game";

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { game, creatorSecret } = await createGame(name.trim());

    return NextResponse.json({
      gameId: game.id,
      creatorSecret,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create game";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
