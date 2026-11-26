import type { z } from "zod";
import { BrandSchema } from "./brand.js";
import { ScriptSchema } from "./script.js";
import { StoryboardSchema } from "./storyboard.js";
import { WordsSchema } from "./words.js";
import { PostSchema } from "./post.js";
import { RunLogSchema } from "./run.js";
import { ComplianceReportSchema } from "./compliance.js";

export * from "./common.js";
export * from "./brand.js";
export * from "./script.js";
export * from "./storyboard.js";
export * from "./words.js";
export * from "./post.js";
export * from "./run.js";
export * from "./compliance.js";

/** Lookup used by `npm run validate -- <file> [schema]`. */
export const SCHEMAS: Record<string, z.ZodType> = {
  brand: BrandSchema,
  script: ScriptSchema,
  storyboard: StoryboardSchema,
  words: WordsSchema,
  post: PostSchema,
  run: RunLogSchema,
  compliance: ComplianceReportSchema,
};

/** Guess the schema from a file name like "storyboard.json". */
export function schemaForFile(file: string): string | undefined {
  const base = file.replace(/\\/g, "/").split("/").pop()!.replace(/\.json$/, "");
  return base in SCHEMAS ? base : undefined;
}
