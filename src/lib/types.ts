export type GameStatus = "setup" | "ready" | "finished";

export interface QuizStatement {
  id: string;
  text: string;
  isReal: boolean;
}

export interface Player {
  name: string;
  secret: string;
  updates: string[];
  quizStatements: QuizStatement[];
  guesses: Record<string, boolean>;
  score: number | null;
  finishedPlaying: boolean;
}

export interface Game {
  id: string;
  createdAt: number;
  status: GameStatus;
  creator: Player;
  friend: Player | null;
}

// --- Client-safe types (never expose secrets or isReal) ---

export interface PublicQuizStatement {
  id: string;
  text: string;
}

export interface PublicPlayer {
  name: string;
  isMe: boolean;
  hasSubmittedUpdates: boolean;
  finishedPlaying: boolean;
  score: number | null;
}

export interface QuizResult {
  id: string;
  text: string;
  isReal: boolean;
  myGuess: boolean;
  correct: boolean;
}

export interface GameView {
  id: string;
  status: GameStatus;
  createdAt: number;
  myRole: "creator" | "friend" | "spectator";
  creator: PublicPlayer;
  friend: PublicPlayer | null;
  myQuiz: PublicQuizStatement[] | null;
  myResults: QuizResult[] | null;
  opponentResults: QuizResult[] | null;
}

export const NUM_REAL_UPDATES = 5;
export const NUM_FAKE_UPDATES = 4;

export const UPDATE_PROMPTS = [
  {
    prompt: "Where are you living these days?",
    placeholder: "e.g., I moved to Austin two years ago",
  },
  {
    prompt: "What are you doing for work?",
    placeholder: "e.g., I left tech and became a high school teacher",
  },
  {
    prompt: "Any big life changes?",
    placeholder: "e.g., I got married last summer",
  },
  {
    prompt: "Pick up any new hobbies or interests?",
    placeholder: "e.g., I've gotten really into rock climbing",
  },
  {
    prompt: "What's something that would surprise me?",
    placeholder: "e.g., I wrote a children's book",
  },
];
