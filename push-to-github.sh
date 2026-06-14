#!/bin/bash
# BloomBloomGarden GitHub Push Script
# Usage: ./push-to-github.sh <GITHUB_TOKEN>

set -e

TOKEN="${1:?Usage: $0 <GITHUB_TOKEN>}"
REPO="yimeng2026/bloombloomgarden"
BRANCH="main"

cd "$(dirname "$0")"

# Set remote URL with token
git remote set-url origin "https://${TOKEN}@github.com/${REPO}.git"

# Force push (replaces old project with new Next.js project)
git push --force origin ${BRANCH}

echo "✅ Push complete!"
echo "Repo: https://github.com/${REPO}"

# Clean up token from remote URL
git remote set-url origin "https://github.com/${REPO}.git"
