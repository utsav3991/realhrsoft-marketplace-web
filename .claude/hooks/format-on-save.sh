#!/usr/bin/env bash
# PostToolUse hook (Edit|Write matcher).
# Runs prettier on any TypeScript/TSX file that was just touched.
set -euo pipefail

payload="$(cat)"
file_path="$(echo "$payload" | python3 -c \
  'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))' \
  2>/dev/null || true)"

[ -z "$file_path" ] && exit 0
[ -f "$file_path" ] || exit 0

case "$file_path" in
  partner-portal/*.ts|partner-portal/*.tsx|\
  partner-portal/**/*.ts|partner-portal/**/*.tsx|\
  employer-portal/*.ts|employer-portal/*.tsx|\
  employer-portal/**/*.ts|employer-portal/**/*.tsx|\
  admin-console/*.ts|admin-console/*.tsx|\
  admin-console/**/*.ts|admin-console/**/*.tsx|\
  employee-embed/*.ts|employee-embed/*.tsx|\
  employee-embed/**/*.ts|employee-embed/**/*.tsx)
    # Determine which portal this file belongs to
    portal_dir="$(echo "$file_path" | cut -d/ -f1)"
    rel_path="$(realpath --relative-to="$portal_dir" "$file_path" 2>/dev/null || echo "$file_path")"
    (cd "$portal_dir" && npx prettier --write "$rel_path" 2>/dev/null) || true
    ;;
esac

exit 0
