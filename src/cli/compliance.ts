/**
 * Team Delta hard mode: medical compliance gate.
 *   npm run compliance -- <slug>            check whatever exists so far (after script, after storyboard)
 *   npm run compliance -- <slug> --final    final gate before publishing: everything must exist and pass
 * Reads runs/<slug>/{script,storyboard,post}.json, writes runs/<slug>/compliance.json.
 * Exit code 1 if any error-level finding (the pipeline must stop and rewrite).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { checkCompliance } from "../compliance/check.js";
import { loadBrand, readJson, runDir, writeJson } from "../lib/io.js";
import { recordStep } from "../lib/runlog.js";
import { ComplianceReportSchema } from "../schemas/compliance.js";
import { PostSchema } from "../schemas/post.js";
import { RunLogSchema } from "../schemas/run.js";
import { ScriptSchema } from "../schemas/script.js";
import { StoryboardSchema } from "../schemas/storyboard.js";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const final = args.includes("--final");
if (!slug) {
  console.error("usage: npm run compliance -- <slug> [--final]");
  process.exit(2);
}

const started = Date.now();
const dir = runDir(slug);
const runLog = readJson(join(dir, "run.json"), RunLogSchema);
const opt = <T>(file: string, schema: Parameters<typeof readJson<T>>[1]) =>
  existsSync(join(dir, file)) ? readJson(join(dir, file), schema) : undefined;

const report = checkCompliance({
  slug,
  brand: loadBrand(runLog.client),
  script: opt("script.json", ScriptSchema),
  storyboard: opt("storyboard.json", StoryboardSchema),
  post: opt("post.json", PostSchema),
  final,
});
writeJson(join(dir, "compliance.json"), report, ComplianceReportSchema);

for (const f of report.findings) {
  const tag = f.severity === "error" ? "ERROR" : f.severity === "warning" ? "WARN " : "info ";
  console.log(`${tag} [${f.rule}] ${f.where}: ${f.message}${f.excerpt ? `\n        "${f.excerpt}"` : ""}`);
}
console.log(
  `\n${report.passed ? "PASS" : "BLOCKED"}  ${report.counts.error} error(s), ${report.counts.warning} warning(s)` +
    `  -> runs/${slug}/compliance.json`,
);

recordStep(slug, {
  step: "compliance",
  status: report.passed ? "ok" : "failed",
  startedAt: new Date(started).toISOString(),
  durationMs: Date.now() - started,
  costUsd: 0,
  provider: "local-rules",
  notes: `${final ? "final" : "draft"}: ${report.counts.error} errors, ${report.counts.warning} warnings`,
});
process.exit(report.passed ? 0 : 1);
