export interface RoomStatePayload {
  roomId: string;
  status: "waiting" | "playing" | "finished";
  hostId: string;
  players: { id: string; nickname: string; isBot: boolean }[];
  currentTurnPlayerId: string | null;
  lastWord: string | null;
  usedWords: string[];
  deadline: number | null;
  winnerId: string | null;
}

export interface GameStartedPayload {
  startingEmoji: string;
  startingWord: string;
}

export interface TurnStartPayload {
  playerId: string;
  deadline: number;
}

export interface EmojiConfirmedPayload {
  emoji: string;
  word: string;
  playerId: string;
  timestamp: number;
  nextPlayerId: string | null;
  deadline: number | null;
}

export type RejectReason =
  | "NOT_YOUR_TURN"
  | "GAME_NOT_PLAYING"
  | "UNKNOWN_EMOJI"
  | "WRONG_CHAIN"
  | "WORD_ALREADY_USED"
  | "NO_FOLLOW_UP"
  | "TIME_OUT";

export interface EmojiRejectedPayload {
  reason: RejectReason;
}

export interface GameOverPayload {
  winnerId: string;
  loserId: string;
  reason:
    | "TIME_OUT"
    | "NO_VALID_MOVE"
    | "DISCONNECT"
    | "WRONG_CHAIN"
    | "WORD_ALREADY_USED";
}
