#!/usr/bin/env bash
# Bumps the ?v= cache-busting stamp on CSS/JS links and on every ES-module import.
# Usage: bash scripts/bump-version.sh 8
set -euo pipefail
cd "$(dirname "$0")/.."
V="${1:?usage: bump-version.sh <number>}"
sed -i -E "s#(main\.(css|js))\?v=[0-9]+#\1?v=$V#g" index.html privacy.html 404.html
sed -i -E "s#(from \"\./modules/[a-z-]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g" assets/js/main.js
sed -i -E "s#(from \"\./[a-z-]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g" assets/js/modules/*.js
echo "Version stamps set to v=$V"
