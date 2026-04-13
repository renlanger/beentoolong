import { NextResponse } from "next/server";
import { getGame } from "@/lib/redis";
import { buildGameView } from "@/lib/game";
import { generateRoundSuggestions } from "@/lib/ai";
import { UPDATE_PROMPTS } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret") ?? "";

    const game = await getGame(id);
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    if (game.status !== "finished")
      return NextResponse.json({ error: "Game not finished" }, { status: 400 });

    const view = buildGameView(game, secret);
    if (view.myRole === "spectator")
      return NextResponse.json({ error: "Not a player" }, { status: 403 });

    // Determine opponent based on role
    const opponentName = view.myRole === "creator" ? game.friend?.name : game.creator.name;
    const opponentUpdates =
      view.myRole === "creator" ? game.friend?.updates : game.creator.updates;

    if (!opponentName || !opponentUpdates)
      return NextResponse.json({ error: "Opponent not found" }, { status: 400 });

    const originalQA = UPDATE_PROMPTS.map((p, i) => ({
      question: p.prompt,
      realAnswer: opponentUpdates[i] ?? "",
    }));

    const suggestions = await generateRoundSuggestions(opponentName, originalQA);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
