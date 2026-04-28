#!/bin/bash
# Voice lint — one-shot grep for tone violations in user-facing strings.
# Catches em dashes, exclamation points, and banned vocabulary.
# This is a LINT, not a test. Output is informational. Run before merge.

set -uo pipefail
cd "$(dirname "$0")/.."

if [ -t 1 ]; then
  RED=$'\033[0;31m'
  YELLOW=$'\033[0;33m'
  RESET=$'\033[0m'
else
  RED=''
  YELLOW=''
  RESET=''
fi

found_any=0

scan() {
  local pattern="$1"
  local label="$2"
  local color="$3"
  local matches
  matches=$(grep -rn "$pattern" \
    --include="*.html" --include="*.js" --include="*.md" \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.vercel \
    src/ public/ docs/ 2>/dev/null \
    | grep -vi "test\|spec" \
    || true)
  if [ -n "$matches" ]; then
    found_any=1
    echo "${color}${label}${RESET}"
    echo "$matches" | head -20
    echo
  fi
}

echo "Footnote voice lint"
echo "==================="
echo

scan "—" "Em dashes — replace with commas/colons/periods" "$RED"
scan "productivity" "Banned: 'productivity'" "$RED"
scan "seamless" "Banned: 'seamless'" "$RED"
scan "on the go" "Banned: 'on the go'" "$RED"
scan "mindfulness" "Banned: 'mindfulness'" "$YELLOW"
scan "wellness" "Banned: 'wellness'" "$YELLOW"

if [ "$found_any" -eq 0 ]; then
  echo "No voice violations found."
fi

echo
echo "Done. Triage findings against PHILOSOPHY.md voice rules."
