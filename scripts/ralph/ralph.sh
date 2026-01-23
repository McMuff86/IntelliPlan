#!/bin/bash
#
# Ralph - Autonomous Amp Loop for IntelliPlan
# Based on Geoffrey Huntley's Ralph pattern: https://ghuntley.com/ralph/
#
# Usage: ./scripts/ralph/ralph.sh [max_iterations]
#

set -e

# Configuration
MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROMPT_FILE="$SCRIPT_DIR/prompt.md"
PRD_FILE="$PROJECT_ROOT/prd.json"
PROGRESS_FILE="$PROJECT_ROOT/progress.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Ralph - IntelliPlan          ║${NC}"
echo -e "${BLUE}║      Autonomous Development Loop       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    if ! command -v amp &> /dev/null; then
        echo -e "${RED}Error: 'amp' CLI not found. Install from https://ampcode.com${NC}"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: 'jq' not found. Install with: brew install jq (macOS) or choco install jq (Windows)${NC}"
        exit 1
    fi

    if [ ! -f "$PRD_FILE" ]; then
        echo -e "${RED}Error: prd.json not found at $PRD_FILE${NC}"
        exit 1
    fi

    if [ ! -f "$PROMPT_FILE" ]; then
        echo -e "${RED}Error: prompt.md not found at $PROMPT_FILE${NC}"
        exit 1
    fi
    
    # Check for Python 3 (required for beads scripts)
    if ! command -v python3 &> /dev/null; then
        echo -e "${YELLOW}Warning: python3 not found. Beads scripts will not work.${NC}"
    fi
}

# Validate beads JSON integrity
bead_check() {
    echo -e "${BLUE}Checking bead integrity...${NC}"
    
    # Check prd.json
    if ! jq empty "$PRD_FILE" 2>/dev/null; then
        echo -e "${RED}✗ Error: prd.json is not valid JSON${NC}"
        return 1
    fi
    
    # Check required fields in prd.json
    if ! jq -e '.name' "$PRD_FILE" >/dev/null 2>&1; then
        echo -e "${RED}✗ Error: prd.json missing 'name' field${NC}"
        return 1
    fi
    
    if ! jq -e '.userStories' "$PRD_FILE" >/dev/null 2>&1; then
        echo -e "${RED}✗ Error: prd.json missing 'userStories' array${NC}"
        return 1
    fi
    
    # Check each user story has required fields
    local story_count=$(jq '.userStories | length' "$PRD_FILE")
    for ((i=0; i<story_count; i++)); do
        if ! jq -e ".userStories[$i].id" "$PRD_FILE" >/dev/null 2>&1; then
            echo -e "${RED}✗ Error: Story $i missing 'id' field${NC}"
            return 1
        fi
        # Check passes field exists (can be true or false)
        if ! jq -e ".userStories[$i] | has(\"passes\")" "$PRD_FILE" >/dev/null 2>&1; then
            echo -e "${RED}✗ Error: Story $i missing 'passes' field${NC}"
            return 1
        fi
    done
    
    # Check progress.txt exists
    if [ ! -f "$PROGRESS_FILE" ]; then
        echo -e "${YELLOW}⚠ Warning: progress.txt not found, will be created${NC}"
    fi
    
    echo -e "${GREEN}✓ Beads are valid${NC}"
    return 0
}

# Check if all stories are complete
check_completion() {
    local incomplete=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
    if [ "$incomplete" -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Get next story to work on
get_next_story() {
    jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0] | "\(.id): \(.title)"' "$PRD_FILE"
}

# Archive previous run if branch changed
check_and_archive() {
    local current_branch=$(jq -r '.branchName' "$PRD_FILE")
    local archive_marker="$PROJECT_ROOT/.ralph-branch"
    
    if [ -f "$archive_marker" ]; then
        local previous_branch=$(cat "$archive_marker")
        if [ "$previous_branch" != "$current_branch" ]; then
            echo -e "${YELLOW}Branch changed from $previous_branch to $current_branch${NC}"
            echo -e "${YELLOW}Archiving previous run...${NC}"
            
            local archive_dir="$PROJECT_ROOT/archive/$(date +%Y-%m-%d)-${previous_branch#feature/}"
            mkdir -p "$archive_dir"
            
            # Archive progress file if it exists
            if [ -f "$PROGRESS_FILE" ]; then
                cp "$PROGRESS_FILE" "$archive_dir/"
            fi
            
            # Reset progress file
            cat > "$PROGRESS_FILE" << 'EOF'
# IntelliPlan - Ralph Progress Log

## Codebase Patterns
<!-- Add reusable patterns here as they are discovered -->

---

## Iteration Log
<!-- Each Ralph iteration appends its progress below -->
EOF
        fi
    fi
    
    echo "$current_branch" > "$archive_marker"
}

# Create feature branch if needed
setup_branch() {
    local branch_name=$(jq -r '.branchName' "$PRD_FILE")
    local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    
    if [ "$current_branch" != "$branch_name" ]; then
        echo -e "${YELLOW}Switching to branch: $branch_name${NC}"
        
        # Check if branch exists
        if git show-ref --verify --quiet "refs/heads/$branch_name"; then
            git checkout "$branch_name"
        else
            git checkout -b "$branch_name"
        fi
    fi
}

# Main loop
main() {
    check_prerequisites
    
    cd "$PROJECT_ROOT"
    
    # Validate beads before starting
    if ! bead_check; then
        echo -e "${RED}Bead validation failed. Fix errors before continuing.${NC}"
        exit 1
    fi
    
    # Version beads at start of run
    if command -v python3 &> /dev/null; then
        echo -e "${BLUE}Versioning beads...${NC}"
        python3 "$SCRIPT_DIR/../beads/version_beads.py" 2>/dev/null || echo -e "${YELLOW}⚠ Warning: Beads versioning failed${NC}"
    fi
    
    check_and_archive
    setup_branch
    
    echo -e "${GREEN}Starting Ralph loop (max $MAX_ITERATIONS iterations)${NC}"
    echo ""
    
    for ((i=1; i<=MAX_ITERATIONS; i++)); do
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}Iteration $i of $MAX_ITERATIONS${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # Re-validate beads before each iteration
        if ! bead_check; then
            echo -e "${RED}Bead validation failed in iteration $i${NC}"
            exit 1
        fi
        
        # Check if complete
        if check_completion; then
            echo -e "${GREEN}✓ All stories complete!${NC}"
            echo -e "${GREEN}<promise>COMPLETE</promise>${NC}"
            exit 0
        fi
        
        # Show next story
        local next_story=$(get_next_story)
        echo -e "${YELLOW}Next story: $next_story${NC}"
        echo ""
        
        # Read the prompt
        local prompt=$(cat "$PROMPT_FILE")
        
        # Run Amp with the prompt
        echo -e "${BLUE}Spawning Amp instance...${NC}"
        
        # Run amp with the prompt file
        amp --prompt-file "$PROMPT_FILE"
        
        local amp_exit_code=$?
        
        if [ $amp_exit_code -ne 0 ]; then
            echo -e "${RED}Amp exited with error code $amp_exit_code${NC}"
            echo -e "${YELLOW}Continuing to next iteration...${NC}"
        fi
        
        # Deduplicate progress.txt after iteration (if Python available)
        if command -v python3 &> /dev/null && [ -f "$PROJECT_ROOT/scripts/beads/deduplicate_progress.py" ]; then
            echo -e "${BLUE}Deduplicating progress.txt...${NC}"
            python3 "$PROJECT_ROOT/scripts/beads/deduplicate_progress.py" 2>/dev/null || echo -e "${YELLOW}⚠ Warning: Deduplication skipped${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}Iteration $i complete${NC}"
        echo ""
        
        # Small delay between iterations
        sleep 2
    done
    
    echo -e "${YELLOW}Reached maximum iterations ($MAX_ITERATIONS)${NC}"
    
    # Show remaining stories
    local remaining=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
    echo -e "${YELLOW}Remaining stories: $remaining${NC}"
}

# Run main
main "$@"
