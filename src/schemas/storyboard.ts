import { z } from "zod";
import { REEL_MAX_SEC, REEL_MIN_SEC, RunMeta } from "./common.js";

export const Scene = z.object({
  id: z.string(),
  /** Exact words spoken in this scene (concatenated = full voiceover). "" = silent scene (e.g. disclaimer card). */
  line: z.string(),
  /** What we see. For character shots, describe pose/expression only: look comes from the locked character. */
  visual: z.string().min(3),
  /** How it moves (GSAP-level description: "icons stagger in, 0.1 s apart"). */
  animation: z.string().min(3),
  /** Big on-screen text (not the captions). Empty string = none. */
  onScreenText: z.string(),
  /** Planned duration; Render step replaces this with real word timings. */
  durationSec: z.number().positive().max(15),
  shot: z.enum(["character", "motion", "disclaimer"]),
});
export type Scene = z.infer<typeof Scene>;

/** Step 2 output: runs/<slug>/storyboard.json */
export const StoryboardSchema = RunMeta.extend({
  /** Motion-mode visual style id; each Reel pair uses a different one. */
  styleId: z.string(),
  /** Locked character id (character mode). Must match brand.character.id. */
  characterId: z.string().optional(),
  scenes: z.array(Scene).min(3).max(14),
})
  .superRefine((sb, ctx) => {
    const total = sb.scenes.reduce((t, s) => t + s.durationSec, 0);
    if (total < REEL_MIN_SEC || total > REEL_MAX_SEC) {
      ctx.addIssue({
        code: "custom",
        path: ["scenes"],
        message: `total duration ${total.toFixed(1)} s is outside ${REEL_MIN_SEC}-${REEL_MAX_SEC} s`,
      });
    }
    if (sb.mode === "character" && !sb.characterId) {
      ctx.addIssue({ code: "custom", path: ["characterId"], message: "character mode needs characterId" });
    }
    if (sb.mode === "motion" && sb.scenes.some((s) => s.shot === "character")) {
      ctx.addIssue({ code: "custom", path: ["scenes"], message: "motion mode cannot contain character shots" });
    }
  });
export type Storyboard = z.infer<typeof StoryboardSchema>;
