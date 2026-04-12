import { NextResponse } from "next/server";
import { getGame } from "@/lib/redis";
import { buildGameView } from "@/lib/game";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const secret =
      new URL(request.url).searchParams.get("secret") ?? "";

    const game = await getGame(id);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const view = buildGameView(game, secret);
    return NextResponse.json(view);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch game";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
