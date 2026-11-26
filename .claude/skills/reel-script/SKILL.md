---
name: reel-script
description: Step 1 of the Reel pipeline. Turn a topic into a hook-first 30-60 s voiceover script (runs/<slug>/script.json) for a client brand. Use when writing or rewriting a Reel script.
---

# Step 1: Script

**Input:** `runs/<slug>/run.json` (topic, client, mode) + `clients/<client>/brand.json`
**Output:** `runs/<slug>/script.json`, which must pass `npm run validate -- runs/<slug>/script.json`

## Resume rule
If `script.json` already exists and validates, skip this step unless the user asked to rewrite it.

## How to write it
1. Read the brand file: tone `do`/`dont`, audience, character name.
2. **Hook (≤ 3 s, about 9 words or fewer).** It must stop the scroll. Pick one pattern and record it in `hook.pattern`:
   small-number promise · myth-bust · gentle "you're doing X wrong" · surprising stat (sourced) · direct question.
   Never a fear hook or a diagnosis ("Your headache could be a tumour" is banned).
3. **Beats (2-8).** One idea each, plain words, ~150 words per minute. One doable action in the whole Reel.
4. **CTA.** Save / share / follow / "talk to your doctor if...".
5. **Sources.** At least one from the client's `compliance.allowedSourceDomains` (Pulse Health: who.int, cdc.gov, nhs.uk).
   Find the real page (web search) and use its real URL. Every number in the script must appear in a cited source.
6. `estimatedTotalSec` = words / 2.5, and must land in 30-60.

## Pulse Health language rules (the compliance gate blocks these anyway)
- Never "you have X" / "this means you have X". Say "this can be a sign of... worth checking with a doctor".
- Never "cures", "guaranteed", "reverses". Say "may help", "is linked to lower risk of".
- Never advise stopping medication or skipping the doctor.

## Finish
Run `npm run validate -- runs/<slug>/script.json`, then `npm run compliance -- <slug>`.
If compliance is BLOCKED, rewrite the flagged lines and re-run. Record this step's LLM cost in run.json (`script` entry).
