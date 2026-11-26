/**
 * List the ElevenLabs voices this API key can use, plus remaining free-tier characters.
 *   npm run voices
 */
import { join } from "node:path";
import { ROOT } from "../lib/io.js";

try {
  process.loadEnvFile(join(ROOT, ".env"));
} catch {
  /* fall back to the real environment */
}
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY is not set in .env");
  process.exit(1);
}
const headers = { "xi-api-key": apiKey };

const sub = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers });
if (sub.ok) {
  const s = (await sub.json()) as { tier?: string; character_count?: number; character_limit?: number };
  console.log(`plan: ${s.tier}  characters used: ${s.character_count} / ${s.character_limit}\n`);
} else {
  console.log(`(could not read subscription: ${sub.status})\n`);
}

const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers });
if (!res.ok) {
  console.error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const { voices } = (await res.json()) as {
  voices: Array<{ voice_id: string; name: string; category?: string; labels?: Record<string, string> }>;
};
for (const v of voices) {
  const l = v.labels ?? {};
  console.log(
    `${v.voice_id}  ${v.name.padEnd(22)} ${[l.gender, l.age, l.accent, l.descriptive ?? l.description, l.use_case ?? l.use_case]
      .filter(Boolean)
      .join(", ")}`,
  );
}
