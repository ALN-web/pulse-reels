import { z } from "zod";

export const Word = z.object({
  word: z.string().min(1),
  start: z.number().min(0), // seconds
  end: z.number().min(0),
});
export type Word = z.infer<typeof Word>;

/** Step 3 output: runs/<slug>/words.json (alongside voice.mp3) */
export const WordsSchema = z
  .object({
    audioFile: z.string(),
    durationSec: z.number().positive(),
    provider: z.string(),
    words: z.array(Word).min(1),
  })
  .superRefine((w, ctx) => {
    let prevStart = -1;
    w.words.forEach((word, i) => {
      if (word.end < word.start) {
        ctx.addIssue({ code: "custom", path: ["words", i], message: "end before start" });
      }
      if (word.start < prevStart) {
        ctx.addIssue({ code: "custom", path: ["words", i], message: "words not in time order" });
      }
      if (word.end > w.durationSec + 0.05) {
        ctx.addIssue({ code: "custom", path: ["words", i], message: "word ends after audio" });
      }
      prevStart = word.start;
    });
  });
export type Words = z.infer<typeof WordsSchema>;
