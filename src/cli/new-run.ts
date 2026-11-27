/**
 * Create runs/<slug>/ with an empty run.json.
 *   npm run new-run -- --topic "When a headache means see a doctor" --client pulse-health --mode character
 * Prints the slug. Idempotent: an existing run is reused (resumable), never wiped.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadBrand, runDir, writeJson } from "../lib/io.js";
import { Mode } from "../schemas/common.js";
import { RunLogSchema } from "../schemas/run.js";

const { values } = parseArgs({
  options: {
    topic: { type: "string" },
    client: { type: "string", default: "pulse-health" },
    mode: { type: "string" },
    slug: { type: "string" },
  },
});
if (!values.topic || !values.mode) {
  console.error('usage: npm run new-run -- --topic "..." --mode character|motion [--client pulse-health] [--slug x]');
  process.exit(2);
}
const mode = Mode.parse(values.mode);
loadBrand(values.client!); // fail early on an unknown client

const slug =
  values.slug ??
  values.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .slice(0, 8)
    .join("-");

const file = join(runDir(slug), "run.json");
if (existsSync(file)) {
  console.error(`run "${slug}" already exists, resuming`);
} else {
  writeJson(
    file,
    { slug, topic: values.topic, client: values.client!, mode, createdAt: new Date().toISOString(), steps: [] },
    RunLogSchema,
  );
}
// scenes/ is created here so agents never need mkdir (blocked in headless mode).
mkdirSync(join(runDir(slug), "scenes"), { recursive: true });
console.log(slug);
