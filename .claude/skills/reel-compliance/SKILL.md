---
name: reel-compliance
description: Team Delta hard mode. Medical compliance gate for Pulse Health Reels - blocks diagnoses, cure claims and unsafe advice, requires a WHO/CDC/NHS source, a "not medical advice" frame and WCAG caption contrast. Use after script, after storyboard, and before publishing.
---

# Compliance gate (hard mode)

```bash
npm run compliance -- <slug>           # draft check: whatever files exist so far
npm run compliance -- <slug> --final   # publish gate: script, storyboard and post must all exist and pass
```

Writes `runs/<slug>/compliance.json`, logs a `compliance` step in run.json, and exits 1 when blocked.

| Rule | Blocks |
|------|--------|
| `no-diagnosis` | "you have high blood pressure", "this means you have...", "you're diabetic" (inside an if-clause, "if you have X, talk to a doctor" is allowed) |
| `no-cure-claim` | cures, guaranteed, miracle, reverses/eliminates a disease (negated forms become a warning for review) |
| `no-unsafe-advice` | stop taking medication, no need to see a doctor, "instead of" medication/doctor |
| `credible-source` | no source from who.int / cdc.gov / nhs.uk (look-alike domains are rejected) |
| `disclaimer` | no "Not medical advice" scene on screen, or missing from the post caption |
| `caption-contrast` | caption text or highlight colour below 4.5:1 against the caption background |

Scanned text: hook, beats, CTA, every scene line, **every visual prompt**, on-screen text, post hook/body/CTA.

## When BLOCKED
Rewrite only the flagged lines (keep the meaning, soften the claim) and re-run. Never edit the rules to make a Reel pass.
Warnings need a human glance; if you keep the wording, note the decision in EDITS.md.
Rules live in `src/compliance/rules.ts`, tests in `tests/compliance.test.ts` (add a test for every new rule).
