// The shared JSON file is the single source of truth for emoji words.
// Vite bundles it into the client, so no separate client copy is needed.
import raw from "../../../shared-emoji-data.json";

export interface EmojiEntry {
  emoji: string;
  word: string;
}

export interface Category {
  id: string;
  name: string;
  emojis: EmojiEntry[];
}

interface RawEmojiEntry {
  emoji: string;
  cldrName?: string;
  // Optional game-specific override. It takes precedence over cldrName,
  // so a word can be corrected without changing the emoji or loader logic.
  word?: string;
}

interface RawCategory {
  id: string;
  name: string;
  emojis: RawEmojiEntry[];
}

// Same derivation rule as the server (server/src/data/emojiData.ts).
// Keep these two in sync if the rule ever changes.
function nameToWord(cldrName: string): string {
  return cldrName.toUpperCase().replace(/[^A-Z]/g, "");
}

// NOTE: 이 데이터는 UI(팝업, 회색 처리)용으로 공유 원본을 직접 읽는다.
// 실제 게임 판정은 항상 서버가 독립적으로 재검증하므로,
// 클라이언트에서 데이터를 조작해도 잘못된 제출은 서버가 emoji:rejected로 되돌린다.
export const CATEGORIES: Category[] = (
  raw as { categories: RawCategory[] }
).categories.map((c) => ({
  id: c.id,
  name: c.name,
  emojis: c.emojis.map((e) => ({
    emoji: e.emoji,
    word: (e.word ?? nameToWord(e.cldrName ?? "")).toUpperCase(),
  })),
}));

export function getAllEmojis(): EmojiEntry[] {
  return CATEGORIES.flatMap((c) => c.emojis);
}

export function getWordFor(emoji: string): string | undefined {
  return getAllEmojis().find((e) => e.emoji === emoji)?.word;
}
