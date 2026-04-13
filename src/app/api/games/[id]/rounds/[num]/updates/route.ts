import { NextResponse } from "next/server";
import { submitRoundUpdates } from "@/lib/game";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  try {
    const { id, num } = await params;
    const roundNumber = parseInt(num, 10);
    if (isNaN(roundNumber)) return NextResponse.json({ error: "Invalid round number" }, { status: 400 });

    const { secret, updates } = await request.json();
    if (!secret || typeof secret !== "string")
      return NextResponse.json({ error: "Secret is required" }, { status: 400 });
    if (!Array.isArray(updates) || updates.some((u: unknown) => typeof u !== "string"))
      return NextResponse.json({ error: "Updates must be strings" }, { status: 400 });

    await submitRoundUpdates(id, roundNumber, secret, updates.map((u: string) => u.trim()));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit updates";
    const status = message === "Game not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
