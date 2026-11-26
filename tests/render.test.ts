import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildComposition, parseFragment } from "../src/render/build.js";
import { maxCutDriftMs, sceneTimings } from "../src/render/timing.js";
import { mouthKeys, wordShapes } from "../src/render/visemes.js";
import { loadBrand } from "../src/lib/io.js";
import { ScriptSchema, StoryboardSchema, scriptToVoiceover, type Words } from "../src/schemas/index.js";

const fx = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/heart-habit/${f}`, import.meta.url), "utf8"));
const script = ScriptSchema.parse(fx("script.json"));
const storyboard = StoryboardSchema.parse(fx("storyboard.json"));

/** Fake TTS timings: 0.3 s per word, 0.05 s gaps. */
function fakeWords(): Words {
  const tokens = scriptToVoiceover(script).split(/\s+/);
  const words = tokens.map((word, i) => ({ word, start: +(i * 0.35).toFixed(3), end: +(i * 0.35 + 0.3).toFixed(3) }));
  return { audioFile: "voice.mp3", durationSec: words.at(-1)!.end + 0.25, provider: "test", words };
}

describe("sceneTimings", () => {
  const words = fakeWords();
  const t = sceneTimings(storyboard, words);

  it("starts each spoken scene exactly on its first word (0 ms drift)", () => {
    expect(maxCutDriftMs(t)).toBe(0);
    expect(t[0].start).toBe(0);
  });

  it("scenes are contiguous and the silent end card follows the voice", () => {
    t.slice(1).forEach((s, i) => expect(s.start).toBe(t[i].end));
    const last = t.at(-1)!;
    expect(last.shot).toBe("disclaimer");
    expect(last.start).toBeCloseTo(words.durationSec, 3);
  });

  it("refuses a storyboard whose lines don't match the voice", () => {
    const bad = structuredClone(storyboard);
    bad.scenes[1].line = bad.scenes[1].line.replace("brisk", "slow");
    expect(() => sceneTimings(bad, words)).toThrow(/does not match/);
  });
});

describe("visemes", () => {
  it("maps letters to mouth shapes", () => {
    expect(wordShapes("map")).toEqual(["A", "D", "A"]);
    expect(wordShapes("five")).toEqual(["F", "C", "F", "C"]);
  });

  it("never switches faster than 60 ms and ends at rest", () => {
    const keys = mouthKeys([{ word: "extraordinary", start: 0, end: 0.2 }]);
    const shapes = keys.filter(([, s]) => s !== "X");
    expect(shapes.length).toBeLessThanOrEqual(3);
    expect(keys.at(-1)).toEqual([0.2, "X"]);
  });
});

describe("buildComposition", () => {
  const brand = loadBrand("pulse-health");
  const svg = readFileSync(new URL("../clients/pulse-health/character/dr-ira.svg", import.meta.url), "utf8");

  it("builds one locked character layer and one clip per scene", () => {
    const { html } = buildComposition({ brand, script, storyboard, words: fakeWords(), characterSvg: svg, fragments: {} });
    expect(html.match(/data-character="dr-ira-v1"/g)).toHaveLength(1);
    expect(html.match(/class="clip scene/g)).toHaveLength(storyboard.scenes.length);
    expect(html).toContain("Not medical advice");
    expect(html).not.toMatch(/Math\.random|Date\.now/);
  });

  it("rejects a fragment that syncs to a word the scene doesn't say", () => {
    const t = sceneTimings(storyboard, fakeWords())[0];
    expect(() => parseFragment("s1", `<div></div><script>tl.to(q("div"), {}, w("banana"));</script>`, t)).toThrow(/banana/);
    expect(() => parseFragment("s1", `<script>tl.to(q("div"), {}, w("five"));</script>`, t)).not.toThrow();
  });
});
