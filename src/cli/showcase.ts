/**
 * Collect every finished Reel into showcase/data.json and copy the videos to showcase/media/.
 *   npm run showcase
 * A Reel counts as finished when reel.mp4 exists and compliance.json is a passed final check.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readJson, ROOT } from "../lib/io.js";
import { ComplianceReportSchema } from "../schemas/compliance.js";
import { PostSchema } from "../schemas/post.js";
import { RunLogSchema } from "../schemas/run.js";
import { ScriptSchema } from "../schemas/script.js";
import { StoryboardSchema } from "../schemas/storyboard.js";
import { WordsSchema } from "../schemas/words.js";

const out = join(ROOT, "showcase");
mkdirSync(join(out, "media"), { recursive: true });

/** Model cost and turns of a headless run, from the agent's stream log (if it was made with generate.sh). */
function agentStats(dir: string): { usd: number; turns: number } | null {
  let usd = 0, turns = 0, found = false;
  for (const f of readdirSync(dir).filter((f) => /^agent.*\.log$/.test(f))) {
    for (const line of readFileSync(join(dir, f), "utf8").split("\n")) {
      if (!line.includes('"type":"result"')) continue;
      try {
        const m = JSON.parse(line);
        usd += m.total_cost_usd ?? 0;
        turns += m.num_turns ?? 0;
        found = true;
      } catch { /* partial line */ }
    }
  }
  return found ? { usd: Math.round(usd * 100) / 100, turns } : null;
}

const reels = [];
for (const slug of readdirSync(join(ROOT, "runs"))) {
  const dir = join(ROOT, "runs", slug);
  if (!existsSync(join(dir, "reel.mp4")) || !existsSync(join(dir, "compliance.json"))) continue;
  const compliance = readJson(join(dir, "compliance.json"), ComplianceReportSchema);
  if (!compliance.passed || !compliance.final) continue;
  const run = readJson(join(dir, "run.json"), RunLogSchema);
  const script = readJson(join(dir, "script.json"), ScriptSchema);
  const storyboard = readJson(join(dir, "storyboard.json"), StoryboardSchema);
  const words = readJson(join(dir, "words.json"), WordsSchema);
  const post = readJson(join(dir, "post.json"), PostSchema);
  const lastScene = storyboard.scenes.at(-1);
  copyFileSync(join(dir, "reel.mp4"), join(out, "media", `${slug}.mp4`));
  // Poster frame 2.2 s in (hook text and first visual are on screen).
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "2.2", "-i", join(dir, "reel.mp4"), "-frames:v", "1", "-vf", "scale=540:-1", "-q:v", "4", join(out, "media", `${slug}.jpg`)]);
  } catch {
    console.warn(`no poster for ${slug} (ffmpeg missing?)`);
  }
  const step = (name: string) => run.steps.find((s) => s.step === name);
  reels.push({
    slug,
    topic: run.topic,
    mode: run.mode,
    style: storyboard.styleId,
    createdAt: run.createdAt,
    hook: script.hook.text,
    hookPattern: script.hook.pattern,
    seconds: Math.round((words.durationSec + (lastScene?.shot === "disclaimer" ? lastScene.durationSec : 0)) * 10) / 10,
    words: words.words.length,
    scenes: storyboard.scenes.length,
    characterShots: storyboard.scenes.filter((s) => s.shot === "character").length,
    sources: script.sources,
    post: { hook: post.hook, hashtags: post.hashtags },
    machineSec: Math.round(run.steps.reduce((t, s) => t + s.durationMs, 0) / 1000),
    renderSec: Math.round(((step("caption")?.durationMs ?? 0) + (step("render")?.durationMs ?? 0)) / 1000),
    apiUsd: run.steps.reduce((t, s) => t + s.costUsd, 0),
    headless: agentStats(dir),
    checks: compliance.counts,
    mb: Math.round((statSync(join(dir, "reel.mp4")).size / 1e6) * 10) / 10,
  });
}
reels.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const edits = readFileSync(join(ROOT, "EDITS.md"), "utf8").split("\n").filter((l) => /^\| 20\d\d-/.test(l)).length;
// Gallery/link-preview thumbnail (1200x630): five poster frames, alternating modes, on the brand ink.
try {
  type R = { slug: string; mode: string };
  const rs = reels as R[];
  const ch = rs.filter((r) => r.mode === "character"), mo = rs.filter((r) => r.mode === "motion");
  const order = [ch[0], mo[0], ch[1], mo[2], ch[2]].filter((r, i, a): r is R => !!r && a.indexOf(r) === i).slice(0, 5);
  const font = process.platform === "win32" ? "C\\:/Windows/Fonts/arialbd.ttf" : "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  const inputs = order.flatMap((r) => ["-i", join(out, "media", `${r.slug}.jpg`)]);
  const tiles = order.map((_, i) => `[${i + 1}:v]scale=200:356[t${i}]`).join(";");
  let chain = `[0:v]drawtext=fontfile='${font}':text='Pulse Reels':fontcolor=0xF7F4EE:fontsize=64:x=60:y=60,` +
    `drawtext=fontfile='${font}':text='One topic in. A checked, captioned Reel out.':fontcolor=0x9FC3C0:fontsize=28:x=60:y=140[bg]`;
  let prev = "bg";
  order.forEach((_, i) => {
    chain += `;[${prev}][t${i}]overlay=x=${60 + i * 220}:y=220[o${i}]`;
    prev = `o${i}`;
  });
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x12343B:s=1200x630", ...inputs,
    "-filter_complex", `${tiles};${chain}`, "-map", `[${prev}]`, "-frames:v", "1", "-q:v", "3", join(out, "media", "thumb.jpg"),
  ]);
} catch (e) {
  console.warn(`no thumbnail: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
}

const data = { generatedAt: new Date().toISOString(), edits, reels };
writeFileSync(join(out, "data.json"), JSON.stringify(data, null, 2) + "\n");
// Inline the data into the page so it is complete at rest (no fetch on load).
const template = readFileSync(join(out, "template.html"), "utf8");
writeFileSync(join(out, "index.html"), template.replace("__REEL_DATA__", () => JSON.stringify(data).replace(/</g, "\\u003c")));
// README table between the reels markers.
const fmt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`);
const rows = reels.map((r) =>
  `| ${r.topic} | ${r.mode}${r.mode === "motion" ? ` (${r.style})` : ""} | ${r.seconds} s | ${fmt(r.machineSec)} | ` +
  `${r.headless ? `$${r.headless.usd.toFixed(2)} (headless, ${r.headless.turns} turns)` : "in-session"} | $${r.apiUsd.toFixed(2)} | ` +
  `${[...new Set(r.sources.map((s) => s.publisher))].join(", ")} |`,
);
const table = ["| Reel | Mode | Length | Logged step time | Model use | API spend | Sources |", "|---|---|---|---|---|---|---|", ...rows].join("\n");
const readmePath = join(ROOT, "README.md");
const readme = readFileSync(readmePath, "utf8");
writeFileSync(readmePath, readme.replace(/<!-- reels:start -->[\s\S]*<!-- reels:end -->/, () => `<!-- reels:start -->\n${table}\n<!-- reels:end -->`));
console.log(`showcase: ${reels.length} reels -> showcase/data.json + showcase/media/ + README table`);
for (const r of reels) console.log(`  ${r.slug.padEnd(48)} ${r.mode.padEnd(9)} ${String(r.seconds).padStart(5)} s  ${r.mb} MB`);
