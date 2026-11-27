import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadBrand, readJson, ROOT, runDir } from "../lib/io.js";
import { SYNC_TOLERANCE_MS } from "../schemas/common.js";
import { RunLogSchema } from "../schemas/run.js";
import { ScriptSchema } from "../schemas/script.js";
import { StoryboardSchema } from "../schemas/storyboard.js";
import { WordsSchema } from "../schemas/words.js";
import { hasFfmpeg, normalizeLoudness } from "../voice/loudness.js";
import { buildComposition } from "./build.js";
import { captionDriftMs } from "./captions.js";
import { maxCutDriftMs } from "./timing.js";

export interface RenderOptions {
  captions: boolean;
  /** Output file name inside runs/<slug>/ (render.mp4 or reel.mp4). */
  output: string;
  snapshot?: boolean;
  buildOnly?: boolean;
  draft?: boolean;
}

// Run the pinned CLI through node directly: no shell, so paths with spaces are safe on Windows.
const HF = join(ROOT, "node_modules", "hyperframes", "bin", "hyperframes.mjs");

/** Build the HyperFrames composition for a run and (optionally) lint, snapshot or render it. Returns notes for run.json. */
export function renderRun(slug: string, o: RenderOptions): string {
  const dir = runDir(slug);
  const comp = join(dir, "composition");
  const hyperframes = (args: string[]) => {
    const r = spawnSync(process.execPath, [HF, ...args], { cwd: comp, stdio: "inherit" });
    if (r.status !== 0) throw new Error(`hyperframes ${args[0]} failed (exit ${r.status})`);
  };

  const run = readJson(join(dir, "run.json"), RunLogSchema);
  const brand = loadBrand(run.client);
  const script = readJson(join(dir, "script.json"), ScriptSchema);
  const storyboard = readJson(join(dir, "storyboard.json"), StoryboardSchema);
  const words = readJson(join(dir, "words.json"), WordsSchema);

  const fragDir = join(dir, "scenes");
  const fragments: Record<string, string> = {};
  if (existsSync(fragDir)) {
    for (const f of readdirSync(fragDir).filter((f) => f.endsWith(".html"))) {
      fragments[f.replace(/\.html$/, "")] = readFileSync(join(fragDir, f), "utf8");
    }
  }
  const characterSvg = storyboard.mode === "character" ? readFileSync(join(ROOT, brand.character.rig), "utf8") : undefined;

  const stylePath = join(ROOT, "clients", run.client, "styles", `${storyboard.styleId}.css`);
  const styleCss = existsSync(stylePath) ? readFileSync(stylePath, "utf8") : undefined;
  if (!styleCss) console.log(`style "${storyboard.styleId}": no clients/${run.client}/styles/${storyboard.styleId}.css, using base look`);

  const built = buildComposition({ brand, script, storyboard, words, characterSvg, fragments, captions: o.captions, styleCss });
  const cutDrift = maxCutDriftMs(built.timings);
  if (cutDrift > SYNC_TOLERANCE_MS) throw new Error(`scene cut drifts ${cutDrift.toFixed(0)} ms from its word (max ${SYNC_TOLERANCE_MS})`);
  const capDrift = o.captions ? captionDriftMs(built.captionLines, words.words) : 0;
  if (capDrift > SYNC_TOLERANCE_MS) throw new Error(`caption drifts ${capDrift.toFixed(0)} ms from its word (max ${SYNC_TOLERANCE_MS})`);

  mkdirSync(comp, { recursive: true });
  writeFileSync(join(comp, "index.html"), built.html);
  copyFileSync(join(dir, words.audioFile), join(comp, words.audioFile));
  writeFileSync(join(comp, "meta.json"), JSON.stringify({ id: slug, name: slug }, null, 2) + "\n");
  writeFileSync(
    join(comp, "hyperframes.json"),
    JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" } }, null, 2) + "\n",
  );
  const sync = `cut drift ${cutDrift.toFixed(0)} ms${o.captions ? `, caption drift ${capDrift.toFixed(0)} ms (${built.captionLines.length} lines)` : ""}`;
  console.log(`composition: ${built.timings.length} scenes, ${built.durationSec.toFixed(2)} s, ${sync}`);
  console.log(built.timings.map((t) => `  ${t.id.padEnd(4)} ${t.shot.padEnd(10)} ${t.start.toFixed(2)}-${t.end.toFixed(2)}${Object.hasOwn(fragments, t.id) ? "  [fragment]" : ""}`).join("\n"));

  if (o.buildOnly) return `build only; ${sync}`;
  hyperframes(["lint", "."]);

  if (o.snapshot) {
    const at = built.timings.map((t) => ((t.start + t.end) / 2).toFixed(2)).join(",");
    hyperframes(["snapshot", "--at", at]);
    return `snapshot at ${at}; ${sync}`;
  }

  if (!hasFfmpeg()) throw new Error("ffmpeg is not on PATH; cannot encode the MP4");
  hyperframes(["render", "-o", `../${o.output}`, ...(o.draft ? ["-q", "draft"] : [])]);
  // HyperFrames' audio mix changes loudness; bring the final file back to the brand target (~-14 LUFS).
  const lufs = normalizeLoudness(join(dir, o.output), brand.voice.loudnessLufs);
  console.log(`${o.output}: runs/${slug}/${o.output} (audio ${lufs.before.toFixed(1)} -> ${lufs.after.toFixed(1)} LUFS)`);
  return `${built.durationSec.toFixed(1)} s, ${built.timings.length} scenes, ${sync}, audio ${lufs.after.toFixed(1)} LUFS${o.draft ? ", draft" : ""}`;
}
