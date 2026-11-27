#!/usr/bin/env bash
# Produce several Reels in a row with generate.sh. Each line of the topics file: mode|style|topic  (style may be empty).
#   ./batch.sh topics.txt
# A failed Reel doesn't stop the batch; re-running resumes unfinished runs from their files.
set -uo pipefail
cd "$(dirname "$0")"
FILE="${1:-topics.txt}"
exec > >(tee -a batch.log) 2>&1   # also keep a copy in batch.log
ok=0; fail=0
while IFS='|' read -r MODE STYLE TOPIC; do
  [[ -z "${TOPIC// }" || "$MODE" == \#* ]] && continue
  echo "================ $TOPIC ($MODE${STYLE:+, style $STYLE})"
  if ./generate.sh --topic "$TOPIC" --mode "$MODE" ${STYLE:+--style "$STYLE"} < /dev/null; then ok=$((ok+1)); else fail=$((fail+1)); fi
done < "$FILE"
echo "================ BATCH DONE: $ok finished, $fail not finished"
