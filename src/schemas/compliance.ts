import { z } from "zod";

export const ComplianceRule = z.enum([
  "no-diagnosis",
  "no-cure-claim",
  "no-unsafe-advice",
  "credible-source",
  "disclaimer",
  "caption-contrast",
]);
export type ComplianceRule = z.infer<typeof ComplianceRule>;

export const Finding = z.object({
  rule: ComplianceRule,
  /** error = blocks the Reel; warning = human should look; info = not checked yet / FYI. */
  severity: z.enum(["error", "warning", "info"]),
  /** Where it was found, e.g. "script.beats[2]" or "storyboard.scenes[s3].visual". */
  where: z.string(),
  message: z.string(),
  excerpt: z.string().optional(),
});
export type Finding = z.infer<typeof Finding>;

/** runs/<slug>/compliance.json */
export const ComplianceReportSchema = z.object({
  slug: z.string(),
  checkedAt: z.iso.datetime(),
  final: z.boolean(),
  passed: z.boolean(),
  counts: z.object({ error: z.number(), warning: z.number(), info: z.number() }),
  findings: z.array(Finding),
});
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;
