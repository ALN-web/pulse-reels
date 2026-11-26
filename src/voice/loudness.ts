import { execFileSync, spawnSync } from "node:child_process";
import { renameSync, rmSync } from "node:fs";

export function hasFfmpeg(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

interface LoudnormStats {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

function measure(file: string, target: number): LoudnormStats {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `loudnorm=I=${target}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const m = /\{[\s\S]*?\}/.exec(r.stderr.slice(r.stderr.lastIndexOf("[Parsed_loudnorm")));
  if (!m) throw new Error("could not read loudnorm stats from ffmpeg");
  return JSON.parse(m[0]);
}

/** Integrated loudness in LUFS. */
export function integratedLufs(file: string): number {
  return Number(measure(file, -14).input_i);
}

/**
 * Two-pass EBU R128 normalisation in place (mp3, or the audio track of an mp4) (accurate to ~0.5 LU; timing is unchanged).
 * Returns the loudness before and after.
 */
export function normalizeLoudness(file: string, target: number): { before: number; after: number } {
  const s = measure(file, target);
  const isVideo = file.endsWith(".mp4");
  const tmp = file.replace(/\.(mp3|mp4)$/, ".norm.$1");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", file,
    "-af", `loudnorm=I=${target}:TP=-1.5:LRA=11:measured_I=${s.input_i}:measured_TP=${s.input_tp}:measured_LRA=${s.input_lra}:measured_thresh=${s.input_thresh}:offset=${s.target_offset}:linear=true`,
    // video: copy the picture untouched, re-encode only the audio track
    ...(isVideo ? ["-c:v", "copy", "-c:a", "aac", "-ar", "48000", "-b:a", "192k", "-movflags", "+faststart"] : ["-ar", "44100", "-b:a", "192k"]),
    tmp,
  ]);
  rmSync(file);
  renameSync(tmp, file);
  return { before: Number(s.input_i), after: integratedLufs(file) };
}
