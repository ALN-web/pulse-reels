import type { Brand } from "../schemas/brand.js";
import type { Script } from "../schemas/script.js";
import type { Storyboard } from "../schemas/storyboard.js";
import type { Words } from "../schemas/words.js";
import { SAFE_RECT } from "../lib/safezones.js";
import { normToken } from "../voice/align.js";
import { sceneTimings, type SceneTiming } from "./timing.js";
import { mouthKeys } from "./visemes.js";
import { captionCss, captionJs, captionLines, captionMarkup, type CaptionLine } from "./captions.js";

export interface BuildInput {
  brand: Brand;
  script: Script;
  storyboard: Storyboard;
  words: Words;
  /** Contents of the locked character SVG (character mode). */
  characterSvg?: string;
  /** Optional per-scene fragments: runs/<slug>/scenes/<id>.html (markup + one <script>). */
  fragments: Record<string, string>;
  /** Burn word-synced captions into the composition (caption step). */
  captions?: boolean;
  /** Visual style theme for this Reel (clients/<client>/styles/<styleId>.css), applied after the base CSS. */
  styleCss?: string;
}

export interface BuildResult {
  html: string;
  timings: SceneTiming[];
  durationSec: number;
  captionLines: CaptionLine[];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Split a fragment into markup and script, and check every w("token") it uses exists in the scene. */
export function parseFragment(id: string, src: string, scene: SceneTiming): { markup: string; script: string } {
  const scripts = [...src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const markup = src.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").trim();
  const script = scripts.join("\n");
  const sceneTokens = scene.words.map((w) => normToken(w.word));
  for (const m of script.matchAll(/\bw\(\s*["']([^"']+)["']\s*(?:,\s*(\d+))?\)/g)) {
    const tok = normToken(m[1]);
    const nth = Number(m[2] ?? 1);
    if (sceneTokens.filter((t) => t === tok).length < nth) {
      throw new Error(`scenes/${id}.html uses w("${m[1]}"${m[2] ? `, ${m[2]}` : ""}) but scene ${id} doesn't say it`);
    }
  }
  return { markup, script };
}

/** Deterministic blink times (no Math.random in compositions). */
function blinkTimes(total: number): number[] {
  const gaps = [3.4, 2.7, 4.1, 3.0, 3.8, 2.5];
  const out: number[] = [];
  for (let t = 1.3, i = 0; t < total - 0.3; t += gaps[i++ % gaps.length]) out.push(Math.round(t * 1000) / 1000);
  return out;
}

export function buildComposition(input: BuildInput): BuildResult {
  const { brand, script, storyboard, words, characterSvg, fragments, captions = false } = input;
  const lines = captions ? captionLines(words.words, brand.captionStyle.maxWordsPerLine) : [];
  const timings = sceneTimings(storyboard, words);
  const total = timings[timings.length - 1].end;
  const p = brand.palette;
  const isCharacter = storyboard.mode === "character";
  if (isCharacter && !characterSvg) throw new Error("character mode needs the character SVG");

  const sceneById = new Map(storyboard.scenes.map((s) => [s.id, s]));
  const charScenes = timings.filter((t) => t.shot === "character");
  const charWords = charScenes.flatMap((t) => t.words);
  const sources = [...new Set(script.sources.map((s) => s.publisher))].join(" · ");

  const sceneHtml: string[] = [];
  const sceneJs: string[] = [];
  for (const t of timings) {
    const s = sceneById.get(t.id)!;
    const dur = Math.round((t.end - t.start) * 1000) / 1000;
    let body = "";
    if (s.shot === "disclaimer") {
      body = `
      <div class="endcard">
        <div class="wordmark"><svg viewBox="0 0 120 40" class="pulse"><path d="M2 22 H34 L44 6 L56 36 L66 14 L74 22 H118" fill="none" stroke="${p.primary}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(brand.name)}</div>
        <p class="disclaimer">${esc(brand.compliance.disclaimer)}</p>
        <p class="sources">Sources: ${esc(sources)}</p>
      </div>`;
      sceneJs.push(`tl.from(${JSON.stringify(`#scene-${t.id} .endcard > *`)}, { opacity: 0, y: 30, duration: 0.35, stagger: 0.12, ease: "power2.out" }, ${t.start});`);
    } else {
      const frag = fragments[t.id] ? parseFragment(t.id, fragments[t.id], t) : undefined;
      if (s.onScreenText) body += `\n      <h1 class="headline">${esc(s.onScreenText)}</h1>`;
      if (frag?.markup) body += `\n      <div class="visual">${frag.markup}</div>`;
      if (s.onScreenText) {
        sceneJs.push(`tl.from(${JSON.stringify(`#scene-${t.id} .headline`)}, { opacity: 0, y: 40, duration: 0.35, ease: "power2.out" }, ${t.start});`);
      }
      if (frag?.script) {
        const sceneWords = t.words.map((w) => [normToken(w.word), w.start]);
        sceneJs.push(`(function (tl, t, d, w, q, qa, ira) {\n${frag.script}\n})(tl, ${t.start}, ${dur}, wordAt(${JSON.stringify(sceneWords)}, ${t.start}), (s) => document.querySelector(${JSON.stringify(`#scene-${t.id} `)} + s), (s) => document.querySelectorAll(${JSON.stringify(`#scene-${t.id} `)} + s), ira);`);
      }
    }
    sceneHtml.push(`    <section id="scene-${t.id}" class="clip scene shot-${s.shot} style-${storyboard.styleId}" data-start="${t.start}" data-duration="${dur}" data-track-index="1">${body}\n    </section>`);
  }

  // Character visibility: shown only during character scenes; hand reset at each of them.
  const iraJs = isCharacter
    ? [
        // Frame-0 state must be set outside the timeline (a tl.set at 0 doesn't render at 0).
        `gsap.set("#ira", { autoAlpha: ${timings[0].shot === "character" ? 1 : 0} });`,
        `gsap.set("#ira .ira-hand", { opacity: 0, y: 140, rotation: 0 });`,
        ...timings.filter((t) => t.start > 0).map((t) =>
          t.shot === "character"
            ? `tl.set("#ira", { autoAlpha: 1 }, ${t.start}); tl.set("#ira .ira-hand", { opacity: 0, y: 140, rotation: 0 }, ${t.start});`
            : `tl.set("#ira", { autoAlpha: 0 }, ${t.start});`,
        ),
        `const MOUTH = ${JSON.stringify(mouthKeys(charWords))};`,
        `for (const [mt, ms] of MOUTH) if (mt > 0) tl.set("#ira", { attr: { "data-mouth": ms } }, mt);`,
        `for (const bt of ${JSON.stringify(blinkTimes(total))}) { tl.to("#ira .ira-eyes", { scaleY: 0.1, svgOrigin: "400 458", duration: 0.06 }, bt); tl.to("#ira .ira-eyes", { scaleY: 1, svgOrigin: "400 458", duration: 0.08 }, bt + 0.07); }`,
        `tl.to("#ira .ira-body", { scaleY: 1.008, svgOrigin: "400 1100", duration: 2.2, repeat: ${Math.ceil(total / 2.2)}, yoyo: true, ease: "sine.inOut" }, 0);`,
        // small head motion on every third spoken word of a character scene
        ...charWords
          .filter((_, i) => i % 3 === 0)
          .map((w, i) => `tl.to("#ira .ira-head", { rotation: ${i % 2 ? -1.2 : 1.5}, svgOrigin: "400 760", duration: 0.32, ease: "sine.inOut" }, ${w.start});`),
      ].join("\n      ")
    : "";

  const sr = SAFE_RECT;
  const html = `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <!-- GENERATED by src/render/build.ts from storyboard.json + words.json. Edit the storyboard/fragments, not this file. -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(brand.fonts.display)}:opsz,wght@9..144,600;9..144,700&family=${encodeURIComponent(brand.fonts.body)}:wght@500;700;800&display=block" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {
${Object.entries(p).map(([k, v]) => `        --${k}: ${v};`).join("\n")}
        --font-display: "${brand.fonts.display}", Georgia, serif;
        --font-body: "${brand.fonts.body}", system-ui, sans-serif;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--ground); }
      #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: var(--ground); font-family: var(--font-body); color: var(--ink); }
      .clip { position: absolute; inset: 0; }
      .scene { z-index: 2; }
      /* Safe area for key text: x ${sr.x}-${sr.x + sr.width}, y ${sr.y}-${sr.y + sr.height} */
      .headline {
        position: absolute; left: ${sr.x}px; width: ${sr.width}px; top: ${sr.y + 40}px;
        font-family: var(--font-display); font-weight: 700; font-size: 88px; line-height: 1.05;
        letter-spacing: -0.02em; text-align: center; text-wrap: balance; color: var(--ink);
      }
      .visual { position: absolute; left: ${sr.x}px; width: ${sr.width}px; top: 470px; height: 860px; }
      .shot-motion { background: var(--ground); }
      #ira { position: absolute; z-index: 1; left: 40px; top: 540px; width: 1000px; height: 1375px; visibility: hidden; }
      #ira .halo { position: absolute; left: 90px; top: 160px; width: 820px; height: 820px; border-radius: 50%; background: var(--soft); }
      #ira svg.ira-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
      #ira .ira-mouth .m { display: none; }
      #ira[data-mouth="X"] .m-X, #ira[data-mouth="A"] .m-A, #ira[data-mouth="B"] .m-B, #ira[data-mouth="C"] .m-C,
      #ira[data-mouth="D"] .m-D, #ira[data-mouth="E"] .m-E, #ira[data-mouth="F"] .m-F { display: inline; }
      .shot-disclaimer { background: var(--ground); }
      .endcard { position: absolute; left: ${sr.x}px; width: ${sr.width}px; top: 50%; transform: translateY(-50%); text-align: center; }
      .wordmark { font-family: var(--font-display); font-weight: 700; font-size: 84px; color: var(--primary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .wordmark .pulse { width: 220px; height: 74px; }
      .disclaimer { margin-top: 56px; font-size: 46px; font-weight: 700; line-height: 1.25; color: var(--ink); text-wrap: balance; }
      .sources { margin-top: 28px; font-size: 38px; font-weight: 500; color: var(--ink); }${captions ? captionCss(brand) : ""}
      /* ---- style: ${esc(storyboard.styleId)} ---- */
${input.styleCss ?? ""}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1080" data-height="1920">
      <audio id="vo" class="clip" src="${words.audioFile}" data-start="0" data-duration="${words.durationSec}" data-track-index="0"></audio>
${isCharacter ? `      <div id="ira" data-mouth="X"><div class="halo"></div>${characterSvg!.replace(/<\?xml[^>]*>/, "").trim()}</div>` : ""}
${sceneHtml.join("\n")}
${captions ? captionMarkup(lines) : ""}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      /** w("word", n) -> absolute time the nth occurrence of that word starts in this scene. */
      function wordAt(list, fallback) {
        const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (tok, n = 1) => { const k = norm(tok); const hit = list.filter((x) => x[0] === k)[n - 1]; return hit ? hit[1] : fallback; };
      }
      /** Character helpers for scene fragments. */
      const ira = {
        hand(at, kind = "five") {
          tl.to("#ira .ira-hand", { opacity: 1, y: 0, duration: 0.28, ease: "back.out(1.6)" }, at);
          if (kind === "wave") tl.to("#ira .ira-hand", { rotation: 12, svgOrigin: "690 1000", duration: 0.18, repeat: 3, yoyo: true, ease: "sine.inOut" }, at + 0.28);
        },
        handDown(at) { tl.to("#ira .ira-hand", { opacity: 0, y: 140, duration: 0.22, ease: "power2.in" }, at); },
      };
      ${iraJs}
      ${sceneJs.join("\n      ")}
      ${captions ? captionJs(lines, brand) : ""}
      tl.set({}, {}, ${total});
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  return { html, timings, durationSec: total, captionLines: lines };
}
