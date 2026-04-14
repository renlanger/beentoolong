export type GameStatus = "setup" | "ready" | "finished";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  promptText: string;
  realOption: QuizOption;
  fakeOptions: QuizOption[];
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

// ── Extra rounds ──────────────────────────────────────────────────────────────

export interface RoundQuestion {
  id: string;
  text: string;        // shown to the person answering, e.g. "What do you love most about Austin?"
  quizPrompt: string;  // shown during quiz, e.g. "What does ____ love most about where they live?"
  placeholder: string;
  // Context shown to the person answering — what original question this follows up on
  originalQuestion?: string;
  originalAnswer?: string;
}

export interface RoundPlayerData {
  questionsForOpponent: RoundQuestion[]; // questions this player generated for their opponent
  questionsSubmitted: boolean;
  updates: string[];          // this player's answers to their opponent's questions
  quizQuestions: QuizQuestion[];
  guesses: Record<string, string>;
  score: number | null;
  finishedAnswering: boolean;
  finishedPlaying: boolean;
}

export type RoundStatus = "collecting" | "answering" | "ready" | "finished";

export interface ExtraRound {
  roundNumber: number;
  creator: RoundPlayerData;
  friend: RoundPlayerData;
  status: RoundStatus;
}

// ── Base game ─────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  createdAt: number;
  status: GameStatus;
  creator: Player;
  friend: Player | null;
  rounds: ExtraRound[];
  cumulativeScore: { creator: number; friend: number };
}

// ── Public / view types ───────────────────────────────────────────────────────

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
  fakeOptionTexts: string[];
  myChosenOptionId: string | null;
  correct: boolean;
}

// Original question + opponent's real answer, used in round question-generation UI
export interface OriginalQA {
  index: number;
  question: string;   // e.g. "Where are you living these days?"
  realAnswer: string; // opponent's real answer
}

export interface PublicExtraRound {
  roundNumber: number;
  status: RoundStatus;
  myQuestionsSubmitted: boolean;
  opponentQuestionsSubmitted: boolean;
  // What questions my opponent generated for me to answer
  myRoundQuestions: RoundQuestion[] | null;
  // The quiz I need to take (about my opponent's round answers)
  myQuiz: PublicQuizQuestion[] | null;
  myResults: QuizQuestionResult[] | null;
  myRoundScore: number | null;
  opponentRoundScore: number | null;
  // Opponent's original Q&A — shown when generating follow-up questions
  opponentOriginalQA: OriginalQA[] | null;
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
  cumulativeScore: { creator: number; friend: number };
  /** Total questions per player across all completed rounds (5 per round) */
  totalQuestions: number;
  activeRound: PublicExtraRound | null;
}

// ── Constants & prompts ───────────────────────────────────────────────────────

export const NUM_REAL_UPDATES = 5;
export const NUM_FAKE_OPTIONS = 2;
export const NUM_ROUND_QUESTIONS = 5;

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
