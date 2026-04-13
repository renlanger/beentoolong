"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameView, getPlayerSecret } from "@/lib/client";
import type { RoundSuggestion } from "@/lib/ai";
import type { RoundQuestion, PublicQuizQuestion, QuizQuestionResult } from "@/lib/types";
import { nanoid } from "nanoid";

// ── Question selection (A / B / C) ────────────────────────────────────────────

type OptionType = "followUp" | "own" | "aiNew";

interface PendingQuestion {
  type: OptionType;
  text: string;
  quizPrompt: string;
}

function QuestionSelector({
  index,
  total,
  originalQuestion,
  realAnswer,
  suggestion,
  opponentName,
  onNext,
  isLast,
}: {
  index: number;
  total: number;
  originalQuestion: string;
  realAnswer: string;
  suggestion: RoundSuggestion | null;
  opponentName: string;
  onNext: (q: PendingQuestion) => void;
  isLast: boolean;
}) {
  const [selected, setSelected] = useState<OptionType | null>(null);
  const [ownText, setOwnText] = useState("");
  const [editedFollowUp, setEditedFollowUp] = useState(suggestion?.followUp ?? "");
  const [editedNew, setEditedNew] = useState(suggestion?.newQuestion ?? "");

  useEffect(() => {
    setEditedFollowUp(suggestion?.followUp ?? "");
    setEditedNew(suggestion?.newQuestion ?? "");
  }, [suggestion]);

  function canSubmit() {
    if (!selected) return false;
    if (selected === "followUp") return editedFollowUp.trim().length > 0;
    if (selected === "own") return ownText.trim().length > 0;
    if (selected === "aiNew") return editedNew.trim().length > 0;
    return false;
  }

  function handleSubmit() {
    if (!canSubmit()) return;
    let text = "";
    let quizPrompt = "";
    if (selected === "followUp") {
      text = editedFollowUp.trim();
      quizPrompt = suggestion?.followUpQuiz ?? `What does ____ say about: ${text}`;
    } else if (selected === "own") {
      text = ownText.trim();
      quizPrompt = `What does ____ say: "${text}"`;
    } else {
      text = editedNew.trim();
      quizPrompt = suggestion?.newQuestionQuiz ?? `What does ____ say about: ${text}`;
    }
    onNext({ type: selected!, text, quizPrompt });
  }

  const optionBase = "w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer";
  const optionActive = "border-accent bg-accent/5";
  const optionIdle = "border-border bg-surface hover:border-accent/40";

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    i < index ? "var(--color-accent)" :
                    i === index ? "color-mix(in srgb, var(--color-accent) 45%, transparent)" :
                    "var(--color-border)",
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted text-right">{index + 1} of {total}</p>
        </div>

        {/* Context */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
          <p className="text-xs text-muted font-medium uppercase tracking-wide">
            {opponentName} was asked:
          </p>
          <p className="text-sm text-foreground font-medium">{originalQuestion}</p>
          <p className="text-sm text-muted italic">&ldquo;{realAnswer}&rdquo;</p>
        </div>

        <p className="text-lg font-semibold">Now ask them something new about this:</p>

        <div className="space-y-3">
          {/* Option A: Follow-up */}
          <button
            className={`${optionBase} ${selected === "followUp" ? optionActive : optionIdle}`}
            onClick={() => setSelected("followUp")}
          >
            <p className="text-xs font-semibold text-accent mb-1">A — Follow-up</p>
            {suggestion ? (
              selected === "followUp" ? (
                <textarea
                  value={editedFollowUp}
                  onChange={(e) => setEditedFollowUp(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  rows={2}
                  className="w-full text-sm bg-transparent resize-none focus:outline-none"
                />
              ) : (
                <p className="text-sm">{suggestion.followUp}</p>
              )
            ) : (
              <p className="text-sm text-muted">Loading suggestion...</p>
            )}
          </button>

          {/* Option B: Your own */}
          <button
            className={`${optionBase} ${selected === "own" ? optionActive : optionIdle}`}
            onClick={() => setSelected("own")}
          >
            <p className="text-xs font-semibold text-accent mb-1">B — Ask your own question</p>
            {selected === "own" ? (
              <textarea
                value={ownText}
                onChange={(e) => setOwnText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Type your question..."
                rows={2}
                autoFocus
                className="w-full text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted/50"
              />
            ) : (
              <p className="text-sm text-muted">Write whatever you want to ask them</p>
            )}
          </button>

          {/* Option C: AI picks */}
          <button
            className={`${optionBase} ${selected === "aiNew" ? optionActive : optionIdle}`}
            onClick={() => setSelected("aiNew")}
          >
            <p className="text-xs font-semibold text-accent mb-1">C — Let AI pick</p>
            {suggestion ? (
              selected === "aiNew" ? (
                <textarea
                  value={editedNew}
                  onChange={(e) => setEditedNew(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  rows={2}
                  className="w-full text-sm bg-transparent resize-none focus:outline-none"
                />
              ) : (
                <p className="text-sm">{suggestion.newQuestion}</p>
              )
            ) : (
              <p className="text-sm text-muted">Loading suggestion...</p>
            )}
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit()}
          className="w-full px-6 py-3 text-lg font-medium rounded-xl
            bg-accent text-white hover:bg-accent-hover
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isLast ? "Send questions" : "Next question"}
        </button>
      </div>
    </main>
  );
}

// ── Round setup: answer questions ─────────────────────────────────────────────

function RoundSetup({
  gameId,
  roundNumber,
  questions,
  secret,
  onDone,
}: {
  gameId: string;
  roundNumber: number;
  questions: RoundQuestion[];
  secret: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [updates, setUpdates] = useState<string[]>(Array(questions.length).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = questions[step];
  const currentValue = updates[step];
  const isFilled = currentValue.trim().length > 0;
  const isLast = step === questions.length - 1;

  function handleChange(val: string) {
    setUpdates((prev) => { const n = [...prev]; n[step] = val; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFilled) return;
    if (!isLast) { setStep((s) => s + 1); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/rounds/${roundNumber}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, updates: updates.map((u) => u.trim()) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="space-y-1">
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor: i < step ? "var(--color-accent)" :
                    i === step ? "color-mix(in srgb, var(--color-accent) 45%, transparent)" :
                    "var(--color-border)",
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted text-right">{step + 1} of {questions.length}</p>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{current.text}</h1>
          <p className="text-sm text-muted">Your friend will guess which answer is real.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            key={step}
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Your answer..."
            maxLength={200}
            rows={3}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface resize-none
              focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
              placeholder:text-muted/50"
          />
          <div className="flex gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)}
                className="px-5 py-3 font-medium rounded-xl border border-border
                  text-muted hover:text-foreground hover:border-accent/40 transition-colors cursor-pointer">
                Back
              </button>
            )}
            <button type="submit" disabled={!isFilled || loading}
              className="flex-1 px-6 py-3 text-lg font-medium rounded-xl
                bg-accent text-white hover:bg-accent-hover
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
              {loading ? "Submitting..." : isLast ? "Lock it in" : "Next"}
            </button>
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
        </form>
      </div>
    </main>
  );
}

// ── Round quiz ────────────────────────────────────────────────────────────────

function RoundQuiz({
  gameId,
  roundNumber,
  questions,
  secret,
  opponentName,
  onDone,
}: {
  gameId: string;
  roundNumber: number;
  questions: PublicQuizQuestion[];
  secret: string;
  opponentName: string;
  onDone: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChoose(optionId: string) {
    const question = questions[currentIndex];
    const newGuesses = { ...guesses, [question.id]: optionId };
    setGuesses(newGuesses);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/games/${gameId}/rounds/${roundNumber}/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, guesses: newGuesses }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit guesses");
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">🎯</div>
          <p className="text-lg text-muted">Tallying your answers...</p>
        </div>
      </main>
    );
  }

  const current = questions[currentIndex];

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            {questions.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 max-w-8 rounded-full transition-colors ${
                i < currentIndex ? "bg-accent" : i === currentIndex ? "bg-accent/50" : "bg-border"
              }`} />
            ))}
          </div>
          <p className="text-xs text-muted">{currentIndex + 1} of {questions.length}</p>
        </div>

        <div className="text-center">
          <p className="text-lg font-medium">{current.promptText}</p>
        </div>

        <div className="flex flex-col gap-3">
          {current.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleChoose(option.id)}
              className="w-full px-6 py-4 text-left text-lg rounded-xl
                bg-surface border-2 border-border hover:border-accent/50 hover:bg-accent/5
                transition-colors cursor-pointer"
            >
              &ldquo;{option.text}&rdquo;
            </button>
          ))}
        </div>
        {error && <p className="text-danger text-sm text-center">{error}</p>}
      </div>
    </main>
  );
}

// ── Round score reveal ────────────────────────────────────────────────────────

function RoundScoreReveal({
  myScore,
  opponentScore,
  myName,
  opponentName,
  results,
  myTotal,
  opponentTotal,
  onPlayAgain,
  onDone,
}: {
  myScore: number;
  opponentScore: number | null;
  myName: string;
  opponentName: string;
  results: QuizQuestionResult[];
  myTotal: number;
  opponentTotal: number;
  onPlayAgain: () => void;
  onDone: () => void;
}) {
  const total = results.length;

  return (
    <main className="flex-1 flex items-start justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="text-5xl">{myScore >= total / 2 ? "⭐" : "💫"}</div>
          <h1 className="text-3xl font-bold">Round result</h1>
          <p className="text-muted">
            You got {myScore}/{total} right about {opponentName}.
            {opponentScore !== null && ` They got ${opponentScore}/${total} right about you.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-muted mb-1">Total: {myName}</p>
            <p className="text-3xl font-bold text-accent">{myTotal}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-muted mb-1">Total: {opponentName}</p>
            <p className="text-3xl font-bold text-accent">{opponentTotal}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            {opponentName}&apos;s answers
          </h2>
          {results.map((r) => (
            <div key={r.id} className={`p-4 rounded-xl border-2 ${
              r.correct ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
            }`}>
              <p className="text-sm text-muted mb-2">{r.promptText}</p>
              <div className="flex items-start gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-success/20 text-success">Real</span>
                <p>&ldquo;{r.realOptionText}&rdquo;</p>
              </div>
              <p className="mt-1 text-xs text-muted">
                You picked the {r.correct ? "✓ real one" : "✗ fake one"}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button onClick={onPlayAgain}
            className="w-full px-6 py-3 text-lg font-medium rounded-xl
              bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer">
            Play another round
          </button>
          <button onClick={onDone}
            className="w-full px-6 py-3 font-medium rounded-xl border border-border
              text-muted hover:text-foreground transition-colors cursor-pointer">
            Done for now
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Main next-round page ──────────────────────────────────────────────────────

type Phase =
  | "selecting"     // generating questions for opponent
  | "waiting"       // waiting for opponent to submit their questions
  | "answering"     // answering opponent's questions
  | "waiting-quiz"  // waiting for both to answer before quiz
  | "quiz"          // taking the quiz
  | "waiting-score" // waiting for opponent to finish quiz
  | "score"         // viewing round results
  | "done";

export default function NextRound() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { game, loading, error } = useGameView(gameId, 3000);

  const [phase, setPhase] = useState<Phase>("selecting");
  const [questionStep, setQuestionStep] = useState(0);
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [suggestions, setSuggestions] = useState<RoundSuggestion[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const secret = getPlayerSecret(gameId) ?? "";

  // Load AI suggestions on mount
  const loadSuggestions = useCallback(async () => {
    if (suggestionsLoading || suggestions) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetch(
        `/api/games/${gameId}/rounds/suggest?secret=${encodeURIComponent(secret)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions);
      }
    } finally {
      setSuggestionsLoading(false);
    }
  }, [gameId, secret, suggestionsLoading, suggestions]);

  useEffect(() => {
    if (phase === "selecting") loadSuggestions();
  }, [phase, loadSuggestions]);

  // Sync phase with game state
  useEffect(() => {
    if (!game) return;
    const round = game.activeRound;

    if (!round) {
      // No active round yet — stay on selecting
      return;
    }

    const { status, myQuestionsSubmitted, opponentQuestionsSubmitted, myQuiz, myResults } = round;

    if (myResults && round.myRoundScore !== null) {
      setPhase("score");
      return;
    }
    if (myQuiz) {
      setPhase("quiz");
      return;
    }
    if (status === "ready" && !myQuiz) {
      setPhase("waiting-quiz");
      return;
    }
    if (status === "answering") {
      if (round.myRoundQuestions && round.myRoundQuestions.length > 0) {
        setPhase("answering");
      } else {
        setPhase("waiting-quiz");
      }
      return;
    }
    if (status === "collecting") {
      if (myQuestionsSubmitted && !opponentQuestionsSubmitted) {
        setPhase("waiting");
        return;
      }
    }
  }, [game]);

  async function handleQuestionsComplete(allQuestions: PendingQuestion[]) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const questions: RoundQuestion[] = allQuestions.map((q) => ({
        id: nanoid(12),
        text: q.text,
        quizPrompt: q.quizPrompt,
        placeholder: "Your answer...",
      }));

      const res = await fetch(`/api/games/${gameId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, questions }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit questions");
      }
      setPhase("waiting");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-muted">Loading...</div>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-danger">{error ?? "Game not found"}</p>
          <a href="/" className="text-accent hover:underline">Home</a>
        </div>
      </main>
    );
  }

  if (game.status !== "finished") {
    router.push(`/game/${gameId}`);
    return null;
  }

  const me = game.myRole === "creator" ? game.creator : game.friend;
  const opponent = game.myRole === "creator" ? game.friend : game.creator;
  if (!me || !opponent) return null;

  const round = game.activeRound;
  const myName = me.name;
  const opponentName = opponent.name;

  // ── Selecting: generate questions ──────────────────────────────────────────

  if (phase === "selecting") {
    const opponentQA = round?.opponentOriginalQA ?? game.activeRound?.opponentOriginalQA;
    // myResults[i].realOptionText IS the opponent's real answer (the correct option in the quiz about them)
    const qa = game.myResults?.map((r, i) => ({
      index: i,
      question: r.promptText,
      realAnswer: r.realOptionText,
    })) ?? opponentQA ?? [];

    if (qa.length === 0) {
      return (
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-muted text-center space-y-2">
            <p>Loading game data...</p>
          </div>
        </main>
      );
    }

    if (questionStep < qa.length) {
      const item = qa[questionStep];
      return (
        <QuestionSelector
          index={questionStep}
          total={qa.length}
          originalQuestion={item.question}
          realAnswer={item.realAnswer}
          suggestion={suggestions?.[questionStep] ?? null}
          opponentName={opponentName}
          isLast={questionStep === qa.length - 1}
          onNext={(q) => {
            const updated = [...pendingQuestions, q];
            if (questionStep < qa.length - 1) {
              setPendingQuestions(updated);
              setQuestionStep((s) => s + 1);
            } else {
              handleQuestionsComplete(updated);
            }
          }}
        />
      );
    }
  }

  // ── Waiting for opponent to submit questions ────────────────────────────────

  if (phase === "waiting") {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold">Questions sent!</h1>
          <p className="text-muted">
            Waiting for {opponentName} to send their questions for you...
          </p>
          {submitError && <p className="text-danger text-sm">{submitError}</p>}
        </div>
      </main>
    );
  }

  // ── Answering opponent's questions ─────────────────────────────────────────

  if (phase === "answering" && round?.myRoundQuestions && round.myRoundQuestions.length > 0) {
    return (
      <RoundSetup
        gameId={gameId}
        roundNumber={round.roundNumber}
        questions={round.myRoundQuestions}
        secret={secret}
        onDone={() => setPhase("waiting-quiz")}
      />
    );
  }

  // ── Waiting for quiz to be ready ───────────────────────────────────────────

  if (phase === "waiting-quiz") {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold">Answers submitted!</h1>
          <p className="text-muted">
            {round?.status === "ready"
              ? "Loading your quiz..."
              : `Waiting for ${opponentName} to answer their questions...`}
          </p>
        </div>
      </main>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────

  if (phase === "quiz" && round?.myQuiz) {
    return (
      <RoundQuiz
        gameId={gameId}
        roundNumber={round.roundNumber}
        questions={round.myQuiz}
        secret={secret}
        opponentName={opponentName}
        onDone={() => setPhase("waiting-score")}
      />
    );
  }

  // ── Waiting for opponent to finish quiz ────────────────────────────────────

  if (phase === "waiting-score") {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold">
            Waiting for {opponentName}
          </h1>
          <p className="text-muted">They&apos;re still taking the quiz...</p>
        </div>
      </main>
    );
  }

  // ── Score reveal ───────────────────────────────────────────────────────────

  if (phase === "score" && round?.myResults) {
    return (
      <RoundScoreReveal
        myScore={round.myRoundScore ?? 0}
        opponentScore={round.opponentRoundScore}
        myName={myName}
        opponentName={opponentName}
        results={round.myResults}
        myTotal={game.myRole === "creator" ? game.cumulativeScore.creator : game.cumulativeScore.friend}
        opponentTotal={game.myRole === "creator" ? game.cumulativeScore.friend : game.cumulativeScore.creator}
        onPlayAgain={() => {
          setPhase("selecting");
          setQuestionStep(0);
          setPendingQuestions([]);
          setSuggestions(null);
        }}
        onDone={() => router.push(`/game/${gameId}/results`)}
      />
    );
  }

  // ── Fallback ───────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-muted">Loading...</div>
    </main>
  );
}
