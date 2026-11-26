import { z } from "zod";
import { RunMeta } from "./common.js";

export const StepName = z.enum(["script", "compliance", "storyboard", "voice", "render", "caption"]);
export type StepName = z.infer<typeof StepName>;

export const StepLog = z.object({
  step: StepName,
  status: z.enum(["ok", "skipped", "failed"]),
  startedAt: z.iso.datetime(),
  durationMs: z.number().min(0),
  /** API spend for this step in USD (0 for local work). */
  costUsd: z.number().min(0),
  provider: z.string().optional(),
  notes: z.string().optional(),
});
export type StepLog = z.infer<typeof StepLog>;

/** runs/<slug>/run.json — time and cost per step (brief requirement). */
export const RunLogSchema = RunMeta.extend({
  createdAt: z.iso.datetime(),
  steps: z.array(StepLog),
});
export type RunLog = z.infer<typeof RunLogSchema>;
