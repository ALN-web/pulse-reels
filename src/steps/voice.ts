/**
 * Step 3: Voice. ElevenLabs TTS with character timestamps -> voice.mp3 + words.json
 *   npm run voice -- <slug> [--force]
 * Needs ELEVENLABS_API_KEY in .env. Optional: ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID,
 * ELEVENLABS_USD_PER_1K_CHARS (0 on the free tier; set it if we move to a paid plan).
 */
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { isValidOutput, loadBrand, readJson, ROOT, runDir, writeJson } from "../lib/io.js";
import { recordStep, timedStep } from "../lib/runlog.js";
import { RunLogSchema } from "../schemas/run.js";
import { StoryboardSchema } from "../schemas/storyboard.js";
import { WordsSchema, type Words } from "../schemas/words.js";
import { alignmentToWords, compareToScript, type CharAlignment } from "../voice/align.js";
import { hasFfmpeg, normalizeLoudness } from "../voice/loudness.js";

try {
  process.loadEnvFile(join(ROOT, ".env"));
} catch {
  /* no .env: fall back to the real environment */
}

const { values, positionals } = parseArgs({ allowPositionals: true, options: { force: { type: "boolean" }, normalize: { type: "boolean" } } });
const slug = positionals[0];
if (!slug) {
  console.error("usage: npm run voice -- <slug> [--force | --normalize]");
  process.exit(2);
}

const dir = runDir(slug);
const mp3 = join(dir, "voice.mp3");
const wordsFile = join(dir, "words.json");

const outputsValid = existsSync(mp3) && isValidOutput(wordsFile, WordsSchema);

// --normalize: level an existing voice.mp3 to the brand loudness, no new TTS call (timings unchanged).
if (values.normalize) {
  if (!outputsValid) {
    console.error("nothing to normalise: run the voice step first");
    process.exit(1);
  }
  if (!hasFfmpeg()) {
    console.error("ffmpeg not found on PATH");
    process.exit(1);
  }
  const target = loadBrand(readJson(join(dir, "run.json"), RunLogSchema).client).voice.loudnessLufs;
  const started = Date.now();
  const { before, after } = normalizeLoudness(mp3, target);
  // Keep the original entry's cost; just update its notes and time.
  const prev = readJson(join(dir, "run.json"), RunLogSchema).steps.find((s) => s.step === "voice");
  recordStep(slug, {
    step: "voice",
    status: "ok",
    startedAt: prev?.startedAt ?? new Date(started).toISOString(),
    durationMs: (prev?.durationMs ?? 0) + (Date.now() - started),
    costUsd: prev?.costUsd ?? 0,
    provider: prev?.provider,
    notes: `${(prev?.notes ?? "").replace(/, NOT loudness-normalised \(ffmpeg missing\)/, "")}, loudnorm ${before.toFixed(1)} -> ${after.toFixed(1)} LUFS`,
  });
  console.log(`voice: loudness ${before.toFixed(1)} -> ${after.toFixed(1)} LUFS (target ${target})`);
  process.exit(0);
}

// Resumable: skip when both outputs exist and are valid. (No run.json write: keeps the original cost entry.)
if (!values.force && outputsValid) {
  console.log("voice: outputs already valid, skipped (use --force to redo)");
  process.exit(0);
}

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY is not set. Copy .env.example to .env and paste your key there.");
  process.exit(1);
}

const run = readJson(join(dir, "run.json"), RunLogSchema);
const brand = loadBrand(run.client);
const storyboard = readJson(join(dir, "storyboard.json"), StoryboardSchema);
const text = storyboard.scenes.map((s) => s.line).filter(Boolean).join(" ");

const voiceId = process.env.ELEVENLABS_VOICE_ID || brand.voice.voiceId;
const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const usdPer1k = Number(process.env.ELEVENLABS_USD_PER_1K_CHARS ?? 0);
if (!voiceId || voiceId === "TBD") {
  console.error("No voice chosen: set ELEVENLABS_VOICE_ID in .env (or brand.voice.voiceId).");
  process.exit(1);
}

await timedStep(slug, "voice", async () => {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: modelId,
        // Calm and steady for Dr. Ira; tweak after the first listen.
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { audio_base64: string; alignment: CharAlignment | null };
  if (!body.alignment) throw new Error("ElevenLabs returned no alignment");

  writeFileSync(mp3, Buffer.from(body.audio_base64, "base64"));

  const words = alignmentToWords(body.alignment);
  const mismatch = compareToScript(words, text);
  if (mismatch) throw new Error(`spoken words don't match the script: ${mismatch}`);

  // Loudness to -14 LUFS (brief). Timing is unchanged by loudnorm.
  let notes = `${text.length} chars, voice ${voiceId}, model ${modelId}`;
  if (hasFfmpeg()) {
    const { before, after } = normalizeLoudness(mp3, brand.voice.loudnessLufs);
    notes += `, loudnorm ${before.toFixed(1)} -> ${after.toFixed(1)} LUFS`;
  } else {
    notes += ", NOT loudness-normalised (ffmpeg missing)";
    console.warn("warning: ffmpeg not found, voice.mp3 is not normalised to -14 LUFS yet");
  }

  const lastEnd = words[words.length - 1].end;
  const out: Words = {
    audioFile: "voice.mp3",
    durationSec: Math.round((lastEnd + 0.25) * 1000) / 1000, // ElevenLabs adds a short tail after the last word
    provider: `elevenlabs:${modelId}`,
    words,
  };
  writeJson(wordsFile, out, WordsSchema);

  console.log(`voice: ${words.length} words, ${lastEnd.toFixed(2)} s spoken -> runs/${slug}/voice.mp3 + words.json`);
  return { result: out, costUsd: (text.length / 1000) * usdPer1k, provider: "elevenlabs", notes };
});
