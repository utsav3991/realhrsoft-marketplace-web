#!/usr/bin/env bash
# PostToolUse hook (Edit|Write matcher): run Prettier on a touched source file in this project.
set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | python3 -c \
  'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' \
  2>/dev/null || true)"

[ -n "$file_path" ] && [ -f "$file_path" ] || exit 0

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
case "$file_path" in
  "$project_dir"/src/generated/*) exit 0 ;;
  "$project_dir"/*.ts | "$project_dir"/*.tsx | "$project_dir"/*.css | "$project_dir"/*.mjs | \
  "$project_dir"/*.json | "$project_dir"/*.md)
    (cd "$project_dir" && yarn prettier --write --log-level warn "$file_path") || true
    ;;
esac

exit 0
