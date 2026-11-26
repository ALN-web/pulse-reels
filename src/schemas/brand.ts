import { z } from "zod";
import { HexColor, Slug } from "./common.js";

export const BrandSchema = z.object({
  id: Slug,
  name: z.string(),
  industry: z.string(),
  audience: z.string(),
  tone: z.object({
    summary: z.string(),
    do: z.array(z.string()),
    dont: z.array(z.string()),
  }),
  palette: z.record(z.string(), HexColor),
  fonts: z.object({ display: z.string(), body: z.string() }),
  captionStyle: z.object({
    fontFamily: z.string(),
    fontWeight: z.number().int().min(100).max(900),
    fontSizePx: z.number().min(40),
    color: HexColor,
    background: HexColor,
    highlightColor: HexColor,
    maxWordsPerLine: z.number().int().min(1).max(8),
  }),
  character: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    outfit: z.string(),
    framing: z.string(),
    referenceSheet: z.string(),
    rig: z.string(),
  }),
  voice: z.object({
    provider: z.string(),
    voiceId: z.string(),
    style: z.string(),
    loudnessLufs: z.number(),
  }),
  compliance: z.object({
    allowedSourceDomains: z.array(z.string()).min(1),
    disclaimer: z.string().min(10),
    minContrastRatio: z.number().min(1),
  }),
  hashtags: z.array(z.string().startsWith("#")),
});
export type Brand = z.infer<typeof BrandSchema>;
