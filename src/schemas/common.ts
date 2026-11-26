import { z } from "zod";

export const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected #RRGGBB");

export const Mode = z.enum(["character", "motion"]);
export type Mode = z.infer<typeof Mode>;

export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-kebab-case only");

/** Who/what the video is for. Repeated in every step file so each file stands alone. */
export const RunMeta = z.object({
  slug: Slug,
  topic: z.string().min(5),
  client: Slug,
  mode: Mode,
});

export const Source = z.object({
  publisher: z.string().min(2), // e.g. "CDC", "NHS", "WHO"
  title: z.string().min(3),
  url: z.url(),
});
export type Source = z.infer<typeof Source>;

/** Reel length limits from the brief. */
export const REEL_MIN_SEC = 30;
export const REEL_MAX_SEC = 60;
/** Max allowed drift between a spoken word and its cut/caption (brief: ~80 ms). */
export const SYNC_TOLERANCE_MS = 80;
