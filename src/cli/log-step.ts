/**
 * Record a step done by an agent (e.g. Claude writing script.json) in run.json.
 *   npm run log-step -- <slug> <step> --ms 42000 --cost 0.03 --provider claude --notes "..." [--status ok|skipped|failed]
 */
import { parseArgs } from "node:util";
import { recordStep } from "../lib/runlog.js";
import { StepName } from "../schemas/run.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    ms: { type: "string", default: "0" },
    cost: { type: "string", default: "0" },
    provider: { type: "string" },
    notes: { type: "string" },
    status: { type: "string", default: "ok" },
  },
});
const [slug, step] = positionals;
if (!slug || !step) {
  console.error("usage: npm run log-step -- <slug> <step> [--ms N] [--cost USD] [--provider x] [--notes x] [--status ok]");
  process.exit(2);
}
const durationMs = Number(values.ms);
recordStep(slug, {
  step: StepName.parse(step),
  status: values.status as "ok" | "skipped" | "failed",
  startedAt: new Date(Date.now() - durationMs).toISOString(),
  durationMs,
  costUsd: Number(values.cost),
  provider: values.provider,
  notes: values.notes,
});
console.log(`logged ${step} for ${slug}`);
