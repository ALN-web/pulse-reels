import type { Brand } from "../schemas/brand.js";
import type { Word } from "../schemas/words.js";
import { SAFE_RECT, type Box } from "../lib/safezones.js";

export interface CaptionLine {
  start: number;
  /** When the line disappears: next line's start, or shortly after its last word in a pause. */
  end: number;
  words: Array<{ text: string; start: number }>;
}

const MAX_CHARS = 22; // ~one line at 64px Inter 800 inside the 870px safe width
const PAUSE_BREAK_SEC = 0.3;
const HOLD_AFTER_SEC = 0.35;

/** Caption text for a word: drop trailing . , ; : (kept: ? ! ' -). */
export const captionText = (w: string) => w.replace(/[.,;:]+$/, "");

/** Group words into short caption lines that break at punctuation, pauses and length. */
export function captionLines(words: Word[], maxWords: number): CaptionLine[] {
  // 1. Phrases: break at punctuation and at pauses in the voice.
  const phrases: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    if (!next || /[.,;:?!]$/.test(w.word) || next.start - w.end > PAUSE_BREAK_SEC) {
      phrases.push(cur);
      cur = [];
    }
  });
  // 2. Split each phrase into the fewest lines that fit, balanced by word count (no one-word orphans).
  const chars = (ws: Word[]) => ws.map((w) => captionText(w.word)).join(" ").length;
  const lines: CaptionLine[] = [];
  for (const p of phrases) {
    let n = Math.ceil(p.length / maxWords);
    let parts: Word[][];
    for (;;) {
      parts = Array.from({ length: n }, (_, k) => p.slice(Math.round((k * p.length) / n), Math.round(((k + 1) * p.length) / n)));
      if (parts.every((x) => x.length <= maxWords && (chars(x) <= MAX_CHARS || x.length === 1)) || n >= p.length) break;
      n++;
    }
    for (const x of parts) lines.push({ start: x[0].start, end: x[x.length - 1].end, words: x.map((w) => ({ text: captionText(w.word), start: w.start })) });
  }
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  return lines.map((l, i) => {
    const next = lines[i + 1];
    const end = next ? Math.min(next.start, l.end + HOLD_AFTER_SEC) : l.end + HOLD_AFTER_SEC;
    return { ...l, start: r3(l.start), end: r3(Math.max(end, l.start + 0.25)) };
  });
}

/** Caption band: lower third, above Instagram's bottom UI. */
export const CAPTION_BOX: Box = { x: SAFE_RECT.x, y: 1330, width: SAFE_RECT.width, height: 150 };

export function captionCss(brand: Brand): string {
  const c = brand.captionStyle;
  const b = CAPTION_BOX;
  return `
      #captions { position: absolute; z-index: 5; left: ${b.x}px; top: ${b.y}px; width: ${b.width}px; height: ${b.height}px; }
      #captions .cl { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); display: flex; justify-content: center; visibility: hidden; }
      #captions .cl > span.box { display: inline-block; padding: 14px 30px 18px; border-radius: 24px; background: ${c.background};
        font-family: "${c.fontFamily}", system-ui, sans-serif; font-weight: ${c.fontWeight}; font-size: ${c.fontSizePx}px; line-height: 1.1;
        color: ${c.color}; white-space: nowrap; box-shadow: 0 10px 28px rgba(0,0,0,.18); }
      #captions .cw { display: inline-block; }`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function captionMarkup(lines: CaptionLine[]): string {
  return `      <div id="captions">\n${lines
    .map((l, i) => `        <div class="cl" id="cl${i}"><span class="box">${l.words.map((w, k) => `<span class="cw" id="cw${i}_${k}">${esc(w.text)}</span>`).join(" ")}</span></div>`)
    .join("\n")}\n      </div>`;
}

/** Timeline code: show each line, highlight each word exactly at its spoken start. */
export function captionJs(lines: CaptionLine[], brand: Brand): string {
  const c = brand.captionStyle;
  const out: string[] = [];
  lines.forEach((l, i) => {
    const show = (v: number) => `{ autoAlpha: ${v} }`;
    // frame-0 state can't come from a tl.set at 0
    out.push(l.start === 0 ? `gsap.set("#cl${i}", ${show(1)});` : `tl.set("#cl${i}", ${show(1)}, ${l.start});`);
    out.push(`tl.from("#cl${i} .box", { scale: 0.92, duration: 0.12, ease: "power2.out" }, ${l.start});`);
    out.push(`tl.set("#cl${i}", ${show(0)}, ${l.end});`);
    l.words.forEach((w, k) => {
      const nextStart = l.words[k + 1]?.start ?? l.end;
      if (w.start === 0) out.push(`gsap.set("#cw${i}_${k}", { color: "${c.highlightColor}" });`);
      else out.push(`tl.set("#cw${i}_${k}", { color: "${c.highlightColor}" }, ${w.start});`);
      out.push(`tl.set("#cw${i}_${k}", { color: "${c.color}" }, ${nextStart});`);
    });
  });
  return out.join("\n      ");
}

/** Worst gap between a word being spoken and its caption highlight (brief: <= 80 ms). By construction 0. */
export function captionDriftMs(lines: CaptionLine[], words: Word[]): number {
  const flat = lines.flatMap((l) => l.words);
  if (flat.length !== words.length) throw new Error(`captions have ${flat.length} words, voice has ${words.length}`);
  return Math.max(0, ...flat.map((w, i) => Math.abs(w.start - words[i].start) * 1000));
}
