export type GameStatus = "setup" | "ready" | "finished";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  promptText: string;
  realOption: QuizOption;
  fakeOption: QuizOption;
}

export interface Player {
  name: string;
  secret: string;
  updates: string[];
  quizQuestions: QuizQuestion[];
  guesses: Record<string, string>;
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

export interface PublicQuizOption {
  id: string;
  text: string;
}

export interface PublicQuizQuestion {
  id: string;
  promptText: string;
  options: PublicQuizOption[];
}

export interface PublicPlayer {
  name: string;
  isMe: boolean;
  hasSubmittedUpdates: boolean;
  finishedPlaying: boolean;
  score: number | null;
}

export interface QuizQuestionResult {
  id: string;
  promptText: string;
  realOptionText: string;
  fakeOptionText: string;
  myChosenOptionId: string | null;
  correct: boolean;
}

export interface GameView {
  id: string;
  status: GameStatus;
  createdAt: number;
  myRole: "creator" | "friend" | "spectator";
  creator: PublicPlayer;
  friend: PublicPlayer | null;
  myQuiz: PublicQuizQuestion[] | null;
  myResults: QuizQuestionResult[] | null;
  opponentResults: QuizQuestionResult[] | null;
}

export const NUM_REAL_UPDATES = 5;

export const UPDATE_PROMPTS = [
  {
    prompt: "Where are you living these days?",
    quizPrompt: "Where does ____ live?",
    placeholder: "e.g., I moved to Austin two years ago",
  },
  {
    prompt: "What are you doing for work?",
    quizPrompt: "What does ____ do for work?",
    placeholder: "e.g., I left tech and became a high school teacher",
  },
  {
    prompt: "Any big life changes?",
    quizPrompt: "What's a big recent life change for ____?",
    placeholder: "e.g., I got married last summer",
  },
  {
    prompt: "Pick up any new hobbies or interests?",
    quizPrompt: "What's a new hobby or interest of ____?",
    placeholder: "e.g., I've gotten really into rock climbing",
  },
  {
    prompt: "What's something that would surprise me?",
    quizPrompt: "What's something surprising about ____?",
    placeholder: "e.g., I wrote a children's book",
  },
];
