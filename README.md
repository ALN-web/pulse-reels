# Pulse Reels: Team Delta

Topic in, Instagram Reel out. A chain of Claude Code skills that turns one prompt into a 1080×1920,
30-60 s Reel with voiceover, motion graphics, burned-in captions and a post caption, rendered with
[HyperFrames](https://hyperframes.heygen.com).

**Client:** Pulse Health (preventive care + telehealth, adults 25-45) · **Character:** Dr. Ira, teal scrubs
**Hard mode:** a medical compliance gate (no diagnoses or cure claims, WHO/CDC/NHS source, "not medical advice" frame, WCAG caption contrast)

## Pipeline

```
topic ─► script ─► [compliance] ─► storyboard ─► [compliance] ─► voice ─► render ─► caption ─► [compliance --final]
         script.json              storyboard.json               voice.mp3   render.mp4  reel.mp4
                                                                words.json              post.json / post.txt
```

Every step reads and writes validated files in `runs/<slug>/`, so any step can be re-run on its own.
Each step logs its time and API cost in `runs/<slug>/run.json`.

| Skill | Status | Output |
|-------|--------|--------|
| `/reel` (main chain) | ready | everything below |
| `reel-script` | ready | `script.json` |
| `reel-storyboard` | ready | `storyboard.json` |
| `reel-compliance` | **done, tested** | `compliance.json` |
| `reel-voice` | **done** (ElevenLabs, needs key) | `voice.mp3`, `words.json` |
| `reel-render` | **done** | `render.mp4` |
| `reel-caption` | **done** | `reel.mp4`, `post.txt` |

## Setup

Requirements: Node 22+, FFmpeg on PATH, Claude Code.

```bash
npm install
cp .env.example .env      # add TTS key (never commit .env)
npm test                  # schemas + compliance rules
```

On Windows, install FFmpeg with `winget install Gyan.FFmpeg`, then open a new terminal.

## Usage

```bash
# Whole pipeline, one command (the live demo)
./generate.sh --topic "When a headache means see a doctor" --client pulse-health --mode character

# Or inside Claude Code
/reel What your blood pressure numbers mean --mode motion

# Tools used by the skills
npm run new-run -- --topic "..." --mode character     # creates runs/<slug>/run.json
npm run validate -- runs/<slug>/storyboard.json       # schema check (exit 1 if invalid)
npm run compliance -- <slug> [--final]                # medical compliance gate
npm run voices                                        # list ElevenLabs voices for your key
npm run voice -- <slug> [--force]                     # voice.mp3 + words.json
npm run render -- <slug> [--snapshot|--draft]         # HyperFrames composition -> render.mp4
npm run caption -- <slug> [--snapshot|--draft]        # post.txt + reel.mp4 with burned-in captions
```

## Repo map

```
.claude/skills/        the 7 skills (SKILL.md each)
clients/pulse-health/  brand.json: palette, fonts, caption style, Dr. Ira lock, voice, compliance settings
src/schemas/           Zod schemas for every handoff file
src/compliance/        rules.ts (text rules), contrast.ts (WCAG), check.ts (the gate)
src/lib/               file IO with validation, run.json logging, Instagram safe zones
src/cli/               validate / compliance / new-run commands
tests/                 vitest: schemas + compliance (fixture: a clean example Reel)
runs/<slug>/           one folder per Reel (generated)
EDITS.md               every manual fix, logged
```

## Time and cost per video

Filled from each `run.json` once Reels are produced.

| Reel | Mode | Time | Cost (USD) | Manual edits |
|------|------|------|------------|--------------|
| heart-5-minute-habit | character | ~10 min agent work + ~3 min voice/render each pass | $0 (free tiers) | 0 |
