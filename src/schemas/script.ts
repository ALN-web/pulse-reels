import { z } from "zod";
import { REEL_MAX_SEC, REEL_MIN_SEC, RunMeta, Source } from "./common.js";

/** Step 1 output: runs/<slug>/script.json */
export const ScriptSchema = RunMeta.extend({
  hook: z.object({
    text: z.string().min(5).max(120),
    /** Spoken length of the hook. Brief: first 3 s must stop the scroll. */
    estimatedSec: z.number().positive().max(3),
    /** Which hook pattern was used (question, surprising fact, myth-bust, ...). */
    pattern: z.string(),
  }),
  beats: z
    .array(z.object({ id: z.string(), text: z.string().min(3) }))
    .min(2)
    .max(8),
  cta: z.string().min(3),
  sources: z.array(Source).min(1),
  estimatedTotalSec: z.number().min(REEL_MIN_SEC).max(REEL_MAX_SEC),
});
export type Script = z.infer<typeof ScriptSchema>;

/** Full voiceover text, in speaking order. */
export function scriptToVoiceover(s: Script): string {
  return [s.hook.text, ...s.beats.map((b) => b.text), s.cta].join(" ");
}
