/**
 * Step 5: Captions + post.
 *   npm run caption -- <slug>             post.json -> post.txt, then render reel.mp4 with burned-in word-synced captions
 *   npm run caption -- <slug> --snapshot  same, but PNG frames instead of the MP4
 *   npm run caption -- <slug> --draft     faster, lower-quality MP4
 *   npm run caption -- <slug> --post-only rewrite post.txt from post.json, no render
 * post.json is written by the agent (see .claude/skills/reel-caption/SKILL.md) before this runs.
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { readJson, runDir } from "../lib/io.js";
import { timedStep } from "../lib/runlog.js";
import { renderRun } from "../render/pipeline.js";
import { PostSchema, postToText } from "../schemas/post.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { snapshot: { type: "boolean" }, draft: { type: "boolean" }, "post-only": { type: "boolean" } },
});
const slug = positionals[0];
if (!slug) {
  console.error("usage: npm run caption -- <slug> [--snapshot | --draft | --post-only]");
  process.exit(2);
}

const dir = runDir(slug);
const postJson = join(dir, "post.json");
if (!existsSync(postJson)) {
  console.error(`runs/${slug}/post.json is missing: write it first (reel-caption skill), then re-run.`);
  process.exit(1);
}

const writePost = () => {
  writeFileSync(join(dir, "post.txt"), postToText(readJson(postJson, PostSchema)) + "\n");
  console.log(`post: runs/${slug}/post.txt`);
};

// --post-only: no run.json entry, so the logged render time/cost of this step is kept.
if (values["post-only"]) {
  writePost();
  process.exit(0);
}

await timedStep(slug, "caption", async () => {
  writePost();
  const notes = renderRun(slug, { captions: true, output: "reel.mp4", snapshot: values.snapshot, draft: values.draft });
  return { result: null, provider: "hyperframes", notes };
});
