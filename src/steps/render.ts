/**
 * Step 4: Render. storyboard.json + words.json (+ scenes/*.html fragments) -> HyperFrames composition -> render.mp4 (no captions)
 *   npm run render -- <slug>                 build + lint + render
 *   npm run render -- <slug> --snapshot      build + lint + PNG frames at every scene's middle (no MP4)
 *   npm run render -- <slug> --build-only    just write composition/index.html
 *   npm run render -- <slug> --draft         faster, lower-quality MP4
 */
import { parseArgs } from "node:util";
import { timedStep } from "../lib/runlog.js";
import { renderRun } from "../render/pipeline.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { snapshot: { type: "boolean" }, "build-only": { type: "boolean" }, draft: { type: "boolean" } },
});
const slug = positionals[0];
if (!slug) {
  console.error("usage: npm run render -- <slug> [--snapshot | --build-only | --draft]");
  process.exit(2);
}

await timedStep(slug, "render", async () => {
  const notes = renderRun(slug, {
    captions: false,
    output: "render.mp4",
    snapshot: values.snapshot,
    buildOnly: values["build-only"],
    draft: values.draft,
  });
  return { result: null, provider: "hyperframes", notes };
});
