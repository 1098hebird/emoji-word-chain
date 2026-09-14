import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface EmojiEntry {
  emoji: string;
  word: string; // canonical word, always stored uppercase
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

interface RawData {
  categories: RawCategory[];
}

/**
 * Derives the canonical game word from a Unicode CLDR emoji name
 * (e.g. "unicode-emoji-json"'s "name" field), by uppercasing and
 * stripping everything that isn't A-Z. E.g. "red apple" -> "REDAPPLE".
 *
 * Entries that already specify `word` explicitly (currently only Flags,
 * since their CLDR name has a "flag: " prefix that's awkward for
 * word-chain play) bypass this and use the given word as-is.
 */
export function nameToWord(cldrName: string): string {
  return cldrName.toUpperCase().replace(/[^A-Z]/g, "");
}

const raw: RawData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "emojiData.json"), "utf-8")
);

export const CATEGORIES: Category[] = raw.categories.map((c) => ({
  id: c.id,
  name: c.name,
  emojis: c.emojis.map((e) => ({
    emoji: e.emoji,
    word: (e.word ?? nameToWord(e.cldrName ?? "")).toUpperCase(),
  })),
}));

// Flat lookup: emoji -> canonical word. This is the SERVER'S authoritative
// source of truth. Clients may have their own copy for UI purposes, but the
// server never trusts a word sent by the client — it always looks it up here.
export const EMOJI_TO_WORD: Map<string, string> = new Map();
const seenWords = new Map<string, string>(); // word -> first emoji that used it
for (const cat of CATEGORIES) {
  for (const e of cat.emojis) {
    EMOJI_TO_WORD.set(e.emoji, e.word);
    const prevEmoji = seenWords.get(e.word);
    if (prevEmoji && prevEmoji !== e.emoji) {
      console.warn(
        `[emojiData] duplicate canonical word "${e.word}" for ${prevEmoji} and ${e.emoji} — only one will ever be playable.`
      );
    }
    seenWords.set(e.word, e.emoji);
  }
}

export function getCanonicalWord(emoji: string): string | undefined {
  return EMOJI_TO_WORD.get(emoji);
}

export function getAllEmojis(): EmojiEntry[] {
  return CATEGORIES.flatMap((c) => c.emojis);
}
