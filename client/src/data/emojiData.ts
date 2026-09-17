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
  word?: string;
}

interface RawCategory {
  id: string;
  name: string;
  emojis: RawEmojiEntry[];
}

function nameToWord(cldrName: string): string {
  return cldrName
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export const CATEGORIES: Category[] = (
  raw as { categories: RawCategory[] }
).categories.map((c) => ({
  id: c.id,
  name: c.name,
  emojis: c.emojis.map((e) => ({
    emoji: e.emoji,
    word: e.word ?? nameToWord(e.cldrName ?? ""),
  })),
}));

export function getAllEmojis(): EmojiEntry[] {
  return CATEGORIES.flatMap((c) => c.emojis);
}

export function getWordFor(emoji: string): string | undefined {
  return getAllEmojis().find((e) => e.emoji === emoji)?.word;
}
