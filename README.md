# Pulse Reels: Team Delta

Topic in, Instagram Reel out. A chain of Claude Code skills turns one prompt into a finished 1080×1920,
30–60 s Reel: hook-first script, storyboard, voiceover, animation, word-synced burned-in captions and a post
caption, rendered with [HyperFrames](https://hyperframes.heygen.com). Every Reel passes a medical compliance
gate before it counts.

- **Client:** Pulse Health (fictional): preventive care and telehealth for adults 25–45. Warm, calm, evidence-based.
- **Character mode:** Dr. Ira, one locked SVG rig (teal scrubs, stethoscope) with lip sync from the voice timings.
- **Motion mode:** text, icons and charts only; each pair of motion Reels has its own style theme.
- **Hard mode (healthcare):** blocks diagnoses, cure claims and unsafe advice; requires a WHO/CDC/NHS source; adds
  a "Not medical advice" frame; checks WCAG caption contrast.
- **Showcase:** `showcase/index.html` (built by `npm run showcase`).

## The live demo

```bash
./generate.sh --topic "When a headache means see a doctor" --client pulse-health --mode character
./generate.sh --topic "How much salt is too much" --mode motion --style poster
./batch.sh topics.txt        # several Reels in a row
```

`generate.sh` creates `runs/<slug>/`, runs the `/reel` skill headless with Claude Code, streams every agent
action to `runs/<slug>/agent.log`, and prints `DONE … -> reel.mp4 + post.txt`. Re-running the same topic resumes
from the files on disk. Run it from a normal terminal (Claude Code can't be started inside another Claude Code
session) after `claude` has been signed in once.

## Pipeline

```
topic ─► script ─► [compliance] ─► storyboard ─► [compliance] ─► voice ─► render ─► captions ─► [compliance --final]
         script.json              storyboard.json               voice.mp3  composition/  reel.mp4
                                                                words.json  (snapshots)   post.json · post.txt
```

| Skill | What it does | Output |
|-------|--------------|--------|
| `/reel` | Chains everything; resumable; logs time and cost per step | everything below |
| `reel-script` | Hook-first script; every number from a cited WHO/CDC/NHS page | `script.json` |
| `reel-compliance` | The hard-mode gate (6 rules, 30+ tests) | `compliance.json` |
| `reel-storyboard` | Scenes: spoken line, visual, animation, on-screen text, shot type | `storyboard.json` |
| `reel-voice` | ElevenLabs TTS with character timestamps grouped into words; two-pass loudnorm to -14 LUFS | `voice.mp3`, `words.json` |
| `reel-render` | HyperFrames composition from storyboard + word timings; scene fragments synced to spoken words | `composition/` |
| `reel-caption` | Word-synced captions in the safe zone; post caption; final encode | `reel.mp4`, `post.txt` |

**Hard-mode requirements, and where they live**

| Requirement | How |
|---|---|
| Typed handoffs | Zod schemas for every file (`src/schemas/`); files are validated before they are written |
| Resumable steps | Each step skips when its outputs exist and validate; `generate.sh` resumes a stopped run |
| Sync within 80 ms | Scene cuts start on their first word and captions highlight on each word's start: **0 ms drift**, and the build fails above 80 ms |
| Character lock | One SVG rig in `clients/pulse-health/character/dr-ira.svg`, one layer for the whole video |
| Safe zones | Captions and key text inside x 60–930, y 250–1500 (`src/lib/safezones.ts`, tested) |
| `run.json` per video | Duration, API cost, provider and notes for every step |
| Loudness | Voice and final mix normalised to -14 LUFS (two-pass EBU R128) |

## Setup

Requirements: Node 22+, FFmpeg on PATH, Claude Code CLI (signed in), an ElevenLabs API key.

```bash
npm install
cp .env.example .env      # ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (never commit .env)
npm run voices            # list voices for your key
npm test                  # 54 tests: schemas, compliance, voice alignment, timing, captions
```

On Windows: `winget install Gyan.FFmpeg`, then open a new terminal.

## Commands

```bash
npm run new-run -- --topic "..." --mode character|motion   # creates runs/<slug>/
npm run validate -- runs/<slug>/storyboard.json            # schema check (exit 1 if invalid)
npm run compliance -- <slug> [--final]                     # the medical compliance gate
npm run voice -- <slug> [--force | --normalize]            # voice.mp3 + words.json
npm run render -- <slug> --snapshot                        # build + lint + one frame per scene
npm run caption -- <slug> [--snapshot | --draft]           # post.txt + reel.mp4 with captions
npm run log-step -- <slug> <step> --ms N --cost USD        # log an agent-written step
npm run showcase                                           # rebuild showcase/ and the table below
```

## Repo map

```
.claude/skills/            the 7 skills (SKILL.md each)
clients/pulse-health/      brand.json, character/dr-ira.svg, styles/ (monitor.css, poster.css)
src/schemas/               Zod schemas for every handoff file
src/compliance/            rules.ts, contrast.ts (WCAG), check.ts (the gate)
src/voice/                 ElevenLabs alignment -> words, loudness
src/render/                timing, visemes (lip sync), captions, build (composition), pipeline
src/steps/                 voice, render, caption commands
src/cli/                   validate, compliance, new-run, log-step, voices, showcase
tests/                     vitest
runs/<slug>/               one folder per Reel: JSON handoffs, scenes/, composition/, post.txt (media not in git)
showcase/                  template.html -> index.html + data.json (media copied at build time)
EDITS.md                   every manual or after-review fix, logged
generate.sh, batch.sh      the one-command demo and the batch runner
```

## Time and cost per video

Generated from each `run.json` and agent log by `npm run showcase`. "Logged step time" adds every step in run.json (script and storyboard times are the agent's own estimates);
"model use" is the Claude Code cost of a headless run (on the Claude plan); API spend is ElevenLabs (free tier).

<!-- reels:start -->
| Reel | Mode | Length | Logged step time | Model use | API spend | Sources |
|---|---|---|---|---|---|---|
| The 5-minute daily habit your heart will thank you for | character | 35.9 s | 8m 02s | in-session | $0.00 | CDC, NHS |
| What your blood pressure numbers mean | motion (monitor) | 38.5 s | 5m 21s | in-session | $0.00 | NHS, CDC |
| When a headache means see a doctor | character | 46.3 s | 5m 37s | $3.93 (headless, 105 turns) | $0.00 | NHS, CDC |
| How sleep debt builds over a week | motion (monitor) | 40.8 s | 17m 57s | $1.87 (headless, 46 turns) | $0.00 | CDC |
| How much water do you really need each day | character | 43.8 s | 13m 40s | $2.24 (headless, 68 turns) | $0.00 | NHS, CDC |
| How much salt is too much | motion (poster) | 40.7 s | 20m 01s | $2.06 (headless, 67 turns) | $0.00 | WHO, NHS, CDC |
| What one unit of alcohol actually looks like | motion (poster) | 45.8 s | 13m 59s | $1.88 (headless, 52 turns) | $0.00 | NHS, CDC |
| The 20-second handwashing habit that stops germs spreading | character | 41.1 s | 13m 41s | $1.89 (headless, 67 turns) | $0.00 | CDC, NHS |
<!-- reels:end -->

## Manual edits

See [EDITS.md](EDITS.md). Every fix made after a step's own review is logged with what changed and why the
pipeline got it wrong.
