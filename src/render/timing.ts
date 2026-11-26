import type { Storyboard } from "../schemas/storyboard.js";
import type { Word, Words } from "../schemas/words.js";
import { normToken } from "../voice/align.js";

export interface SceneTiming {
  id: string;
  shot: Storyboard["scenes"][number]["shot"];
  start: number;
  end: number;
  words: Word[];
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Real scene timings from the voice. Scene i starts exactly when its first word starts
 * (scene 1 at 0), so every cut is 0 ms from the spoken word. Silent scenes (disclaimer)
 * must come after the last spoken scene and keep their storyboard duration.
 */
export function sceneTimings(sb: Storyboard, words: Words): SceneTiming[] {
  let wi = 0;
  const spoken: Array<{ id: string; shot: SceneTiming["shot"]; words: Word[] }> = [];
  const silent: Storyboard["scenes"] = [];
  for (const s of sb.scenes) {
    const tokens = s.line.split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      silent.push(s);
      continue;
    }
    if (silent.length) throw new Error(`silent scene "${silent[0].id}" must come after all spoken scenes`);
    const chunk = words.words.slice(wi, wi + tokens.length);
    tokens.forEach((t, k) => {
      if (normToken(t) !== normToken(chunk[k]?.word ?? "")) {
        throw new Error(`scene ${s.id}: word "${t}" does not match voice word "${chunk[k]?.word}" (#${wi + k})`);
      }
    });
    spoken.push({ id: s.id, shot: s.shot, words: chunk });
    wi += tokens.length;
  }
  if (wi !== words.words.length) throw new Error(`voice has ${words.words.length - wi} extra words not in the storyboard`);

  const out: SceneTiming[] = spoken.map((s, i) => ({
    ...s,
    start: i === 0 ? 0 : s.words[0].start,
    end: i + 1 < spoken.length ? spoken[i + 1].words[0].start : words.durationSec,
  }));
  let t = words.durationSec;
  for (const s of silent) {
    out.push({ id: s.id, shot: s.shot, start: t, end: t + s.durationSec, words: [] });
    t += s.durationSec;
  }
  return out.map((s) => ({ ...s, start: r3(s.start), end: r3(s.end) }));
}

/** Largest gap between a cut and the first word of the scene it opens (brief: <= 80 ms). */
export function maxCutDriftMs(timings: SceneTiming[]): number {
  return Math.max(0, ...timings.slice(1).filter((s) => s.words.length).map((s) => Math.abs(s.start - s.words[0].start) * 1000));
}
