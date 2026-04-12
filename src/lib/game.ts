import { nanoid } from "nanoid";
import type {
  Game,
  Player,
  QuizQuestion,
  QuizOption,
  GameView,
  PublicQuizQuestion,
  QuizQuestionResult,
} from "./types";
import { NUM_REAL_UPDATES, UPDATE_PROMPTS } from "./types";
import { getGame, saveGame } from "./redis";
import { generatePairedFakes } from "./ai";

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

function buildQuizQuestions(
  updates: string[],
  fakes: string[]
): QuizQuestion[] {
  return UPDATE_PROMPTS.map((prompt, i) => ({
    id: nanoid(12),
    promptText: prompt.quizPrompt,
    realOption: { id: nanoid(12), text: updates[i] },
    fakeOption: { id: nanoid(12), text: fakes[i] },
  }));
}

function resolvePlayerBySecret(
  game: Game,
  secret: string
): { player: Player; role: "creator" | "friend" } | null {
  if (game.creator.secret === secret)
    return { player: game.creator, role: "creator" };
  if (game.friend?.secret === secret)
    return { player: game.friend, role: "friend" };
  return null;
}

function getOpponent(game: Game, role: "creator" | "friend"): Player | null {
  return role === "creator" ? game.friend : game.creator;
}

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

  const result = resolvePlayerBySecret(game, secret);
  if (!result) throw new Error("Invalid player");

  const { player, role } = result;
  if (updates.length !== NUM_REAL_UPDATES)
    throw new Error(`Expected ${NUM_REAL_UPDATES} updates`);

  const alreadyHasQuiz = game.status === "ready" || game.status === "finished";
  if (player.updates.length > 0 && alreadyHasQuiz)
    throw new Error("Updates already submitted");

  player.updates = updates;

  const opponent = getOpponent(game, role);
  const bothReady = opponent && opponent.updates.length > 0;

  if (bothReady) {
    const promptsAndAnswers = (p: Player) =>
      UPDATE_PROMPTS.map((prompt, i) => ({
        prompt: prompt.prompt,
        realAnswer: p.updates[i],
      }));

    const [creatorFakes, friendFakes] = await Promise.all([
      generatePairedFakes(game.creator.name, promptsAndAnswers(game.creator)),
      generatePairedFakes(game.friend!.name, promptsAndAnswers(game.friend!)),
    ]);

    game.creator.quizQuestions = buildQuizQuestions(
      game.creator.updates,
      creatorFakes
    );
    game.friend!.quizQuestions = buildQuizQuestions(
      game.friend!.updates,
      friendFakes
    );
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
  if (game.status !== "ready" && game.status !== "finished")
    throw new Error("Game not ready to play");

  const result = resolvePlayerBySecret(game, secret);
  if (!result) throw new Error("Invalid player");

  const { player, role } = result;
  if (player.finishedPlaying) throw new Error("Already submitted guesses");

  const opponent = getOpponent(game, role);
  if (!opponent) throw new Error("No opponent");

  player.guesses = guesses;
  player.score = opponent.quizQuestions.reduce((score, q) => {
    return score + (guesses[q.id] === q.realOption.id ? 1 : 0);
  }, 0);
  player.finishedPlaying = true;

  if (game.creator.finishedPlaying && game.friend!.finishedPlaying) {
    game.status = "finished";
  }

  await saveGame(game);
  return game;
}

function shuffledOptions(q: QuizQuestion): [QuizOption, QuizOption] {
  return Math.random() < 0.5
    ? [q.realOption, q.fakeOption]
    : [q.fakeOption, q.realOption];
}

export function buildGameView(game: Game, secret: string): GameView {
  const result = resolvePlayerBySecret(game, secret);
  const role = result?.role ?? "spectator";
  const me = result?.player ?? null;
  const opponent =
    role === "creator"
      ? game.friend
      : role === "friend"
        ? game.creator
        : null;

  let myQuiz: PublicQuizQuestion[] | null = null;
  if (
    opponent &&
    opponent.quizQuestions.length > 0 &&
    me &&
    !me.finishedPlaying
  ) {
    myQuiz = opponent.quizQuestions.map((q) => {
      const [a, b] = shuffledOptions(q);
      return {
        id: q.id,
        promptText: q.promptText.replace("____", opponent.name),
        options: [
          { id: a.id, text: a.text },
          { id: b.id, text: b.text },
        ],
      };
    });
  }

  let myResults: QuizQuestionResult[] | null = null;
  if (me?.finishedPlaying && opponent) {
    myResults = opponent.quizQuestions.map((q) => ({
      id: q.id,
      promptText: q.promptText.replace("____", opponent.name),
      realOptionText: q.realOption.text,
      fakeOptionText: q.fakeOption.text,
      myChosenOptionId: me.guesses[q.id] ?? null,
      correct: me.guesses[q.id] === q.realOption.id,
    }));
  }

  let opponentResults: QuizQuestionResult[] | null = null;
  if (game.status === "finished" && me && opponent) {
    opponentResults = me.quizQuestions.map((q) => ({
      id: q.id,
      promptText: q.promptText.replace("____", me.name),
      realOptionText: q.realOption.text,
      fakeOptionText: q.fakeOption.text,
      myChosenOptionId: opponent.guesses[q.id] ?? null,
      correct: opponent.guesses[q.id] === q.realOption.id,
    }));
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
  };
}
