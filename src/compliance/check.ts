import type { Brand } from "../schemas/brand.js";
import type { Source } from "../schemas/common.js";
import type { ComplianceReport, Finding } from "../schemas/compliance.js";
import type { Post } from "../schemas/post.js";
import type { Script } from "../schemas/script.js";
import type { Storyboard } from "../schemas/storyboard.js";
import { contrastRatio } from "./contrast.js";
import { scanText } from "./rules.js";

export interface ComplianceInput {
  slug: string;
  brand: Brand;
  script?: Script;
  storyboard?: Storyboard;
  post?: Post;
  /** Final gate (before publishing): every artifact must exist. */
  final?: boolean;
}

const DISCLAIMER_RE = /not medical advice/i;

function isAllowedSource(s: Source, domains: string[]): boolean {
  try {
    const host = new URL(s.url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

export function checkCompliance(input: ComplianceInput): ComplianceReport {
  const { brand, script, storyboard, post, final = false } = input;
  const findings: Finding[] = [];
  const missing = (what: string, rule: Finding["rule"]) =>
    findings.push({
      rule,
      severity: final ? "error" : "info",
      where: what,
      message: final ? `${what} is missing at the final gate` : `${what} not produced yet; not checked`,
    });

  // 1. Text rules over every piece of copy AND every visual prompt.
  const texts: Array<[string, string]> = [];
  if (script) {
    texts.push(["script.hook", script.hook.text]);
    script.beats.forEach((b) => texts.push([`script.beats[${b.id}]`, b.text]));
    texts.push(["script.cta", script.cta]);
  }
  if (storyboard) {
    for (const s of storyboard.scenes) {
      texts.push([`storyboard.scenes[${s.id}].line`, s.line]);
      texts.push([`storyboard.scenes[${s.id}].visual`, s.visual]);
      if (s.onScreenText) texts.push([`storyboard.scenes[${s.id}].onScreenText`, s.onScreenText]);
    }
  }
  if (post) {
    texts.push(["post.hook", post.hook], ["post.body", post.body], ["post.cta", post.cta]);
  }
  for (const [where, text] of texts) {
    for (const h of scanText(text)) findings.push({ ...h, where });
  }

  // 2. Credible source (WHO / CDC / NHS) in the script and cited in the post caption.
  const domains = brand.compliance.allowedSourceDomains;
  const checkSources = (where: string, sources: Source[]) => {
    if (!sources.some((s) => isAllowedSource(s, domains))) {
      findings.push({
        rule: "credible-source",
        severity: "error",
        where,
        message: `needs at least one source from ${domains.join(", ")}`,
      });
    }
    for (const s of sources.filter((s) => !isAllowedSource(s, domains))) {
      findings.push({
        rule: "credible-source",
        severity: "warning",
        where,
        message: `source not on the approved list (${s.publisher}); fine as extra, never as the only one`,
        excerpt: s.url,
      });
    }
  };
  if (script) checkSources("script.sources", script.sources);
  else missing("script.json", "credible-source");
  if (post) checkSources("post.sources", post.sources);
  else missing("post", "credible-source");

  // 3. "Not medical advice" frame on screen and in the caption.
  if (storyboard) {
    const hasFrame = storyboard.scenes.some((s) => s.shot === "disclaimer" || DISCLAIMER_RE.test(s.onScreenText));
    if (!hasFrame) {
      findings.push({
        rule: "disclaimer",
        severity: "error",
        where: "storyboard.scenes",
        message: "no on-screen 'Not medical advice' frame (add a scene with shot: \"disclaimer\")",
      });
    }
  } else missing("storyboard.json", "disclaimer");
  if (post) {
    if (!DISCLAIMER_RE.test(post.disclaimer)) {
      findings.push({ rule: "disclaimer", severity: "error", where: "post.disclaimer", message: "must say 'Not medical advice'" });
    }
  } else missing("post", "disclaimer");

  // 4. WCAG contrast of burned-in captions.
  const cs = brand.captionStyle;
  const min = brand.compliance.minContrastRatio;
  for (const [name, fg] of [["caption text", cs.color], ["caption highlight", cs.highlightColor]] as const) {
    const ratio = contrastRatio(fg, cs.background);
    if (ratio < min) {
      findings.push({
        rule: "caption-contrast",
        severity: "error",
        where: "brand.captionStyle",
        message: `${name} ${fg} on ${cs.background} is ${ratio.toFixed(2)}:1, needs ${min}:1`,
      });
    }
  }

  const counts = { error: 0, warning: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  return {
    slug: input.slug,
    checkedAt: new Date().toISOString(),
    final,
    passed: counts.error === 0,
    counts,
    findings,
  };
}
