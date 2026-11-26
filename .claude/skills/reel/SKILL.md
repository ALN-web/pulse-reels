---
name: reel
description: Main pipeline. One prompt to a finished Instagram Reel. Chains script, compliance, storyboard, compliance, voice, render, caption and final compliance for a topic, client and mode. Use when asked to make a Reel, e.g. "/reel When a headache means see a doctor --mode character".
---

# /reel: topic to finished Reel

**Args:** `<topic> [--client pulse-health] [--mode character|motion]` (defaults: pulse-health, character)

## Chain
1. `npm run new-run -- --topic "<topic>" --client <client> --mode <mode>` prints `<slug>`. An existing run is reused (resumable).
2. **reel-script** → `script.json`
3. **reel-compliance** draft check; fix and repeat until PASS
4. **reel-storyboard** → `storyboard.json`
5. **reel-compliance** draft check; fix and repeat until PASS
6. **reel-voice** → `voice.mp3`, `words.json`
7. **reel-render** → `render.mp4`
8. **reel-caption** → `reel.mp4`, `post.json`, `post.txt`
9. **reel-compliance --final**, which must PASS

## Rules
- **Resumable:** before each step, if its output exists and validates (`npm run validate -- <file>`), skip it
  and log `status: "skipped"`. `--force <step>` redoes that step and everything after it.
- **Typed handoffs:** never pass data between steps in chat, only through the validated files in `runs/<slug>/`.
- **Every step** records its duration and API cost in `run.json`.
- **No manual fixes** inside the chain. If a human edits a generated file afterwards, log it in `EDITS.md`.
- Stop and report at the first step that fails twice in a row.

## Done means
`runs/<slug>/` holds `reel.mp4` (1080×1920, 30-60 s), `post.txt`, `compliance.json` with `passed: true, final: true`,
and `run.json` with every step. Report the total time and cost to the user.
