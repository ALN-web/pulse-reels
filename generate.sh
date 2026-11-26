#!/usr/bin/env bash
# Live demo: one command -> one Reel.
#   ./generate.sh --topic "When a headache means see a doctor" --client pulse-health --mode character
# Creates runs/<slug>/ and hands the whole chain to Claude Code's /reel skill (headless).
# Re-running the same topic resumes from the files already on disk.
set -euo pipefail
cd "$(dirname "$0")"

TOPIC="" CLIENT="pulse-health" MODE="character"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --topic)  TOPIC="$2"; shift 2 ;;
    --client) CLIENT="$2"; shift 2 ;;
    --mode)   MODE="$2"; shift 2 ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$TOPIC" ]] || { echo 'need --topic "..."' >&2; exit 2; }

command -v ffmpeg >/dev/null || echo "warning: ffmpeg not on PATH; voice/render steps will fail" >&2
command -v claude >/dev/null || { echo "Claude Code CLI ('claude') not found" >&2; exit 1; }

SLUG=$(npm run -s new-run -- --topic "$TOPIC" --client "$CLIENT" --mode "$MODE")
echo "run: runs/$SLUG"

START=$(date +%s)
claude -p "/reel $TOPIC --client $CLIENT --mode $MODE (run slug: $SLUG)" \
  --allowedTools "Bash(npm run *)" "Bash(npx hyperframes *)" "Bash(ffmpeg *)" Read Write Edit WebSearch
echo "done in $(( $(date +%s) - START ))s  ->  runs/$SLUG/reel.mp4"
