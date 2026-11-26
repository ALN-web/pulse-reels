---
name: reel-caption
description: Step 5 of the Reel pipeline. Burn word-synced captions into the render and write the Instagram post caption (runs/<slug>/reel.mp4 + post.json + post.txt). Use when captioning a Reel or writing its post text.
---

# Step 5: Captions + post

**Input:** the composition / `render.mp4`, `words.json`, `script.json`, `brand.json`
**Output:** `reel.mp4`, `post.json` (validates against `PostSchema`), `post.txt` (built with `postToText`)

## Burned-in captions
- Word-synced from `words.json`: each word highlights within 80 ms of being spoken.
- Style from `brand.captionStyle` (≤ 4 words per line, highlight colour on the active word).
  The compliance gate checks contrast (WCAG ≥ 4.5:1).
- Inside the safe zone: lower third, but above the bottom 420 px of Instagram UI.
- Preferred: captions as a layer in the HyperFrames composition, then one re-render (single encode, exact sync).

## Post caption (`post.json`)
- `hook` (first line, ≤ 150 chars), `body`, `cta`, `hashtags` (brand hashtags + 1-3 topic tags, max 15)
- `sources`: copy from `script.json`; must include WHO/CDC/NHS
- `disclaimer`: `brand.compliance.disclaimer`, word for word
- Write `post.txt` with `postToText()`.

## Run it
1. Write `runs/<slug>/post.json` (rules above), then `npm run validate -- runs/<slug>/post.json`.
2. `npm run caption -- <slug> --snapshot`: writes post.txt and shows frames with captions. Check that no caption
   covers Dr. Ira's mouth or a key visual.
3. `npm run caption -- <slug>` renders `reel.mp4` (captions burned in, audio normalised to -14 LUFS).
4. `npm run compliance -- <slug> --final` must PASS before the Reel counts as done.

Caption lines are built in `src/render/captions.ts`: phrases split at punctuation and voice pauses, balanced to
≤ `maxWordsPerLine` words, with each word highlighted at its exact spoken start (0 ms drift; the build fails above 80 ms).
Tests: `tests/captions.test.ts`.
