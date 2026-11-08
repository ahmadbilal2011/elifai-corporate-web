#!/usr/bin/env bash
# Packages only the files the web server needs into dist/elifai-public_html.zip
# Usage: bash scripts/build-zip.sh
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="dist/elifai-public_html.zip"
mkdir -p dist
rm -f "$OUT"

zip -r -q -X "$OUT" \
  .htaccess index.html privacy.html 404.html contact.php vendor-news.php \
  robots.txt sitemap.xml site.webmanifest assets ar insights \
  -x "*.DS_Store" "*/Thumbs.db"

echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
unzip -l "$OUT" | tail -n 1
