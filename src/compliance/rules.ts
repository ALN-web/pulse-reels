import type { ComplianceRule } from "../schemas/compliance.js";

export interface TextRule {
  rule: ComplianceRule;
  pattern: RegExp;
  message: string;
  /** If the words just before the match are conditional ("if you have..."), it is not a diagnosis. */
  allowConditional?: boolean;
  /** If the words just before the match negate it ("there is no cure"), downgrade to a warning. */
  negatable?: boolean;
}

const CONDITIONS =
  "(?:high blood pressure|hypertension|diabetes|pre-?diabetes|cancer|heart disease|a heart condition|depression|anxiety|sleep apnea|insomnia|a migraine|migraines|an? (?:infection|disorder|condition|disease|illness))";

export const TEXT_RULES: TextRule[] = [
  // --- Diagnosing the viewer ---
  {
    rule: "no-diagnosis",
    pattern: new RegExp(
      `\\byou(?:'ve| have| might have| probably have| definitely have| likely have| are suffering from| suffer from)\\s+(?:got\\s+)?${CONDITIONS}`,
      "i",
    ),
    message: "Tells the viewer they have a condition. Rephrase as 'this can be a sign of... talk to a doctor'.",
    allowConditional: true,
  },
  {
    rule: "no-diagnosis",
    pattern: /\b(?:this|that|it|these symptoms?)\s+(?:means|indicates|confirms|proves)\s+(?:that\s+)?you(?:'ve| have| are)\b/i,
    message: "Draws a diagnostic conclusion about the viewer.",
    allowConditional: true,
  },
  {
    rule: "no-diagnosis",
    pattern: /\byou(?:'re| are)\s+(?:definitely\s+|probably\s+)?(?:diabetic|pre-?diabetic|hypertensive|depressed|sick)\b/i,
    message: "Labels the viewer with a condition.",
    allowConditional: true,
  },
  // --- Cure / guaranteed-outcome claims ---
  {
    rule: "no-cure-claim",
    pattern: /\bcur(?:e|es|ed|ing)\b/i,
    message: "Cure claim. Use 'may help', 'is linked to lower risk of'.",
    negatable: true,
  },
  {
    rule: "no-cure-claim",
    pattern: /\b(?:guarantee[sd]?|100% (?:effective|safe|proven)|miracle|magic (?:pill|fix)|instantly fix(?:es)?|never get sick|melts? away)\b/i,
    message: "Guaranteed or miracle-outcome language.",
    negatable: true,
  },
  {
    rule: "no-cure-claim",
    pattern: /\b(?:reverses?|eliminates?|eradicates?|gets? rid of)\s+(?:\w+\s+){0,3}(?:disease|diabetes|hypertension|high blood pressure|cancer|heart disease|depression)\b/i,
    message: "Claims to reverse or eliminate a disease.",
    negatable: true,
  },
  // --- Unsafe advice ---
  {
    rule: "no-unsafe-advice",
    pattern: /\b(?:stop|quit)\s+taking\s+(?:your\s+)?(?:medication|meds|medicine|pills|prescription)/i,
    message: "Advises stopping medication.",
  },
  {
    rule: "no-unsafe-advice",
    pattern: /\b(?:no need|don't need|do not need|skip(?:ping)?)\s+(?:to\s+)?(?:see|seeing|visit|visiting)?\s*(?:a|your)\s+doctor\b/i,
    message: "Discourages seeing a doctor.",
  },
  {
    rule: "no-unsafe-advice",
    pattern: /\binstead of\s+(?:seeing\s+)?(?:a\s+|your\s+)?(?:doctor|medication|medicine|treatment|prescription)/i,
    message: "Positions advice as a replacement for medical care.",
  },
];

const CONDITIONAL_BEFORE = /\b(?:if|whether|when|unless|anyone who|people who|those who|someone who|in case)\b[^.!?,;:]*$/i; // stays inside the if-clause: "If X, you have Y" is still a diagnosis
const NEGATION_BEFORE = /\b(?:no|not|never|isn't|doesn't|don't|can't|cannot|won't|there's no|there is no)\b(?:\s+\w+){0,3}\s*$/i;

export interface TextHit {
  rule: ComplianceRule;
  severity: "error" | "warning";
  message: string;
  excerpt: string;
}

export function scanText(text: string): TextHit[] {
  const hits: TextHit[] = [];
  for (const r of TEXT_RULES) {
    const flags = r.pattern.flags.includes("g") ? r.pattern.flags : r.pattern.flags + "g";
    for (const m of text.matchAll(new RegExp(r.pattern.source, flags))) {
      const before = text.slice(Math.max(0, m.index! - 60), m.index);
      if (r.allowConditional && CONDITIONAL_BEFORE.test(before)) continue;
      const negated = r.negatable && NEGATION_BEFORE.test(before);
      const start = Math.max(0, m.index! - 25);
      hits.push({
        rule: r.rule,
        severity: negated ? "warning" : "error",
        message: negated ? `${r.message} (negated — check wording reads safely)` : r.message,
        excerpt: text.slice(start, m.index! + m[0].length + 25).trim(),
      });
    }
  }
  return hits;
}
