import { existsSync } from "node:fs";
import { join } from "node:path";
import { RunLogSchema, type RunLog, type StepLog, type StepName } from "../schemas/run.js";
import { readJson, runDir, writeJson } from "./io.js";

export function runLogPath(slug: string): string {
  return join(runDir(slug), "run.json");
}

export function loadRunLog(slug: string): RunLog {
  return readJson(runLogPath(slug), RunLogSchema);
}

/** Append (or replace, on re-run) a step's timing + cost entry in run.json. */
export function recordStep(slug: string, entry: StepLog): RunLog {
  const path = runLogPath(slug);
  if (!existsSync(path)) throw new Error(`no run.json for "${slug}"; run \`npm run new-run\` first`);
  const log = loadRunLog(slug);
  log.steps = [...log.steps.filter((s) => s.step !== entry.step), entry];
  writeJson(path, log, RunLogSchema);
  return log;
}

/** Times an async step and records it, including failures. */
export async function timedStep<T>(
  slug: string,
  step: StepName,
  fn: () => Promise<{ result: T; costUsd?: number; provider?: string; notes?: string }>,
): Promise<T> {
  const startedAt = new Date();
  try {
    const out = await fn();
    recordStep(slug, {
      step,
      status: "ok",
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      costUsd: out.costUsd ?? 0,
      provider: out.provider,
      notes: out.notes,
    });
    return out.result;
  } catch (err) {
    recordStep(slug, {
      step,
      status: "failed",
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      costUsd: 0,
      notes: String(err instanceof Error ? err.message : err).slice(0, 500),
    });
    throw err;
  }
}

export function totals(log: RunLog): { durationMs: number; costUsd: number } {
  return log.steps.reduce(
    (t, s) => ({ durationMs: t.durationMs + s.durationMs, costUsd: t.costUsd + s.costUsd }),
    { durationMs: 0, costUsd: 0 },
  );
}
