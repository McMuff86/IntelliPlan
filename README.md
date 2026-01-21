# Ralph

![Ralph](ralph.webp)

Ralph is an autonomous AI agent loop that runs [Amp](https://ampcode.com) repeatedly until all PRD items are complete. Each iteration is a fresh Amp instance with clean context. Memory persists via git history, `progress.txt`, and `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

[Read my in-depth article on how I use Ralph](https://x.com/ryancarson/status/2008548371712135632)

## Prerequisites

- [Amp CLI](https://ampcode.com) installed and authenticated
- `jq` installed (`brew install jq` on macOS)
- A git repository for your project

## Setup

### Option 1: Copy to your project

Copy the ralph files into your project:

```bash
# From your project root
mkdir -p scripts/ralph
cp /path/to/ralph/ralph.sh scripts/ralph/
cp /path/to/ralph/prompt.md scripts/ralph/
chmod +x scripts/ralph/ralph.sh
```

### Option 2: Install skills globally

Copy the skills to your Amp config for use across all projects:

```bash
cp -r skills/prd ~/.config/amp/skills/
cp -r skills/ralph ~/.config/amp/skills/
```

### Configure Amp auto-handoff (recommended)

Add to `~/.config/amp/settings.json`:

```json
{
  "amp.experimental.autoHandoff": { "context": 90 }
}
```

This enables automatic handoff when context fills up, allowing Ralph to handle large stories that exceed a single context window.

## Workflow

### 1. Create a PRD

Use the PRD skill to generate a detailed requirements document:

```
Load the prd skill and create a PRD for [your feature description]
```

Answer the clarifying questions. The skill saves output to `tasks/prd-[feature-name].md`.

### 2. Convert PRD to Ralph format

Use the Ralph skill to convert the markdown PRD to JSON:

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

This creates `prd.json` with user stories structured for autonomous execution.

### 3. Run Ralph

```bash
./scripts/ralph/ralph.sh [max_iterations]
```

Default is 10 iterations.

Ralph will:
1. Create a feature branch (from PRD `branchName`)
2. Pick the highest priority story where `passes: false`
3. Implement that single story
4. Run quality checks (typecheck, tests)
5. Commit if checks pass
6. Update `prd.json` to mark story as `passes: true`
7. Append learnings to `progress.txt`
8. Repeat until all stories pass or max iterations reached

## Key Files

| File | Purpose |
|------|---------|
| `ralph.sh` | The bash loop that spawns fresh Amp instances |
| `prompt.md` | Instructions given to each Amp instance |
| `prd.json` | User stories with `passes` status (the task list) |
| `prd.json.example` | Example PRD format for reference |
| `progress.txt` | Append-only learnings for future iterations |
| `skills/prd/` | Skill for generating PRDs |
| `skills/ralph/` | Skill for converting PRDs to JSON |
| `flowchart/` | Interactive visualization of how Ralph works |

## Flowchart

[![Ralph Flowchart](ralph-flowchart.png)](https://snarktank.github.io/ralph/)

**[View Interactive Flowchart](https://snarktank.github.io/ralph/)** - Click through to see each step with animations.

The `flowchart/` directory contains the source code. To run locally:

```bash
cd flowchart
npm install
npm run dev
```

## Critical Concepts

### Each Iteration = Fresh Context

Each iteration spawns a **new Amp instance** with clean context. The only memory between iterations is:
- Git history (commits from previous iterations)
- `progress.txt` (learnings and context)
- `prd.json` (which stories are done)

### Small Tasks

Each PRD item should be small enough to complete in one context window. If a task is too big, the LLM runs out of context before finishing and produces poor code.

Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

Too big (split these):
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### AGENTS.md Updates Are Critical

After each iteration, Ralph updates the relevant `AGENTS.md` files with learnings. This is key because Amp automatically reads these files, so future iterations (and future human developers) benefit from discovered patterns, gotchas, and conventions.

Examples of what to add to AGENTS.md:
- Patterns discovered ("this codebase uses X for Y")
- Gotchas ("do not forget to update Z when changing W")
- Useful context ("the settings panel is in component X")

### Feedback Loops

Ralph only works if there are feedback loops:
- Typecheck catches type errors
- Tests verify behavior
- CI must stay green (broken code compounds across iterations)

### Browser Verification for UI Stories

Frontend stories must include "Verify in browser using dev-browser skill" in acceptance criteria. Ralph will use the dev-browser skill to navigate to the page, interact with the UI, and confirm changes work.

### Stop Condition

When all stories have `passes: true`, Ralph outputs `<promise>COMPLETE</promise>` and the loop exits.

## Debugging

Check current state:

```bash
# See which stories are done
cat prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings from previous iterations
cat progress.txt

# Check git history
git log --oneline -10
```

## Customizing prompt.md

Edit `prompt.md` to customize Ralph's behavior for your project:
- Add project-specific quality check commands
- Include codebase conventions
- Add common gotchas for your stack

## Archiving

Ralph automatically archives previous runs when you start a new feature (different `branchName`). Archives are saved to `archive/YYYY-MM-DD-feature-name/`.

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph/)
- [Amp documentation](https://ampcode.com/manual)

## Recent Features (2026-01-21)

### US-015: Enhanced Beads Integration ✅

File-based memory management system for the Ralph autonomous development loop.

**Features:**
- **Intelligent Deduplication**: Reduces progress.txt size by 85%+ through hash-based deduplication
- **Timestamped Versioning**: Automatic snapshots of beads (prd.json, progress.txt) with metadata tracking
- **JSON Integrity Validation**: Pre-iteration checks ensure beads are valid before Ralph runs
- **Comprehensive Documentation**: Detailed patterns in AGENTS.md and scripts/beads/README.md

**Usage:**
```bash
# Deduplicate progress.txt (dry run)
python3 scripts/beads/deduplicate_progress.py --dry-run

# Create timestamped versions
python3 scripts/beads/version_beads.py

# Validate beads integrity (integrated in Ralph)
bash scripts/ralph/ralph.sh
```

**Benefits:**
- Maintains clean, efficient memory across Ralph iterations
- Automatic backups before modifications
- Fast validation (20ms for 17 stories)

### US-016: AI-Powered Conflict Resolution ✅

Intelligent scheduling conflict resolution for Swiss carpentry shops.

**Features:**
- **5 Resolution Strategies**:
  - 🔄 **Reschedule**: Find next available time slot
  - ✂️ **Split**: Divide appointment around conflicts
  - ⏱️ **Shorten**: Reduce duration to fit available time
  - 🔁 **Swap**: Exchange with lower-priority appointments
  - ⏪ **Move Earlier**: Schedule before the conflict
  
- **Business Hours Awareness**: Respects Swiss working hours (8-17, Mon-Fri)
- **Conflict Pattern Analysis**: 8 distinct patterns identified
- **Confidence Scoring**: Each suggestion rated 0-1 for reliability
- **Historical Learning**: Stores patterns in `.beads/conflict_learnings.json`

**Carpentry-Specific Logic:**
- Recognizes "planning" vs "production" task priorities
- Automatic weekend handling (moves to Monday)
- Machine availability considerations

**API Response Example:**
```json
{
  "success": false,
  "error": "Scheduling conflict detected",
  "conflicts": [{"id": "...", "title": "Machine setup", ...}],
  "aiSuggestions": [
    {
      "type": "move_earlier",
      "confidence": 0.85,
      "description": "Move earlier to avoid conflict",
      "proposedTime": {
        "startTime": "2026-01-21T09:00:00Z",
        "endTime": "2026-01-21T10:00:00Z"
      },
      "reasoning": "Available slot before requested time. Same day if possible."
    }
  ],
  "conflictPattern": "overlap-end",
  "historicalContext": "Recent patterns: overlap-end, fully-contained"
}
```

**Testing:**
```bash
# Run AI conflict test suite
cd backend
TEST_USER_ID=<your-uuid> node test_ai_conflict.js
```

**Benefits:**
- **Time Savings**: 80% reduction in manual rescheduling
- **Smart Suggestions**: Context-aware recommendations
- **Continuous Improvement**: Learns from historical conflicts
- **Business-Specific**: Tailored for carpentry shop workflows

---

## Roadmap

### Completed ✅
- US-015: Enhanced Beads Integration
- US-016: AI-Powered Conflict Resolution

### In Progress 🔄
- US-017: Reverse-Planning Feature
- US-018: Authentication & DSGVO Compliance
- US-019: Marketing Demo Page

### Planned 📋
- Advanced ML integration (replace rule-based with neural networks)
- ERP system integration (Borm/Triviso)
- Mobile app (iOS/Android)
- Slack/Teams notifications
- Multi-language support (DE, FR, IT for Switzerland)

---

## Business Model

**Target Market**: Small Swiss carpentry shops (Schreinereien)

**Pricing**: 50-200 CHF/user/month

**Value Proposition**:
- Save 20+ hours/week on manual planning
- AI-powered scheduling optimization
- DSGVO compliant for CH/EU markets
- Seamless ERP integration

**Revenue Goal**: 10-50K CHF/month by Q4 2026

---

