import { z } from "zod";
import { Source } from "./common.js";

/** Step 5 structured caption; rendered to runs/<slug>/post.txt */
export const PostSchema = z.object({
  hook: z.string().min(3).max(150),
  body: z.string().min(10),
  cta: z.string().min(3),
  sources: z.array(Source).min(1),
  disclaimer: z.string().min(10),
  hashtags: z.array(z.string().startsWith("#")).min(3).max(15),
});
export type Post = z.infer<typeof PostSchema>;

export function postToText(p: Post): string {
  const src = p.sources.map((s) => `${s.publisher}: ${s.title} (${s.url})`).join("\n");
  return [p.hook, "", p.body, "", p.cta, "", `${p.sources.length > 1 ? "Sources" : "Source"}:\n${src}`, "", p.disclaimer, "", p.hashtags.join(" ")].join("\n");
}
