import { describe, expect, it } from "vitest";
import { WordsSchema } from "../src/schemas/words.js";
import { alignmentToWords, compareToScript, type CharAlignment } from "../src/voice/align.js";

/** Fake ElevenLabs alignment: each char 0.05 s, spaces 0.05 s. */
function fakeAlignment(text: string): CharAlignment {
  const characters = [...text];
  return {
    characters,
    character_start_times_seconds: characters.map((_, i) => i * 0.05),
    character_end_times_seconds: characters.map((_, i) => (i + 1) * 0.05),
  };
}

describe("alignmentToWords", () => {
  const text = "Your heart wants five minutes. Today.";
  const words = alignmentToWords(fakeAlignment(text));

  it("splits on spaces and keeps punctuation attached", () => {
    expect(words.map((w) => w.word)).toEqual(["Your", "heart", "wants", "five", "minutes.", "Today."]);
  });

  it("uses first-char start and last-char end", () => {
    expect(words[0]).toEqual({ word: "Your", start: 0, end: 0.2 });
    expect(words[1]).toEqual({ word: "heart", start: 0.25, end: 0.5 });
  });

  it("produces a valid words.json", () => {
    const r = WordsSchema.safeParse({ audioFile: "voice.mp3", durationSec: 2, provider: "test", words });
    expect(r.success).toBe(true);
  });

  it("ignores repeated whitespace", () => {
    expect(alignmentToWords(fakeAlignment("a  b\n c")).map((w) => w.word)).toEqual(["a", "b", "c"]);
  });

  it("rejects mismatched arrays", () => {
    const a = fakeAlignment("hi");
    a.character_end_times_seconds.pop();
    expect(() => alignmentToWords(a)).toThrow();
  });
});

describe("compareToScript", () => {
  it("accepts the same words with different punctuation/case", () => {
    const words = alignmentToWords(fakeAlignment("Brisk means you can still talk but not sing"));
    expect(compareToScript(words, "Brisk means you can still talk, but not sing.")).toBeNull();
  });

  it("reports a dropped word", () => {
    const words = alignmentToWords(fakeAlignment("Save this and take your walk"));
    expect(compareToScript(words, "Save this, and take your five-minute walk")).toMatch(/word count/);
  });
});
