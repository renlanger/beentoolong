import { NextResponse } from "next/server";
import { submitUpdates } from "@/lib/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { secret, updates } = await request.json();

    if (!secret || typeof secret !== "string") {
      return NextResponse.json(
        { error: "Secret is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(updates) || updates.some((u: unknown) => typeof u !== "string" || (u as string).trim().length === 0)) {
      return NextResponse.json(
        { error: "Updates must be an array of non-empty strings" },
        { status: 400 }
      );
    }

    const game = await submitUpdates(
      id,
      secret,
      updates.map((u: string) => u.trim())
    );

    return NextResponse.json({ status: game.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit updates";
    const status = message === "Game not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
