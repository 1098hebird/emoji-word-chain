import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { getAllEmojis, getCanonicalWord } from "../data/emojiData.js";
import { checkChain, hasAvailableFollowUp, type RejectReason } from "./wordChain.js";

export interface RoomPlayer {
  id: string;
  nickname: string;
  socketId: string | null;
  isBot: boolean;
}

export type RoomStatus = "waiting" | "playing" | "finished";

const START_TURN_MS = 30_000;
const TURN_DECREASE_MS = 2_000;
const MIN_TURN_MS = 10_000;

function turnTimeMs(turnCount: number): number {
  const t = START_TURN_MS - turnCount * TURN_DECREASE_MS;
  return Math.max(t, MIN_TURN_MS);
}

const BOT_MIN_DELAY_MS = 1_000;
const BOT_MAX_DELAY_MS = 3_000;

function getAllWords(): string[] {
  return getAllEmojis().map((emoji) => emoji.word);
}

export interface EmojiConfirmedPayload {
  emoji: string;
  word: string;
  playerId: string;
  timestamp: number;
  nextPlayerId: string | null;
  deadline: number | null;
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

export class Room extends EventEmitter {
  readonly id: string;
  players: RoomPlayer[] = [];
  hostId: string;
  status: RoomStatus = "waiting";
  currentTurnIndex = 0;
  lastWord: string | null = null;
  usedWords: Set<string> = new Set();
  turnCount = 0;
  deadline: number | null = null;
  winnerId?: string;

  private timeoutHandle: NodeJS.Timeout | null = null;
  private botHandle: NodeJS.Timeout | null = null;

  constructor(hostId: string) {
    super();
    this.id = Room.generateRoomCode();
    this.hostId = hostId;
  }

  private static generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  addPlayer(player: RoomPlayer) {
    if (this.players.length >= 2) {
      throw new Error("ROOM_FULL");
    }
    this.players.push(player);
  }

  get isFull(): boolean {
    return this.players.length === 2;
  }

  currentPlayer(): RoomPlayer {
    return this.players[this.currentTurnIndex];
  }

  otherPlayer(playerId: string): RoomPlayer | undefined {
    return this.players.find((p) => p.id !== playerId);
  }

  start() {
    if (this.players.length !== 2) throw new Error("NOT_ENOUGH_PLAYERS");
    this.status = "playing";
    this.turnCount = 0;
    this.usedWords = new Set();
    this.currentTurnIndex = this.players.findIndex((p) => p.id === this.hostId);
    this.assignStartingWord();
    this.beginTurn();
  }

  rematch() {
    this.status = "waiting";
    this.clearTimers();
    this.winnerId = undefined;
    this.start();
  }

  private assignStartingWord() {
    const all = getAllEmojis();
    const allWords = getAllWords();
    const playable = all.filter((emoji) =>
      hasAvailableFollowUp(emoji.word, this.usedWords, allWords)
    );
    const candidates = playable.length > 0 ? playable : all;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastWord = pick.word;
    this.usedWords.add(pick.word.toUpperCase());
    this.emit("gameStarted", { startingEmoji: pick.emoji, startingWord: pick.word });
  }

  private beginTurn() {
    const ms = turnTimeMs(this.turnCount);
    this.deadline = Date.now() + ms;
    const player = this.currentPlayer();

    this.emit("turnStart", {
      playerId: player.id,
      deadline: this.deadline,
      durationMs: ms,
    });

    this.clearTimers();
    this.timeoutHandle = setTimeout(() => this.handleTimeout(), ms);

    if (player.isBot) {
      this.scheduleBotMove();
    }
  }

  private scheduleBotMove() {
    const delay =
      BOT_MIN_DELAY_MS + Math.random() * (BOT_MAX_DELAY_MS - BOT_MIN_DELAY_MS);
    this.botHandle = setTimeout(() => this.playBotMove(), delay);
  }

  private playBotMove() {
    if (this.status !== "playing") return;
    const allWords = getAllWords();
    const candidates = getAllEmojis().filter((emoji) => {
      const result = checkChain(emoji.word, this.lastWord, this.usedWords);
      return (
        result.valid &&
        hasAvailableFollowUp(emoji.word, this.usedWords, allWords)
      );
    });

    if (candidates.length === 0) {
      this.endGame(this.otherPlayer(this.currentPlayer().id)!.id, "NO_VALID_MOVE");
      return;
    }

    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    this.submitEmoji(this.currentPlayer().id, choice.emoji);
  }

  submitEmoji(playerId: string, emoji: string) {
    if (this.status !== "playing") {
      this.emit("emojiRejected", { playerId, reason: "GAME_NOT_PLAYING" as RejectReason });
      return;
    }

    if (this.currentPlayer().id !== playerId) {
      this.emit("emojiRejected", { playerId, reason: "NOT_YOUR_TURN" as RejectReason });
      return;
    }

    const word = getCanonicalWord(emoji);
    if (!word) {
      this.emit("emojiRejected", { playerId, reason: "UNKNOWN_EMOJI" as RejectReason });
      return;
    }

    const result = checkChain(word, this.lastWord, this.usedWords);
    if (!result.valid) {
      this.emit("emojiRejected", { playerId, reason: result.reason! });
      const winner = this.otherPlayer(playerId);
      if (winner && (result.reason === "WRONG_CHAIN" || result.reason === "WORD_ALREADY_USED")) {
        this.endGame(winner.id, result.reason);
      }
      return;
    }

    if (!hasAvailableFollowUp(word, this.usedWords, getAllWords())) {
      this.emit("emojiRejected", { playerId, reason: "NO_FOLLOW_UP" });
      return;
    }

    this.lastWord = word;
    this.usedWords.add(word.toUpperCase());
    this.turnCount += 1;
    this.clearTimers();

    const nextIndex = (this.currentTurnIndex + 1) % this.players.length;
    this.currentTurnIndex = nextIndex;

    const payload: EmojiConfirmedPayload = {
      emoji,
      word,
      playerId,
      timestamp: Date.now(),
      nextPlayerId: this.players[nextIndex].id,
      deadline: null,
    };
    this.emit("emojiConfirmed", payload);

    this.beginTurn();
  }

  private handleTimeout() {
    if (this.status !== "playing") return;
    const loser = this.currentPlayer();
    const winner = this.otherPlayer(loser.id);
    if (winner) {
      this.endGame(winner.id, "TIME_OUT");
    }
  }

  handleDisconnect(playerId: string) {
    if (this.status !== "playing") return;
    const winner = this.otherPlayer(playerId);
    if (winner) {
      this.endGame(winner.id, "DISCONNECT");
    }
  }

  private endGame(winnerId: string, reason: GameOverPayload["reason"]) {
    this.status = "finished";
    this.winnerId = winnerId;
    this.clearTimers();
    const loser = this.players.find((p) => p.id !== winnerId)!;
    const payload: GameOverPayload = { winnerId, loserId: loser.id, reason };
    this.emit("gameOver", payload);
  }

  private clearTimers() {
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    if (this.botHandle) clearTimeout(this.botHandle);
    this.timeoutHandle = null;
    this.botHandle = null;
  }

  destroy() {
    this.clearTimers();
    this.removeAllListeners();
  }
}

export function generatePlayerId(): string {
  return randomUUID();
}
