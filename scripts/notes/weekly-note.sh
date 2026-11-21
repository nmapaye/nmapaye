#!/bin/bash
# Weekly "what I worked on" note for nmapaye.com.
#
# Runs on Nathan's Mac from a LaunchAgent (com.nmapaye.weekly-note, Sundays 18:00).
#   1. Gathers last week's activity from PUBLIC nmapaye repos only (commits, merged PRs, releases).
#   2. Drafts one note with `claude -p` (falls back to `codex exec`) in Nathan's voice from WRITING_STYLE.md.
#   3. Puts it in src/content/writing/ on a branch, opens a PR, and merges it normally once
#      the required checks pass (auto-merge if the repo allows it), then dispatches the Pages deploy.
#
# Safety rails:
#   - No WRITING_STYLE.md            -> skip and log (never write in a generic voice).
#   - Style file still marked DRAFT  -> refuse to publish (dry runs still allowed).
#   - Private repos, coursework, job applications, secrets -> filtered out and re-checked after drafting.
#   - Nothing worth writing          -> skip the week.
#
# Usage: weekly-note.sh [--dry-run]
set -euo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
OWNER="nmapaye"
SITE_REPO="nmapaye/nmapaye"
WORK_DIR="${NOTES_WORK_DIR:-$HOME/Library/Application Support/nmapaye-notes}"
SITE_DIR="$WORK_DIR/site"
DRAFT_DIR="$WORK_DIR/drafts"
LOG_DIR="$HOME/Library/Logs/nmapaye-notes"
STYLE_FILE="${NOTES_STYLE_FILE:-$HOME/Developer/ai-context-hub/global/WRITING_STYLE.md}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/note-prompt.md"
TODAY="$(date +%Y-%m-%d)"
SINCE="$(date -v-7d +%Y-%m-%dT00:00:00Z 2>/dev/null || date -d '7 days ago' +%Y-%m-%dT00:00:00Z)"
# Never write about these, even if they ever become public.
DENY_REGEX='kenbunshoko|pandan-bot|daily-gospel|job[- _]?app|application|resume|coursework|homework|assignment|ucsc|canvas\.ucsc|exam|midterm|final[- ]exam|secret|token|password|api[_ -]?key'

mkdir -p "$DRAFT_DIR" "$LOG_DIR"
LOG="$LOG_DIR/$TODAY.log"
exec > >(tee -a "$LOG") 2>&1
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $*"; }
log "start (dry_run=$DRY_RUN since=$SINCE)"

# --- 1. Voice gate ------------------------------------------------------------
if [[ ! -s "$STYLE_FILE" ]]; then
  log "SKIP: $STYLE_FILE is missing or empty. Export the Muse writing style there to enable publishing."
  exit 0
fi
STYLE_IS_DRAFT=0
grep -q 'STYLE-STATUS: DRAFT' "$STYLE_FILE" && STYLE_IS_DRAFT=1
if [[ $STYLE_IS_DRAFT == 1 && $DRY_RUN == 0 ]]; then
  log "SKIP: $STYLE_FILE is still marked 'STYLE-STATUS: DRAFT'. Replace it with the Muse style (and remove the marker) to publish."
  exit 0
fi

gh auth status >/dev/null 2>&1 || { log "SKIP: gh is not authenticated."; exit 0; }

# --- 2. Gather public activity -------------------------------------------------
ACTIVITY="$WORK_DIR/activity-$TODAY.md"
PRIVATE_NAMES="$(gh repo list "$OWNER" --visibility private --limit 200 --json name --jq '.[].name' 2>/dev/null || true)"
PUBLIC_REPOS="$(gh repo list "$OWNER" --visibility public --source --limit 200 --json name,isArchived \
  --jq '.[] | select(.isArchived|not) | .name' | grep -Eiv "$DENY_REGEX" || true)"

: > "$ACTIVITY"
ITEMS=0
for repo in $PUBLIC_REPOS; do
  # Double-check visibility right before reading.
  [[ "$(gh api "repos/$OWNER/$repo" --jq '.private')" == "false" ]] || continue
  commits="$(gh api "repos/$OWNER/$repo/commits?since=$SINCE&author=$OWNER&per_page=50" \
    --jq '.[] | "- commit \(.sha[0:7]): \(.commit.message | split("\n")[0])"' 2>/dev/null || true)"
  prs="$(gh pr list -R "$OWNER/$repo" --state merged --search "merged:>=${SINCE%%T*}" --limit 30 \
    --json number,title,url --jq '.[] | "- merged PR #\(.number): \(.title) (\(.url))"' 2>/dev/null || true)"
  rels="$(gh api "repos/$OWNER/$repo/releases?per_page=10" \
    --jq ".[] | select(.draft|not) | select(.published_at >= \"$SINCE\") | \"- release \(.tag_name): \(.name // \"\") (\(.html_url))\"" 2>/dev/null || true)"
  block="$(printf '%s\n%s\n%s\n' "$commits" "$prs" "$rels" | sed '/^$/d' | grep -Eiv "$DENY_REGEX" || true)"
  if [[ -n "$block" ]]; then
    printf '## %s (https://github.com/%s/%s)\n%s\n\n' "$repo" "$OWNER" "$repo" "$block" >> "$ACTIVITY"
    ITEMS=$((ITEMS + $(printf '%s\n' "$block" | wc -l)))
  fi
done
log "public activity items: $ITEMS"
if (( ITEMS < 3 )); then
  log "SKIP: not enough public activity this week to write about."
  exit 0
fi

# --- 3. Draft ------------------------------------------------------------------
DRAFT="$DRAFT_DIR/$TODAY.md"
PROMPT="$(cat "$PROMPT_FILE")

<today>$TODAY</today>

<writing_style>
$(cat "$STYLE_FILE")
</writing_style>

<public_activity>
$(cat "$ACTIVITY")
</public_activity>"

draft_ok() { [[ -s "$DRAFT" ]] && head -1 "$DRAFT" | grep -q '^---$'; }
if command -v claude >/dev/null; then
  log "drafting with claude -p"
  printf '%s' "$PROMPT" | claude -p --output-format text > "$DRAFT" 2>>"$LOG" || true
fi
if ! draft_ok && command -v codex >/dev/null; then
  log "claude unavailable or failed; drafting with codex exec"
  printf '%s' "$PROMPT" | codex exec --skip-git-repo-check --sandbox read-only -o "$DRAFT" - >>"$LOG" 2>&1 || true
fi
if ! draft_ok; then
  if [[ -s "$DRAFT" ]] && grep -q '^SKIP' "$DRAFT"; then
    log "SKIP: model judged the week not worth a note: $(head -1 "$DRAFT")"; exit 0
  fi
  log "FAIL: no usable draft produced"; exit 1
fi

# --- 4. Privacy check on the draft --------------------------------------------
if grep -Eiq "$DENY_REGEX" "$DRAFT"; then
  log "BLOCKED: draft mentions a denied topic; not publishing. Draft kept at $DRAFT"; exit 1
fi
for name in $PRIVATE_NAMES; do
  if grep -Fiq "$name" "$DRAFT"; then
    log "BLOCKED: draft mentions private repo '$name'; not publishing. Draft kept at $DRAFT"; exit 1
  fi
done

if [[ $DRY_RUN == 1 ]]; then
  log "DRY RUN: draft written to $DRAFT (nothing published)"
  exit 0
fi

# --- 5. Publish via PR ----------------------------------------------------------
SLUG="week-$TODAY"
BRANCH="notes/auto-$TODAY"
if [[ ! -d "$SITE_DIR/.git" ]]; then
  gh repo clone "$SITE_REPO" "$SITE_DIR" -- -q
fi
cd "$SITE_DIR"
git fetch -q origin
git checkout -q -B "$BRANCH" origin/main
cp "$DRAFT" "src/content/writing/$SLUG.md"
git add "src/content/writing/$SLUG.md"
git -c user.name="Nathaniel Mapaye" -c user.email="nmapaye@users.noreply.github.com" \
  commit -q -m "Add weekly note for $TODAY"
git push -q -u origin "$BRANCH"
PR_URL="$(gh pr create -R "$SITE_REPO" --head "$BRANCH" --base main \
  --title "Weekly note: $TODAY" \
  --body "Automated weekly note from public activity since ${SINCE%%T*}. Written by scripts/notes/weekly-note.sh; privacy filters passed.")"
log "opened $PR_URL"

if gh pr merge "$PR_URL" --auto --merge >/dev/null 2>&1; then
  log "auto-merge enabled; waiting for it to land"
fi
# Wait for required checks, then merge normally (never --admin).
if gh pr checks "$PR_URL" --watch --required --interval 30 >/dev/null 2>&1; then
  state="$(gh pr view "$PR_URL" --json state --jq .state)"
  [[ "$state" == "MERGED" ]] || gh pr merge "$PR_URL" --merge
  log "merged $PR_URL"
  gh workflow run deploy.yml -R "$SITE_REPO" --ref main && log "dispatched Pages deploy"
else
  log "checks failed on $PR_URL; left open for Nathan"
  exit 1
fi
log "done"
