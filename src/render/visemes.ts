import type { Word } from "../schemas/words.js";

/**
 * Text-driven lip sync. Each word's letters map to a mouth shape (Rhubarb-style names):
 *   X rest · A closed (m b p) · B slight (most consonants) · C open (e i) · D wide (a) · E round (o u w) · F teeth on lip (f v)
 * Shapes are spread evenly across the word's real start..end time from the TTS alignment.
 */
export type Mouth = "X" | "A" | "B" | "C" | "D" | "E" | "F";
export type MouthKey = [time: number, shape: Mouth];

const MIN_SHAPE_SEC = 0.06; // never switch faster than ~16 fps: looks like flicker
const REST_GAP_SEC = 0.12; // close the mouth when the voice pauses longer than this

function letterShape(ch: string): Mouth {
  if ("mbp".includes(ch)) return "A";
  if ("fv".includes(ch)) return "F";
  if ("a".includes(ch)) return "D";
  if ("ei".includes(ch)) return "C";
  if ("ouwy".includes(ch)) return "E";
  return "B";
}

export function wordShapes(word: string): Mouth[] {
  const letters = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!letters) return ["B"];
  if (/^\d+$/.test(letters)) return ["D", "B", "C", "E"]; // numbers are said as several syllables
  const out: Mouth[] = [];
  for (const ch of letters) {
    const s = letterShape(ch);
    if (out[out.length - 1] !== s) out.push(s);
  }
  return out;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function mouthKeys(words: Word[]): MouthKey[] {
  const keys: MouthKey[] = [];
  words.forEach((w, i) => {
    const dur = Math.max(0, w.end - w.start);
    let shapes = wordShapes(w.word);
    const fit = Math.max(1, Math.floor(dur / MIN_SHAPE_SEC));
    if (shapes.length > fit) {
      // keep an evenly spaced subset so fast words still read as speech
      shapes = Array.from({ length: fit }, (_, k) => shapes[Math.floor((k * shapes.length) / fit)]);
    }
    const step = dur / shapes.length;
    shapes.forEach((s, k) => keys.push([r3(w.start + k * step), s]));
    const next = words[i + 1];
    if (!next || next.start - w.end > REST_GAP_SEC) keys.push([r3(w.end), "X"]);
  });
  // drop repeats
  return keys.filter((k, i) => i === 0 || k[1] !== keys[i - 1][1]);
}
