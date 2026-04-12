import { nanoid } from "nanoid";
import type {
  Game,
  Player,
  QuizStatement,
  GameView,
  PublicQuizStatement,
  QuizResult,
} from "./types";
import { NUM_REAL_UPDATES, NUM_FAKE_UPDATES } from "./types";
import { getGame, saveGame } from "./redis";
import { generateFakeUpdates } from "./ai";

function newPlayer(name: string): Player {
  return {
    name,
    secret: nanoid(32),
    updates: [],
    quizStatements: [],
    guesses: {},
    score: null,
    finishedPlaying: false,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuizStatements(
  realUpdates: string[],
  fakeUpdates: string[]
): QuizStatement[] {
  const statements: QuizStatement[] = [
    ...realUpdates.map((text) => ({ id: nanoid(12), text, isReal: true })),
    ...fakeUpdates.map((text) => ({ id: nanoid(12), text, isReal: false })),
  ];
  return shuffle(statements);
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
    const [creatorFakes, friendFakes] = await Promise.all([
      generateFakeUpdates(
        game.creator.name,
        game.creator.updates,
        NUM_FAKE_UPDATES
      ),
      generateFakeUpdates(
        game.friend!.name,
        game.friend!.updates,
        NUM_FAKE_UPDATES
      ),
    ]);

    game.creator.quizStatements = buildQuizStatements(
      game.creator.updates,
      creatorFakes
    );
    game.friend!.quizStatements = buildQuizStatements(
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
  guesses: Record<string, boolean>
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
  player.score = opponent.quizStatements.reduce((score, statement) => {
    return score + (guesses[statement.id] === statement.isReal ? 1 : 0);
  }, 0);
  player.finishedPlaying = true;

  if (game.creator.finishedPlaying && game.friend!.finishedPlaying) {
    game.status = "finished";
  }

  await saveGame(game);
  return game;
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

  let myQuiz: PublicQuizStatement[] | null = null;
  if (
    opponent &&
    opponent.quizStatements.length > 0 &&
    me &&
    !me.finishedPlaying
  ) {
    myQuiz = opponent.quizStatements.map((s) => ({ id: s.id, text: s.text }));
  }

  let myResults: QuizResult[] | null = null;
  if (me?.finishedPlaying && opponent) {
    myResults = opponent.quizStatements.map((s) => ({
      id: s.id,
      text: s.text,
      isReal: s.isReal,
      myGuess: me.guesses[s.id] ?? false,
      correct: me.guesses[s.id] === s.isReal,
    }));
  }

  let opponentResults: QuizResult[] | null = null;
  if (game.status === "finished" && me && opponent) {
    opponentResults = me.quizStatements.map((s) => ({
      id: s.id,
      text: s.text,
      isReal: s.isReal,
      myGuess: opponent.guesses[s.id] ?? false,
      correct: opponent.guesses[s.id] === s.isReal,
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
