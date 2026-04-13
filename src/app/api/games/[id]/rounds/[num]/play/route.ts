import { NextResponse } from "next/server";
import { submitRoundGuesses } from "@/lib/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  try {
    const { id, num } = await params;
    const roundNumber = parseInt(num, 10);
    if (isNaN(roundNumber)) return NextResponse.json({ error: "Invalid round number" }, { status: 400 });

    const { secret, guesses } = await request.json();
    if (!secret || typeof secret !== "string")
      return NextResponse.json({ error: "Secret is required" }, { status: 400 });
    if (!guesses || typeof guesses !== "object")
      return NextResponse.json({ error: "Guesses are required" }, { status: 400 });

    await submitRoundGuesses(id, roundNumber, secret, guesses);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit guesses";
    const status = message === "Game not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
