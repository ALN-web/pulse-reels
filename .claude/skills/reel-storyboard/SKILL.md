---
name: reel-storyboard
description: Step 2 of the Reel pipeline. Split a validated script into timed scenes with visuals, animation and on-screen text (runs/<slug>/storyboard.json). Use when planning a Reel's scenes.
---

# Step 2: Storyboard

**Input:** `runs/<slug>/script.json` + `clients/<client>/brand.json`
**Output:** `runs/<slug>/storyboard.json`, which must pass `npm run validate -- runs/<slug>/storyboard.json`

## Resume rule
Skip if `storyboard.json` exists and validates, unless asked to redo it.

## Rules
- **Lines:** joining every non-empty `scene.line` with spaces must equal hook + beats + cta exactly
  (Voice speaks these and Render syncs to them).
- **One scene ≈ one visual idea**, 2-7 s each, 30-60 s in total. Cut on phrase boundaries, never mid-phrase.
- **shot:**
  - `character`: Dr. Ira on screen. Describe pose, expression and gesture ONLY. Never describe her clothes, face or
    framing: those come from the locked character (`brand.character`), so she looks identical every time.
  - `motion`: icons, text, charts, diagrams.
  - `disclaimer`: required. A silent (`line: ""`) ~3 s card with "Not medical advice" + the source name.
- **Character mode:** set `characterId` to `brand.character.id`; about 40-60 % character shots; the hook scene is a character shot.
- **Motion mode:** no character shots. Set `styleId` (each Reel pair gets a different style; list the styles used in the README).
- **onScreenText:** 6 words or fewer, and it must fit the Instagram safe zone (`src/lib/safezones.ts`).
- **animation:** concrete and GSAP-able ("bars grow from 0, stagger 0.1 s, power2.out"), tied to a word when possible ("on 'sing'").
- Visual prompts are compliance-checked too: no pills labelled "cure", no scary imagery.

## Finish
`npm run validate -- runs/<slug>/storyboard.json`, then `npm run compliance -- <slug>`. Fix until PASS.
