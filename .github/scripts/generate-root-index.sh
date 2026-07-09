#!/usr/bin/env bash
# Generate the root index.html that lists all active targets (main/ and pr-<n>/) on gh-pages.
# Usage: generate-root-index.sh <gh-pages-checkout-dir>
set -euo pipefail

cd "$1"

{
  printf '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>todo-pomodoro previews</title>\n</head>\n<body>\n<h1>todo-pomodoro previews</h1>\n<ul>\n'
  for d in */; do
    d="${d%/}"
    if [ "$d" = "main" ] || printf '%s' "$d" | grep -qE '^pr-[0-9]+$'; then
      printf '<li><a href="%s/">%s</a></li>\n' "$d" "$d"
    fi
  done
  printf '</ul>\n</body>\n</html>\n'
} > index.html
