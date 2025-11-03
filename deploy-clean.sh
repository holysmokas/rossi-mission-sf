#!/bin/bash
set -e

# ==== CONFIG ====
SITE_URL="https://holysmokas.github.io/rossi-mission-sf/"
# =================

echo "🚀 Checking for changes before deploying Rossi Mission SF..."

# Abort any half-finished rebase or merge
git rebase --abort 2>/dev/null || true
git merge --abort 2>/dev/null || true

# Ensure we're on main
git checkout main

# Fetch and reset to latest remote main
git fetch origin
git reset --hard origin/main

# ==== Detect source changes ====
# Only rebuild if src/, public/, vite.config.js, or index.html changed
if git diff --quiet HEAD@{1} -- src public vite.config.js index.html package.json; then
  echo "🟢 No source changes detected. Skipping rebuild and deploy."
  echo "🌐 Site is already up to date: $SITE_URL"
  open "$SITE_URL" 2>/dev/null || xdg-open "$SITE_URL" 2>/dev/null || echo "✅ Open manually: $SITE_URL"
  exit 0
fi

# ==== Build ====
echo "🏗️  Building updated site..."
npm run build

# Replace docs folder with new build
rm -rf docs
mkdir docs
cp -r dist/* docs/

# ==== Update README timestamp ====
timestamp=$(date -u "+%Y-%m-%d %H:%M UTC")
if grep -q "<!--LAST_DEPLOY-->" README.md; then
  sed -i '' "s|<!--LAST_DEPLOY-->.*<!--END_LAST_DEPLOY-->|<!--LAST_DEPLOY--> $timestamp <!--END_LAST_DEPLOY-->|" README.md
else
  echo "<!--LAST_DEPLOY--> $timestamp <!--END_LAST_DEPLOY-->" >> README.md
fi

# ==== Commit & Push ====
git add docs README.md
if git diff --cached --quiet; then
  echo "🟡 Nothing new to commit after build."
else
  last_msg=$(git log -1 --pretty=%s)
  git commit -m "Manual deploy ($timestamp, triggered by: $last_msg)"
  git push origin main
  echo "✅ Deployment committed and pushed."
fi

# ==== Open site ====
echo "🌐 Opening deployed site: $SITE_URL"
open "$SITE_URL" 2>/dev/null || xdg-open "$SITE_URL" 2>/dev/null || echo "✅ Open manually: $SITE_URL"

echo "✅ Deployment complete!"
