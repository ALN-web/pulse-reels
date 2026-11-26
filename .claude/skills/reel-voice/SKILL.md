---
name: reel-voice
description: Step 3 of the Reel pipeline. Generate the English voiceover with word-level timestamps (runs/<slug>/voice.mp3 + words.json). Use when producing or redoing narration.
---

# Step 3: Voice  (ElevenLabs)

**Input:** `runs/<slug>/storyboard.json`, `brand.voice`
**Output:** `runs/<slug>/voice.mp3` + `runs/<slug>/words.json` (validates against `WordsSchema`)

## Contract (fixed now so Render can be built against it)
- Text = non-empty scene lines joined with spaces (identical to the script).
- `words.json.words[]` = `{ word, start, end }` in seconds, in time order, from the TTS provider's alignment
  (for example ElevenLabs "with timestamps" gives character timings, which we group into words). If the provider
  has no timings, fall back to forced alignment (whisper) and note it in run.json.
- Loudness: normalise to `brand.voice.loudnessLufs` (-14 LUFS) with FFmpeg `loudnorm`.
- Record provider + cost (characters × price) in run.json under `voice`.
- API key from `.env` only. Never write keys into run files.

## Resume rule
Skip if both files exist and `words.json` validates.

## Run it
```bash
npm run voices                     # once: list voices your key can use, pick Dr. Ira's, put the id in .env
npm run voice -- <slug>            # writes voice.mp3 + words.json, logs time/cost in run.json
npm run voice -- <slug> --force    # redo (e.g. after changing the voice)
```
The step fails (and logs `failed`) if the spoken words don't match the script word for word.
Code: `src/steps/voice.ts`, word grouping in `src/voice/align.ts`, tests in `tests/voice.test.ts`.
