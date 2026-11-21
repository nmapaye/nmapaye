#!/bin/bash
# Install or update the weekly-note LaunchAgent on this Mac.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
BASE="$HOME/Library/Application Support/nmapaye-notes"
PIPE="$BASE/pipeline"
mkdir -p "$BASE" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs/nmapaye-notes"
if [[ -d "$PIPE/.git" ]]; then
  git -C "$PIPE" fetch -q origin && git -C "$PIPE" checkout -q "${1:-origin/main}"
else
  gh repo clone nmapaye/nmapaye "$PIPE" -- -q
  git -C "$PIPE" checkout -q "${1:-origin/main}"
fi
PLIST="$HOME/Library/LaunchAgents/com.nmapaye.weekly-note.plist"
cp "$PIPE/scripts/notes/com.nmapaye.weekly-note.plist" "$PLIST"
launchctl bootout "gui/$(id -u)/com.nmapaye.weekly-note" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl print "gui/$(id -u)/com.nmapaye.weekly-note" | grep -E 'state|path' | head -3
echo "installed from $(git -C "$PIPE" rev-parse --short HEAD)"
