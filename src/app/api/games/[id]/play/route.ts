import { NextResponse } from "next/server";
import { submitGuesses } from "@/lib/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { secret, guesses } = await request.json();

    if (!secret || typeof secret !== "string") {
      return NextResponse.json(
        { error: "Secret is required" },
        { status: 400 }
      );
    }

    if (
      !guesses ||
      typeof guesses !== "object" ||
      Object.values(guesses).some((v) => typeof v !== "boolean")
    ) {
      return NextResponse.json(
        { error: "Guesses must be a map of statement IDs to booleans" },
        { status: 400 }
      );
    }

    const game = await submitGuesses(id, secret, guesses);

    return NextResponse.json({ status: game.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit guesses";
    const status = message === "Game not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
