#!/bin/bash

# Sync Claude skills to all projects in parent directory
# Usage: ./scripts/sync-claude-skills.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_PROJECT="$(dirname "$SCRIPT_DIR")"
PROJECTS_DIR="$(dirname "$SOURCE_PROJECT")"

# Skills to sync
SKILLS=(
  "prd-implementation"
  "pr-review"
  "context-building"
)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Source project: $SOURCE_PROJECT"
echo "Projects directory: $PROJECTS_DIR"
echo ""

# Function to process a single project
process_project() {
  local project_dir="$1"
  local display_name="$2"

  # Skip the source project
  if [ "$project_dir" = "$SOURCE_PROJECT" ] || [ "$project_dir" = "$SOURCE_PROJECT/" ]; then
    return
  fi

  # Check if it's a git repo (create .claude/skills if needed)
  if [ -d "$project_dir/.git" ]; then
    # Create .claude/skills if it doesn't exist
    if [ ! -d "$project_dir/.claude/skills" ]; then
      mkdir -p "$project_dir/.claude/skills"
      echo -e "  ${YELLOW}Created .claude/skills directory${NC}"
    fi
    echo -e "${GREEN}Processing: $display_name${NC}"

    # Copy skills
    for skill in "${SKILLS[@]}"; do
      source_skill="$SOURCE_PROJECT/.claude/skills/$skill"
      dest_skill="$project_dir/.claude/skills/$skill"

      if [ -d "$source_skill" ]; then
        mkdir -p "$dest_skill"
        cp -r "$source_skill"/* "$dest_skill/"
        echo "  - Copied skill: $skill"
      fi
    done

    # Remove .cursor folder if exists
    if [ -d "$project_dir/.cursor" ]; then
      rm -rf "$project_dir/.cursor"
      echo -e "  ${YELLOW}- Removed .cursor folder${NC}"
    fi

    # Commit changes if there are any
    cd "$project_dir"
    if [ -n "$(git status --porcelain .claude/skills/ .cursor 2>/dev/null)" ]; then
      git add .claude/skills/ 2>/dev/null || true
      git add .cursor 2>/dev/null || true

      # Check if there are staged changes
      if [ -n "$(git diff --cached --name-only)" ]; then
        git commit -m "feat: sync claude skills from saas-boilerplate

Add/update skills:
- prd-implementation: PRD implementation standards with checkpoint reviews
- pr-review: Structured PR review with scoring
- context-building: Systematic codebase investigation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>" || true
        echo -e "  ${GREEN}Committed changes${NC}"
      fi
    else
      echo "  - No changes to commit"
    fi

    cd "$PROJECTS_DIR"
    echo ""
  fi
}

# Loop through all directories in projects folder
for project_dir in "$PROJECTS_DIR"/*/; do
  project_name=$(basename "$project_dir")

  # Process top-level project
  process_project "${project_dir%/}" "$project_name"

  # Also check for nested subprojects (e.g., rpg-engine/rpg-api)
  for subproject_dir in "$project_dir"*/; do
    if [ -d "$subproject_dir" ]; then
      subproject_name=$(basename "$subproject_dir")
      process_project "${subproject_dir%/}" "$project_name/$subproject_name"
    fi
  done
done

echo -e "${GREEN}Done!${NC}"
