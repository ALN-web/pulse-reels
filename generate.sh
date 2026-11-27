#!/usr/bin/env bash
# Live demo: one command -> one finished Reel.
#   ./generate.sh --topic "When a headache means see a doctor" --client pulse-health --mode character
# Creates runs/<slug>/ and hands the whole chain to Claude Code's /reel skill, headless.
# Re-running the same topic resumes from the files already on disk.
# Every agent action is streamed to runs/<slug>/agent.log; progress lines are printed here.
set -euo pipefail
cd "$(dirname "$0")"

TOPIC="" CLIENT="pulse-health" MODE="character" STYLE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --topic)  TOPIC="$2"; shift 2 ;;
    --client) CLIENT="$2"; shift 2 ;;
    --mode)   MODE="$2"; shift 2 ;;
    --style)  STYLE="$2"; shift 2 ;;   # motion: reuse a style theme, e.g. --style poster
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$TOPIC" ]] || { echo 'need --topic "..."' >&2; exit 2; }

# FFmpeg: also look in the per-user install folder (shells opened before the install don't have it on PATH).
if ! command -v ffmpeg >/dev/null; then
  for d in "${LOCALAPPDATA:-}"/Programs/ffmpeg/*/bin "$HOME"/AppData/Local/Programs/ffmpeg/*/bin; do
    [[ -x "$d/ffmpeg.exe" || -x "$d/ffmpeg" ]] && export PATH="$PATH:$d" && break
  done
fi
command -v ffmpeg >/dev/null || { echo "ffmpeg not found (winget install Gyan.FFmpeg)" >&2; exit 1; }
command -v claude >/dev/null || { echo "Claude Code CLI ('claude') not found" >&2; exit 1; }
[[ -z "${CLAUDECODE:-}" ]] || { echo "Run this from a normal terminal: Claude Code can't start inside another Claude Code session." >&2; exit 1; }
[[ -f .env ]] || { echo ".env missing: copy .env.example and add the ElevenLabs key" >&2; exit 1; }

SLUG=$(npm run -s new-run -- --topic "$TOPIC" --client "$CLIENT" --mode "$MODE")
LOG="runs/$SLUG/agent.log"
echo "run:  runs/$SLUG"
echo "log:  $LOG"

START=$(date +%s)
# Only the tools the pipeline needs. Anything else is denied (headless mode never prompts).
HINT=""
[[ -n "$STYLE" ]] && HINT=" Use storyboard styleId '$STYLE' (theme file clients/$CLIENT/styles/$STYLE.css); build the scene fragments with its variables and classes."
claude -p "/reel $TOPIC --client $CLIENT --mode $MODE (run slug: $SLUG).$HINT Look at the finished runs in runs/ for examples of scene fragments. Count list items before writing the hook. Every on-screen number must appear in a cited WHO/CDC/NHS page. Work fully autonomously; nobody will answer questions." \
  --output-format stream-json --verbose \
  --allowedTools "Bash(npm run:*)" "Bash(npm test:*)" "Bash(npx hyperframes:*)" "Bash(ffmpeg:*)" "Bash(ffprobe:*)" \
                 "Bash(mkdir:*)" "Bash(ls:*)" "Read" "Write" "Edit" "Glob" "Grep" "WebSearch" "WebFetch" "Skill" \
  > "$LOG" 2>&1 || true

# Progress summary from the stream (tool calls + final result).
node -e '
const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean);
let tools = 0, denied = 0, result = null;
for (const l of lines) {
  let m; try { m = JSON.parse(l); } catch { continue; }
  if (m.type === "assistant") for (const c of m.message?.content ?? []) if (c.type === "tool_use") tools++;
  if (m.type === "user") for (const c of m.message?.content ?? []) if (c.type === "tool_result" && /permission|not allowed|denied/i.test(JSON.stringify(c.content))) denied++;
  if (m.type === "result") result = m;
}
console.log(`agent: ${tools} tool calls, ${denied} denied` + (result ? `, ${result.num_turns} turns, $${(result.total_cost_usd ?? 0).toFixed(2)} model cost` : ", NO RESULT"));
if (result?.result) console.log("\n" + result.result.slice(-1500));
' "$LOG"

ELAPSED=$(( $(date +%s) - START ))
echo
if [[ -f "runs/$SLUG/reel.mp4" ]] && npm run -s validate -- "runs/$SLUG/compliance.json" >/dev/null 2>&1 \
   && node -e 'process.exit(require("./runs/'"$SLUG"'/compliance.json").final && require("./runs/'"$SLUG"'/compliance.json").passed ? 0 : 1)'; then
  echo "DONE in $((ELAPSED / 60))m $((ELAPSED % 60))s  ->  runs/$SLUG/reel.mp4 + post.txt"
else
  echo "NOT FINISHED after $((ELAPSED / 60))m $((ELAPSED % 60))s: see $LOG (re-run the same command to resume)" >&2
  exit 1
fi
