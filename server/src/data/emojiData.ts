import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

interface RawData {
  categories: RawCategory[];
}

function nameToWord(cldrName: string): string {
  return cldrName
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const localAsset = path.join(__dirname, "emojiData.json");
const sharedAsset = path.resolve(__dirname, "../../../shared-emoji-data.json");
const dataPath = __dirname.includes(`${path.sep}dist${path.sep}`)
  ? localAsset
  : sharedAsset;
const raw: RawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

export const CATEGORIES: Category[] = raw.categories.map((c) => ({
  id: c.id,
  name: c.name,
  emojis: c.emojis.map((e) => ({
    emoji: e.emoji,
    word: e.word ?? nameToWord(e.cldrName ?? ""),
  })),
}));

export const EMOJI_TO_WORD: Map<string, string> = new Map();
const seenWords = new Map<string, string>();
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
