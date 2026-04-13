import { NextResponse } from "next/server";
import { submitRoundQuestions } from "@/lib/game";
import type { RoundQuestion } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { secret, questions } = await request.json();

    if (!secret || typeof secret !== "string") {
      return NextResponse.json({ error: "Secret is required" }, { status: 400 });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "Questions are required" }, { status: 400 });
    }

    const { roundNumber } = await submitRoundQuestions(id, secret, questions as RoundQuestion[]);
    return NextResponse.json({ roundNumber });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit questions";
    const status = message === "Game not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
