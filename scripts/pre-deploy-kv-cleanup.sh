#!/bin/bash
# Pre-deploy KV cleanup — removes legacy vote keys from Upstash before Phase 1
# (and any future rename) deploys. Protects against bifurcated vote data where
# old keys like "votes:taps:morning" linger and pollute the /admin/votes view.
#
# Uses SCAN with pagination (never KEYS — that blocks the instance under load).
# Run manually before deploying a rename, or wire into a Vercel deploy hook.
#
# Required env:
#   KV_REST_API_URL (or UPSTASH_REDIS_REST_URL)
#   KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_TOKEN)

set -euo pipefail

BASE="${KV_REST_API_URL:-${UPSTASH_REDIS_REST_URL:-}}"
TOK="${KV_REST_API_TOKEN:-${UPSTASH_REDIS_REST_TOKEN:-}}"

if [[ -z "$BASE" || -z "$TOK" ]]; then
  echo "error: KV_REST_API_URL and KV_REST_API_TOKEN must be set" >&2
  exit 1
fi

# Legacy key prefixes to purge. Add new prefixes here whenever a rename lands.
LEGACY_PREFIXES=(
  "votes:taps:morning"
  "votes:taps:velocity"
  "votes:taps:stack"
  "votes:people:morning"
  "votes:people:velocity"
  "votes:people:stack"
)

scan_and_delete() {
  local pattern="$1"
  local cursor="0"
  local deleted=0

  while :; do
    # SCAN returns [new_cursor, [keys...]]
    local resp
    resp=$(curl -fsS -H "Authorization: Bearer $TOK" \
      "$BASE/scan/$cursor/match/${pattern}*/count/100")

    cursor=$(echo "$resp" | jq -r '.result[0]')
    local keys
    keys=$(echo "$resp" | jq -r '.result[1][]' 2>/dev/null || true)

    if [[ -n "$keys" ]]; then
      while IFS= read -r key; do
        [[ -z "$key" ]] && continue
        curl -fsS -X POST -H "Authorization: Bearer $TOK" \
          "$BASE/del/$key" >/dev/null
        deleted=$((deleted + 1))
      done <<< "$keys"
    fi

    [[ "$cursor" == "0" ]] && break
  done

  echo "  $pattern* → deleted $deleted keys"
}

echo "pre-deploy KV cleanup starting"
for prefix in "${LEGACY_PREFIXES[@]}"; do
  scan_and_delete "$prefix"
done
echo "done"
