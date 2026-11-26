---
name: reel-render
description: Step 4 of the Reel pipeline. Build a HyperFrames composition from storyboard + word timings and render a 1080x1920 MP4 (runs/<slug>/render.mp4). Use when rendering or re-rendering a Reel's visuals.
---

# Step 4: Render (HyperFrames)

**Input:** `storyboard.json`, `words.json`, `voice.mp3`, `script.json`, `brand.json`, optional `runs/<slug>/scenes/<id>.html`
**Output:** `runs/<slug>/composition/index.html` (generated, never hand-edit) and `runs/<slug>/render.mp4`

```bash
npm run render -- <slug> --snapshot     # build + lint + one PNG per scene (look at them before rendering)
npm run render -- <slug> --draft        # quick low-quality MP4
npm run render -- <slug>                # final MP4 (needs FFmpeg)
```

## What the generator does for you (src/render/build.ts)
- **Timing from the voice.** Every scene starts on its first spoken word (0 ms drift; fails above 80 ms).
- **Character lock.** One Dr. Ira layer from `brand.character.rig` for the whole video, shown only in `character` shots.
  Lip sync comes from the word timings (`src/render/visemes.ts`), plus blinks, breathing and small head movements.
- **Headline** = `onScreenText`, top of the safe zone. **End card** = the disclaimer + source publishers.
- Brand palette as CSS variables: `--ground --ink --primary --accent --soft --alert`, fonts `--font-display --font-body`.

## Your job: one fragment per scene (`runs/<slug>/scenes/<id>.html`)
Draw what the storyboard's `visual` + `animation` describe. A fragment is markup + one `<script>`:

```html
<style>#scene-s2 .badge { position: absolute; right: 0; top: 0; }</style>   <!-- scope every rule with #scene-<id> -->
<div class="badge">5:00</div>
<script>
  tl.from(q(".badge"), { scale: 0.5, opacity: 0, duration: 0.3 }, w("five-minute"));  // lands ON the word
</script>
```
Available in the script: `tl` (root timeline), `t` (scene start, s), `d` (scene length), `w("word", n?)` (when the
nth occurrence of that word starts; the build FAILS if the scene doesn't say it), `q(sel)` / `qa(sel)` (scoped
querySelector/All), `ira.hand(at, "five" | "wave")`, `ira.handDown(at)`.

Layout: the fragment box is 870×860 px at x 60, y 470. Keep key content inside it. In **character** shots, Dr. Ira's
head fills roughly x 305-655, y 440-860 of that box, so put overlays above (y < 440) or at the sides.
Rules: deterministic only (no `Math.random`, `Date.now` or fetch); animate transforms/opacity, and keep colours
from the palette. Scenes without a fragment still get their headline.

## Check before the final render
1. `--snapshot`, then open the `contact-sheet-*.jpg` it prints and look at every frame (overlaps, duplicated text,
   anything cut off, text in the bottom 420 px or the right 150 px).
2. Fix the fragments or the storyboard, then re-snapshot. Lint must show 0 errors.
3. Render. HyperFrames needs FFmpeg on PATH (`winget install Gyan.FFmpeg`).
