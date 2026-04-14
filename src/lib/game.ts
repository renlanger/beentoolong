import { nanoid } from "nanoid";
import type {
  Game,
  Player,
  QuizQuestion,
  QuizOption,
  GameView,
  PublicQuizQuestion,
  QuizQuestionResult,
  ExtraRound,
  RoundQuestion,
  RoundPlayerData,
  PublicExtraRound,
  OriginalQA,
} from "./types";
import { NUM_REAL_UPDATES, UPDATE_PROMPTS } from "./types";
import { getGame, saveGame } from "./redis";
import { generatePairedFakes } from "./ai";

// ── Helpers ───────────────────────────────────────────────────────────────────

function newPlayer(name: string): Player {
  return {
    name,
    secret: nanoid(32),
    updates: [],
    quizQuestions: [],
    guesses: {},
    score: null,
    finishedPlaying: false,
  };
}

function newRoundPlayerData(): RoundPlayerData {
  return {
    questionsForOpponent: [],
    questionsSubmitted: false,
    updates: [],
    quizQuestions: [],
    guesses: {},
    score: null,
    finishedAnswering: false,
    finishedPlaying: false,
  };
}

function buildQuizQuestions(updates: string[], fakes: string[][]): QuizQuestion[] {
  return UPDATE_PROMPTS.map((prompt, i) => ({
    id: nanoid(12),
    promptText: prompt.quizPrompt,
    realOption: { id: nanoid(12), text: updates[i] },
    fakeOptions: (fakes[i] ?? []).map((text) => ({ id: nanoid(12), text })),
  }));
}

function buildCustomQuizQuestions(
  questions: RoundQuestion[],
  updates: string[],
  fakes: string[][]
): QuizQuestion[] {
  return questions.map((q, i) => ({
    id: nanoid(12),
    promptText: q.quizPrompt,
    realOption: { id: nanoid(12), text: updates[i] },
    fakeOptions: (fakes[i] ?? []).map((text) => ({ id: nanoid(12), text })),
    originalQuestion: q.originalQuestion,
  }));
}

function resolvePlayerBySecret(
  game: Game,
  secret: string
): { player: Player; role: "creator" | "friend" } | null {
  if (game.creator.secret === secret) return { player: game.creator, role: "creator" };
  if (game.friend?.secret === secret) return { player: game.friend, role: "friend" };
  return null;
}

function getOpponent(game: Game, role: "creator" | "friend"): Player | null {
  return role === "creator" ? game.friend : game.creator;
}

// Sort options by ID for a stable, consistent order on every render/poll.
// IDs are nanoid-generated so the order is non-predictable but never changes.
function sortedOptions(q: QuizQuestion): QuizOption[] {
  const all = [q.realOption, ...q.fakeOptions];
  return all.sort((a, b) => a.id.localeCompare(b.id));
}

function quizToPublic(questions: QuizQuestion[], opponentName: string): PublicQuizQuestion[] {
  return questions.map((q) => {
    const options = sortedOptions(q);
    return {
      id: q.id,
      promptText: q.promptText.replace("____", opponentName),
      options: options.map((o) => ({ id: o.id, text: o.text })),
      ...(q.originalQuestion ? { originalQuestion: q.originalQuestion } : {}),
    };
  });
}

function buildResults(
  questionsAboutMe: QuizQuestion[],
  myName: string,
  opponentGuesses: Record<string, string>
): QuizQuestionResult[] {
  return questionsAboutMe.map((q) => ({
    id: q.id,
    promptText: q.promptText.replace("____", myName),
    realOptionText: q.realOption.text,
    fakeOptionTexts: q.fakeOptions.map((o) => o.text),
    myChosenOptionId: opponentGuesses[q.id] ?? null,
    correct: opponentGuesses[q.id] === q.realOption.id,
  }));
}

// ── Base game ─────────────────────────────────────────────────────────────────

export async function createGame(
  creatorName: string
): Promise<{ game: Game; creatorSecret: string }> {
  const creator = newPlayer(creatorName);
  const game: Game = {
    id: nanoid(8),
    createdAt: Date.now(),
    status: "setup",
    creator,
    friend: null,
    rounds: [],
    cumulativeScore: { creator: 0, friend: 0 },
  };
  await saveGame(game);
  return { game, creatorSecret: creator.secret };
}

export async function joinGame(
  gameId: string,
  friendName: string
): Promise<{ game: Game; friendSecret: string }> {
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (game.friend) throw new Error("Game already has two players");
  const friend = newPlayer(friendName);
  game.friend = friend;
  // Ensure new fields exist on legacy games
  if (!game.rounds) game.rounds = [];
  if (!game.cumulativeScore) game.cumulativeScore = { creator: 0, friend: 0 };
  await saveGame(game);
  return { game, friendSecret: friend.secret };
}

export async function submitUpdates(
  gameId: string,
  secret: string,
  updates: string[]
): Promise<Game> {
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (!game.rounds) game.rounds = [];
  if (!game.cumulativeScore) game.cumulativeScore = { creator: 0, friend: 0 };

  const result = resolvePlayerBySecret(game, secret);
  if (!result) throw new Error("Invalid player");

  const { player, role } = result;
  if (updates.length !== NUM_REAL_UPDATES)
    throw new Error(`Expected ${NUM_REAL_UPDATES} updates`);
  if (player.updates.length > 0)
    throw new Error("Updates already submitted");

  player.updates = updates;

  // Generate quiz questions for this player immediately — the opponent answers them
  const promptsAndAnswers = UPDATE_PROMPTS.map((prompt, i) => ({
    prompt: prompt.prompt,
    realAnswer: updates[i],
  }));
  const fakes = await generatePairedFakes(player.name, promptsAndAnswers);
  player.quizQuestions = buildQuizQuestions(updates, fakes);

  if (role === "friend") {
    game.status = "ready";
  }

  await saveGame(game);
  return game;
}

export async function submitGuesses(
  gameId: string,
  secret: string,
  guesses: Record<string, string>
): Promise<Game> {
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (!game.rounds) game.rounds = [];
  if (!game.cumulativeScore) game.cumulativeScore = { creator: 0, friend: 0 };

  const result = resolvePlayerBySecret(game, secret);
  if (!result) throw new Error("Invalid player");

  const { player, role } = result;
  if (player.finishedPlaying) throw new Error("Already submitted guesses");

  const opponent = getOpponent(game, role);
  if (!opponent || opponent.quizQuestions.length === 0)
    throw new Error("Quiz not ready yet");

  player.guesses = guesses;
  player.score = opponent.quizQuestions.reduce(
    (score, q) => score + (guesses[q.id] === q.realOption.id ? 1 : 0),
    0
  );
  player.finishedPlaying = true;

  if (game.creator.finishedPlaying && game.friend!.finishedPlaying) {
    game.status = "finished";
    game.cumulativeScore = {
      creator: game.creator.score ?? 0,
      friend: game.friend!.score ?? 0,
    };
  }

  await saveGame(game);
  return game;
}

// ── Extra rounds ──────────────────────────────────────────────────────────────

export async function submitRoundQuestions(
  gameId: string,
  secret: string,
  questions: RoundQuestion[]
): Promise<{ roundNumber: number }> {
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (game.status !== "finished") throw new Error("Game must be finished to start a new round");
  if (!game.rounds) game.rounds = [];
  if (!game.cumulativeScore) game.cumulativeScore = { creator: 0, friend: 0 };

  const result = resolvePlayerBySecret(game, secret);
  if (!result) throw new Error("Invalid player");
  const { role } = result;

  // Find or create the next round
  const nextRoundNum = game.rounds.length + 1;
  let round = game.rounds.find((r) => r.status === "collecting");

  if (!round) {
    // Start a new round
    round = {
      roundNumber: nextRoundNum,
      creator: newRoundPlayerData(),
      friend: newRoundPlayerData(),
      status: "collecting",
    };
    game.rounds.push(round);
  }

  const playerData = role === "creator" ? round.creator : round.friend;
  if (playerData.questionsSubmitted) throw new Error("Questions already submitted");

  playerData.questionsForOpponent = questions;
  playerData.questionsSubmitted = true;

  // If both players have submitted questions, move to answering phase
  if (round.creator.questionsSubmitted && round.friend.questionsSubmitted) {
    round.status = "answering";
  }

  await saveGame(game);
  return { roundNumber: round.roundNumber };
}

export async function submitRoundUpdates(
  gameId: string,
  roundNumber: number,
  secret: string,
  updates: string[]
): Promise<void> {
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (!game.rounds) throw new Error("No rounds");

  const round = game.rounds.find((r) => r.roundNumber === roundNumber);
  if (!round) throw new Error("Round not found");
  if (round.status !== "answering") throw new Error("Round not in answering phase");

  const result = resolvePlayerBySecret(game, secret);
  if (!result) throw new Error("Invalid player");
  const { role } = result;

  const playerData = role === "creator" ? round.creator : round.friend;
  const opponentData = role === "creator" ? round.friend : round.creator;

  if (playerData.finishedAnswering) throw new Error("Already submitted answers");

  // The questions the opponent generated FOR this player
  const questionsForMe = opponentData.questionsForOpponent;
  if (questionsForMe.length === 0) throw new Error("No questions to answer");
  if (updates.length !== questionsForMe.length)
    throw new Error(`Expected ${questionsForMe.length} updates`);

  playerData.updates = updates;
  playerData.finishedAnswering = true;

  // Generate quiz questions (fakes) for this player's answers
  const promptsAndAnswers = questionsForMe.map((q, i) => ({
    prompt: q.text,
    realAnswer: updates[i],
  }));
  const fakes = await generatePairedFakes(
    role === "creator" ? game.creator.name : game.friend!.name,
    promptsAndAnswers
  );
  playerData.quizQuestions = buildCustomQuizQuestions(questionsForMe, updates, fakes);

  // Both answered → ready to quiz
  if (round.creator.finishedAnswering && round.friend.finishedAnswering) {
    round.status = "ready";
  }

  await saveGame(game);
}

export async function submitRoundGuesses(
  gameId: string,
  roundNumber: number,
  secret: string,
  guesses: Record<string, string>
): Promise<void> {
  const game = await getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (!game.rounds) throw new Error("No rounds");

  const round = game.rounds.find((r) => r.roundNumber === roundNumber);
  if (!round) throw new Error("Round not found");
  if (round.status !== "ready" && round.status !== "finished")
    throw new Error("Round not ready");

  const result = resolvePlayerBySecret(game, secret);
  if (!result) throw new Error("Invalid player");
  const { role } = result;

  const playerData = role === "creator" ? round.creator : round.friend;
  const opponentData = role === "creator" ? round.friend : round.creator;

  if (playerData.finishedPlaying) throw new Error("Already submitted guesses");
  if (opponentData.quizQuestions.length === 0) throw new Error("Quiz not ready");

  playerData.guesses = guesses;
  playerData.score = opponentData.quizQuestions.reduce(
    (score, q) => score + (guesses[q.id] === q.realOption.id ? 1 : 0),
    0
  );
  playerData.finishedPlaying = true;

  if (round.creator.finishedPlaying && round.friend.finishedPlaying) {
    round.status = "finished";
    // Update cumulative score
    game.cumulativeScore = {
      creator: game.cumulativeScore.creator + (round.creator.score ?? 0),
      friend: game.cumulativeScore.friend + (round.friend.score ?? 0),
    };
  }

  await saveGame(game);
}

// ── buildGameView ─────────────────────────────────────────────────────────────

export function buildGameView(game: Game, secret: string): GameView {
  const baseResult = resolvePlayerBySecret(game, secret);
  const role = baseResult?.role ?? "spectator";
  const me = baseResult?.player ?? null;
  const opponent =
    role === "creator" ? game.friend : role === "friend" ? game.creator : null;

  // Ensure legacy games have new fields
  const rounds = game.rounds ?? [];
  const cumulativeScore = game.cumulativeScore ?? { creator: 0, friend: 0 };
  // 5 questions per completed round (base game counts as 1 round)
  const finishedExtraRounds = rounds.filter((r) => r.status === "finished").length;
  const totalQuestions = 5 * (1 + finishedExtraRounds);

  // Base game quiz
  let myQuiz: PublicQuizQuestion[] | null = null;
  if (opponent && opponent.quizQuestions.length > 0 && me && !me.finishedPlaying) {
    myQuiz = quizToPublic(opponent.quizQuestions, opponent.name);
  }

  // Base game results (my guesses about opponent)
  let myResults: QuizQuestionResult[] | null = null;
  if (me?.finishedPlaying && opponent) {
    myResults = opponent.quizQuestions.map((q) => ({
      id: q.id,
      promptText: q.promptText.replace("____", opponent.name),
      realOptionText: q.realOption.text,
      fakeOptionTexts: q.fakeOptions.map((o) => o.text),
      myChosenOptionId: me.guesses[q.id] ?? null,
      correct: me.guesses[q.id] === q.realOption.id,
    }));
  }

  // Opponent's results (their guesses about me) — only when game finished
  let opponentResults: QuizQuestionResult[] | null = null;
  if (game.status === "finished" && me && opponent) {
    opponentResults = me.quizQuestions.map((q) => ({
      id: q.id,
      promptText: q.promptText.replace("____", me.name),
      realOptionText: q.realOption.text,
      fakeOptionTexts: q.fakeOptions.map((o) => o.text),
      myChosenOptionId: opponent.guesses[q.id] ?? null,
      correct: opponent.guesses[q.id] === q.realOption.id,
    }));
  }

  // Active round view
  let activeRound: PublicExtraRound | null = null;
  const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  if (latestRound && role !== "spectator" && me && opponent) {
    const myRoundData = role === "creator" ? latestRound.creator : latestRound.friend;
    const opponentRoundData = role === "creator" ? latestRound.friend : latestRound.creator;

    // Quiz for this round (questions about opponent's round answers)
    let roundMyQuiz: PublicQuizQuestion[] | null = null;
    if (
      latestRound.status === "ready" &&
      opponentRoundData.quizQuestions.length > 0 &&
      !myRoundData.finishedPlaying
    ) {
      roundMyQuiz = quizToPublic(opponentRoundData.quizQuestions, opponent.name);
    }

    // My round results
    let roundMyResults: QuizQuestionResult[] | null = null;
    if (myRoundData.finishedPlaying && opponentRoundData.quizQuestions.length > 0) {
      roundMyResults = opponentRoundData.quizQuestions.map((q) => ({
        id: q.id,
        promptText: q.promptText.replace("____", opponent.name),
        realOptionText: q.realOption.text,
        fakeOptionTexts: q.fakeOptions.map((o) => o.text),
        myChosenOptionId: myRoundData.guesses[q.id] ?? null,
        correct: myRoundData.guesses[q.id] === q.realOption.id,
      }));
    }

    // Opponent's original Q&A (for generating follow-up questions)
    // Only show once base game is finished
    let opponentOriginalQA: OriginalQA[] | null = null;
    if (game.status === "finished") {
      opponentOriginalQA = UPDATE_PROMPTS.map((p, i) => ({
        index: i,
        question: p.prompt,
        realAnswer: opponent.updates[i] ?? "",
      }));
    }

    activeRound = {
      roundNumber: latestRound.roundNumber,
      status: latestRound.status,
      myQuestionsSubmitted: myRoundData.questionsSubmitted,
      opponentQuestionsSubmitted: opponentRoundData.questionsSubmitted,
      myRoundQuestions:
        latestRound.status !== "collecting" &&
        opponentRoundData.questionsForOpponent.length > 0
          ? opponentRoundData.questionsForOpponent  // questions opponent generated FOR me
          : null,
      myQuiz: roundMyQuiz,
      myResults: roundMyResults,
      myRoundScore: myRoundData.score,
      opponentRoundScore:
        latestRound.status === "finished" ? opponentRoundData.score : null,
      opponentOriginalQA,
    };
  }

  return {
    id: game.id,
    status: game.status,
    createdAt: game.createdAt,
    myRole: role,
    creator: {
      name: game.creator.name,
      isMe: role === "creator",
      hasSubmittedUpdates: game.creator.updates.length > 0,
      finishedPlaying: game.creator.finishedPlaying,
      score:
        game.status === "finished"
          ? game.creator.score
          : role === "creator"
            ? game.creator.score
            : null,
    },
    friend: game.friend
      ? {
          name: game.friend.name,
          isMe: role === "friend",
          hasSubmittedUpdates: game.friend.updates.length > 0,
          finishedPlaying: game.friend.finishedPlaying,
          score:
            game.status === "finished"
              ? game.friend.score
              : role === "friend"
                ? game.friend.score
                : null,
        }
      : null,
    myQuiz,
    myResults,
    opponentResults,
    cumulativeScore,
    totalQuestions,
    activeRound,
  };
}
