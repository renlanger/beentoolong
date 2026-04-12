import { NextResponse } from "next/server";
import { joinGame } from "@/lib/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { friendSecret } = await joinGame(id, name.trim());

    return NextResponse.json({ friendSecret });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join game";
    const status = message === "Game not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
