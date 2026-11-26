import { describe, expect, it } from "vitest";
import { CAPTION_BOX, captionDriftMs, captionJs, captionLines, captionText } from "../src/render/captions.js";
import { insideSafeZone } from "../src/lib/safezones.js";
import { loadBrand } from "../src/lib/io.js";
import type { Word } from "../src/schemas/words.js";

/** Words spaced 0.3 s apart (0.25 s long) so only punctuation creates phrase breaks. */
function words(text: string): Word[] {
  return text.split(" ").map((word, i) => ({ word, start: +(i * 0.3).toFixed(3), end: +(i * 0.3 + 0.25).toFixed(3) }));
}

describe("captionLines", () => {
  it("never exceeds the max words per line and keeps every word, in order", () => {
    const w = words("Regular activity like this can lower your risk of heart disease and stroke.");
    const lines = captionLines(w, 4);
    expect(lines.every((l) => l.words.length <= 4)).toBe(true);
    expect(lines.flatMap((l) => l.words.map((x) => x.text)).join(" ")).toBe(w.map((x) => captionText(x.word)).join(" "));
  });

  it("breaks at punctuation", () => {
    const lines = captionLines(words("Save this, and take your walk."), 4);
    expect(lines[0].words.map((x) => x.text)).toEqual(["Save", "this"]);
  });

  it("balances a phrase instead of leaving a one-word orphan", () => {
    const lines = captionLines(words("here is a brisk five-minute walk"), 4);
    expect(lines.map((l) => l.words.length)).toEqual([3, 3]);
  });

  it("breaks at a pause in the voice", () => {
    const w: Word[] = [
      { word: "So", start: 0, end: 0.2 },
      { word: "start", start: 0.25, end: 0.5 },
      { word: "now", start: 1.2, end: 1.4 },
    ];
    expect(captionLines(w, 4).map((l) => l.words.length)).toEqual([2, 1]);
  });

  it("lines never overlap in time", () => {
    const lines = captionLines(words("one two three four five six seven eight nine ten eleven"), 4);
    lines.slice(1).forEach((l, i) => expect(l.start).toBeGreaterThanOrEqual(lines[i].end));
  });

  it("drops trailing commas and periods but keeps ? and !", () => {
    expect(captionText("today.")).toBe("today");
    expect(captionText("really?")).toBe("really?");
  });
});

describe("caption sync and placement", () => {
  it("highlights each word exactly when it is spoken (0 ms drift)", () => {
    const w = words("Brisk means you can still talk, but not sing.");
    expect(captionDriftMs(captionLines(w, 4), w)).toBe(0);
  });

  it("caption band sits inside the Instagram safe zone", () => {
    expect(insideSafeZone(CAPTION_BOX)).toBe(true);
  });

  it("first line is shown with gsap.set (a timeline set at 0 does not render on frame 0)", () => {
    const js = captionJs(captionLines(words("Five minutes today."), 4), loadBrand("pulse-health"));
    expect(js).toContain('gsap.set("#cl0"');
  });
});
