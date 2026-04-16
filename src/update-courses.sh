#!/bin/bash
# Run this after adding/removing images in assets/courses/
# It regenerates manifest.json automatically.

DIR="assets/courses"
MANIFEST="$DIR/manifest.json"

echo "[" > "$MANIFEST"

first=true
for f in "$DIR"/*.{jpg,jpeg,png,gif,webp,bmp,svg}; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  # Strip extension for display name, replace dashes/underscores with spaces, collapse multiple spaces
  name=$(echo "${filename%.*}" | sed 's/[-_]/ /g; s/  */ /g')
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$MANIFEST"
  fi
  printf '  { "name": "%s", "file": "%s" }' "$name" "$filename" >> "$MANIFEST"
done

echo "" >> "$MANIFEST"
echo "]" >> "$MANIFEST"

echo "Updated $MANIFEST"
