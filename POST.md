# LinkedIn / X post (draft)

Attach: the headache Reel (`runs/when-a-headache-means-see-a-doctor/reel.mp4`) and a screenshot of the showcase page.
Repo: https://github.com/ALN-web/pulse-reels

---

We built a pipeline that turns one sentence into a finished, fact-checked health Reel, and used it to make 8 of them. 🎬

`./generate.sh --topic "When a headache means see a doctor"`

…and 10–15 minutes later there's a 1080×1920 Instagram Reel with a voiceover, an animated doctor, word-by-word
captions and a post caption with sources.

For our challenge client, Pulse Health (a fictional telehealth brand), the hard part wasn't the video. It was trust.
Health content must never diagnose, never promise a cure, and always cite a real source. So we made that a gate
in code, not a line in a prompt:

✅ Blocks "you have…", "cures…" and "no need to see a doctor", in the script AND in the visual prompts
✅ Requires a WHO, CDC or NHS source, cited in the caption
✅ Adds a "Not medical advice" card to every Reel
✅ Checks caption colour contrast (WCAG)

Under the hood: 7 Claude Code skills chained by one command, typed JSON handoffs (Zod), ElevenLabs voice with
word timings, HyperFrames for rendering, 0 ms drift between spoken words and captions, and 54 tests.

What surprised us: the AI agent wrote "Three headache red flags" and then listed five. The gate can't catch that
kind of mistake. A human review step and an edit log (EDITS.md) did. Automation plus review beats either alone.

Built by Team Delta in one week. Repo: https://github.com/ALN-web/pulse-reels

#AI #ClaudeCode #HealthTech #ContentAutomation #BuildInPublic
