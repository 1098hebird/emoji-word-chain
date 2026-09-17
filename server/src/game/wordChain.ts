export type RejectReason =
  | "NOT_YOUR_TURN"
  | "GAME_NOT_PLAYING"
  | "UNKNOWN_EMOJI"
  | "WRONG_CHAIN"
  | "WORD_ALREADY_USED"
  | "NO_FOLLOW_UP"
  | "TIME_OUT";

export interface ChainCheckResult {
  valid: boolean;
  reason?: RejectReason;
}

export function checkChain(
  nextWord: string,
  lastWord: string | null,
  usedWords: ReadonlySet<string>
): ChainCheckResult {
  const word = nextWord.toUpperCase();

  if (usedWords.has(word)) {
    return { valid: false, reason: "WORD_ALREADY_USED" };
  }

  if (lastWord === null) {
    return { valid: true };
  }

  const requiredFirstLetter = lastWord.toUpperCase().slice(-1);
  const actualFirstLetter = word.charAt(0);

  if (requiredFirstLetter !== actualFirstLetter) {
    return { valid: false, reason: "WRONG_CHAIN" };
  }

  return { valid: true };
}

export function hasAvailableFollowUp(
  word: string,
  usedWords: ReadonlySet<string>,
  allWords: readonly string[]
): boolean {
  const candidate = word.toUpperCase();
  const lastChar = candidate.slice(-1);

  return allWords.some((nextWord) => {
    const normalized = nextWord.toUpperCase();
    return (
      normalized.charAt(0) === lastChar &&
      normalized !== candidate &&
      !usedWords.has(normalized)
    );
  });
}
