import type { Word } from "../schemas/words.js";

/** ElevenLabs `alignment`: parallel per-character arrays. */
export interface CharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Group character timings into words. A word runs from its first character's start to its last
 * character's end. Punctuation stays attached ("Today.") so captions can show it.
 */
export function alignmentToWords(a: CharAlignment): Word[] {
  const n = a.characters.length;
  if (n !== a.character_start_times_seconds.length || n !== a.character_end_times_seconds.length) {
    throw new Error("alignment arrays have different lengths");
  }
  const words: Word[] = [];
  let text = "";
  let start = 0;
  let end = 0;
  const flush = () => {
    if (text) words.push({ word: text, start: round(start), end: round(Math.max(end, start)) });
    text = "";
  };
  for (let i = 0; i < n; i++) {
    const ch = a.characters[i];
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    if (!text) start = a.character_start_times_seconds[i];
    text += ch;
    end = a.character_end_times_seconds[i];
  }
  flush();
  return words;
}

/** Normalise a token for comparison: lowercase, letters/digits only. */
export const normToken = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Check the spoken words match the script, token for token. Returns the first mismatch, if any. */
export function compareToScript(words: Word[], scriptText: string): string | null {
  const expected = scriptText.split(/\s+/).filter(Boolean).map(normToken);
  const got = words.map((w) => normToken(w.word));
  if (expected.length !== got.length) return `word count ${got.length} != script ${expected.length}`;
  const i = expected.findIndex((e, k) => e !== got[k]);
  return i === -1 ? null : `word ${i}: got "${words[i].word}", script has "${scriptText.split(/\s+/).filter(Boolean)[i]}"`;
}
