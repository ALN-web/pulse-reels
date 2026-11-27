# Demo day: run sheet and client pitch (Team Delta · Pulse Health)

About 5 minutes. Start the live run first: it takes 10–15 minutes, and you talk over it.

## Before you start (5 min earlier)
- A normal terminal in the project folder, with `claude` already signed in (`claude` → `/login` once).
- `npm test` passes (54 tests). `npm run voices` shows enough ElevenLabs credit (about 700 characters per Reel).
- Open the showcase page and `runs/` in the file explorer.
- Pick a topic that is NOT already in `runs/` (a re-run resumes instead of starting fresh). Backups:
  "Why your yearly check-up is worth it" (character), "How much sugar is in a can of soda" (motion, `--style poster`).

## 0:00 – Start the live run
```bash
./generate.sh --topic "Why your yearly check-up is worth it" --client pulse-health --mode character
```
Say: "One command. Topic, client, mode in. A finished, fact-checked Reel out. While it runs, here's what it's doing."

## 0:30 – The client and the problem
Pulse Health is a telehealth brand for busy 25–45-year-olds. Health content has one hard rule: it must never
diagnose, never promise a cure, and always be sourced. So our pipeline has a gate that enforces that in code.

## 1:00 – Show a finished Reel (showcase page)
Play the headache Reel. Point out: the hook in the first 3 seconds; Dr. Ira, the same rig in every scene, with lip
sync from the voice timings; captions that light up on each spoken word; the "Not medical advice" end card and
the NHS/CDC sources in the caption.

## 2:00 – The chain (open `agent.log` or the terminal)
Script → compliance → storyboard → compliance → voice → render → captions → final gate. Every handoff is a JSON
file validated by a Zod schema, so a stopped run resumes where it left off.

## 2:45 – The compliance gate (the hard mode)
```bash
npm run compliance -- when-a-headache-means-see-a-doctor --final
```
Then show it failing: in `tests/compliance.test.ts`, "This walk cures high blood pressure" is blocked;
"If you have high blood pressure, talk to your doctor" is allowed. It checks visual prompts too, not just words.

## 3:30 – Honest numbers
Show the README table: 10–15 minutes and about $2 of model use per headless Reel, $0 API spend on free tiers,
0 ms caption and cut drift, -14 LUFS audio. Show EDITS.md: every human fix is logged, including the one where
the agent wrote "three red flags" for a list of five.

## 4:15 – The live result
Open `runs/<slug>/reel.mp4` and `post.txt` from the run started at 0:00 (or the last finished one if it's still
rendering).

## Likely questions
- **What stops it from giving bad medical advice?** Six coded rules, run after the script, after the storyboard and
  before publish; the run cannot finish without a pass. Plus a human review of each script (EDITS.md shows why).
- **Why an SVG doctor, not AI video?** Perfect character lock across every Reel, exact lip sync, and $0. AI video
  (e.g. Higgsfield) can replace the rig later; the render step takes a clip per character shot.
- **When sources disagree?** The blood-pressure Reel shows both the NHS and CDC cut-offs and says "ask your doctor".
