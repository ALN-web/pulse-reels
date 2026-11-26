import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadBrand } from "../src/lib/io.js";
import { insideSafeZone, SAFE_RECT } from "../src/lib/safezones.js";
import { ScriptSchema, StoryboardSchema, WordsSchema, scriptToVoiceover } from "../src/schemas/index.js";

const fx = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/heart-habit/${f}`, import.meta.url), "utf8"));

describe("schemas", () => {
  it("brand file is valid", () => {
    expect(loadBrand("pulse-health").character.id).toBe("dr-ira-v1");
  });

  it("rejects a hook longer than 3 seconds", () => {
    const s = fx("script.json");
    s.hook.estimatedSec = 4.5;
    expect(ScriptSchema.safeParse(s).success).toBe(false);
  });

  it("storyboard lines add up to the script's voiceover", () => {
    const script = ScriptSchema.parse(fx("script.json"));
    const sb = StoryboardSchema.parse(fx("storyboard.json"));
    const spoken = sb.scenes.map((s) => s.line).filter(Boolean).join(" ");
    expect(spoken).toBe(scriptToVoiceover(script));
  });

  it("rejects a storyboard outside 30-60 s", () => {
    const sb = fx("storyboard.json");
    sb.scenes = sb.scenes.slice(0, 3);
    expect(StoryboardSchema.safeParse(sb).success).toBe(false);
  });

  it("rejects character shots in motion mode", () => {
    const sb = fx("storyboard.json");
    sb.mode = "motion";
    expect(StoryboardSchema.safeParse(sb).success).toBe(false);
  });

  it("rejects out-of-order word timestamps", () => {
    const bad = {
      audioFile: "voice.mp3",
      durationSec: 2,
      provider: "test",
      words: [
        { word: "b", start: 0.5, end: 0.8 },
        { word: "a", start: 0.1, end: 0.4 },
      ],
    };
    expect(WordsSchema.safeParse(bad).success).toBe(false);
  });
});

describe("safe zones", () => {
  it("accepts a centred caption box and rejects one in the bottom UI area", () => {
    expect(insideSafeZone({ x: 100, y: 1200, width: 800, height: 200 })).toBe(true);
    expect(insideSafeZone({ x: 100, y: 1650, width: 800, height: 150 })).toBe(false);
    expect(SAFE_RECT.width).toBe(870);
  });
});
