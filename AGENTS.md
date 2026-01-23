# IntelliPlan - Agent Instructions

## Overview

IntelliPlan is an advanced calendar and scheduling application with AI-powered features. This project uses the **Ralph pattern** - an autonomous AI agent loop that runs [Amp](https://ampcode.com) repeatedly until all PRD items are complete. Each iteration is a fresh Amp instance with clean context.

**Key Concepts:**

- **Ralph Loop**: Bash-based iteration system for Amp instances that processes small user stories
- **Memory Persistence**: Via git history, `progress.txt`, `prd.json`, and Beads (file-based memory system)
- **Fresh Context**: Each iteration spawns a new Amp instance to avoid hallucinations
- **Small Tasks**: Stories should be small enough to complete in one context window

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

## Project: IntelliPlan

### Goal

Develop a scalable, user-friendly application for planning, booking, reminders, and coordination of appointments, tasks, and meetings. Integrate AI for efficiency, e.g., predictive analytics and automated workflows.

### Tech Stack

- **Frontend**: React.js with Material-UI for responsive UI (Alternative: Vue.js)
- **Backend**: Node.js/Express with RESTful API (Alternative: Python/Flask for AI integrations)
- **Database**: PostgreSQL for relational data (Alternative: MongoDB)
- **AI Features**: TensorFlow.js or scikit-learn for ML; Hugging Face for NLP
- **Deployment**: Docker, Heroku or AWS

### Core Features (High Priority)

1. **Appointment Management**
   - Create/Edit/Delete with title, times, timezone
   - Overlap detection
   - Views: List/Calendar, Drag & Drop
   - AI Extension: ML-based conflict resolution

2. **Reminders**
   - Add reminders, predefined templates, ICS import
   - AI Extension: Personalized timing via ML

3. **Timezones & Time Management**
   - UTC storage, ISO 8601
   - AI Extension: Geolocation-based detection

4. **External Calendar Integration**
   - ICS import, Outlook/Google OAuth, Bidirectional sync
   - AI Extension: ML merge conflict resolution

5. **Search & Filtering**
   - Text search, time filters
   - AI Extension: Semantic search (BERT models)

6. **User Interface**
   - Views, themes, responsive
   - AI Extension: Adaptive layout (ML user behavior)

7. **Data Persistence**
   - Local storage
   - AI Extension: ML backup suggestions

8. **API & Technical Goals**
   - RESTful, idempotency
   - AI Extension: Prediction endpoints

### Medium Priority Features

- Participant management with AI invitation suggestions
- Comments on appointments with sentiment analysis
- Attachments/file uploads with ML categorization
- Labels/Tags with auto-tagging
- Advanced search & filters
- Availability checking with predictive ML
- Business hours & buffer times
- Audit logging with anomaly detection

### Nice-to-Have Features (Long-term)

- Task and project management
- Collaboration & communication
- Document management
- Visual views (Kanban, Gantt)
- Automations
- Time & resource management
- Reports & analytics
- Integrations (Slack, Drive)
- User & team management
- Mobile & offline support
- Advanced appointment features
- Security & compliance

## Prerequisites

- Node.js and npm installed
- PostgreSQL database running
- [Amp CLI](https://ampcode.com) installed and authenticated
- `jq` installed (`brew install jq` on macOS, `choco install jq` on Windows)
- Git repository initialized
- Beads installed (`pip install beads`) - optional but recommended for enhanced memory

## Setup

### 1. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: IntelliPlan project setup"
```

### 2. Configure Amp

Add to `~/.config/amp/settings.json`:

```json
{
  "amp.experimental.autoHandoff": { "context": 90 }
}
```

This enables automatic handoff when context fills up, allowing Ralph to handle large stories that exceed a single context window.

### 3. Create a PRD

Use the PRD skill to generate a detailed requirements document:

```
Load the prd skill and create a PRD for [your feature description]
```

Answer the clarifying questions. The skill saves output to `tasks/prd-[feature-name].md`.

### 4. Convert PRD to Ralph Format

Use the Ralph skill to convert the markdown PRD to JSON:

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

This creates `prd.json` with user stories structured for autonomous execution.

## Commands

```bash
# Run Ralph (from project root)
./scripts/ralph/ralph.sh [max_iterations]

# Default is 10 iterations
./scripts/ralph/ralph.sh

# Check current state
cat prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings from previous iterations
cat progress.txt

# Check git history
git log --oneline -10
```

## Key Files

| File                      | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `scripts/ralph/ralph.sh`  | The bash loop that spawns fresh Amp instances     |
| `scripts/ralph/prompt.md` | Instructions given to each Amp instance           |
| `prd.json`                | User stories with `passes` status (the task list) |
| `prd.json.example`        | Example PRD format for reference                  |
| `progress.txt`            | Append-only learnings for future iterations       |
| `AGENTS.md`               | This file - agent instructions and patterns       |

## Workflow

### Ralph Loop Process

1. **Create feature branch** (from PRD `branchName`)
2. **Pick highest priority story** where `passes: false`
3. **Load context** from `progress.txt` (especially Codebase Patterns section)
4. **Load relevant Beads** (if using Beads) for detailed context
5. **Implement** that single story
6. **Run quality checks** (typecheck, lint, tests)
7. **Browser verification** (for frontend stories - use dev-browser skill)
8. **Update AGENTS.md** if reusable patterns discovered
9. **Commit** if checks pass: `feat: [Story ID] - [Story Title]`
10. **Update PRD** to set `passes: true` for completed story
11. **Append progress** to `progress.txt`
12. **Repeat** until all stories pass or max iterations reached

### Agent Roles (Integrated in Ralph)

- **Planner-Agent**: Prioritizes in `prd.json`, creates/loads Beads
- **Coder-Agent**: Generates code, uses REPL for testing
- **Tester-Agent**: Runs tests (Unit, Integration), marks `passes: true`
- **Integrator-Agent**: Handles API integrations (Google/Outlook)
- **Reviewer-Agent**: Reviews code, updates AGENTS.md with learnings

## Critical Concepts

### Each Iteration = Fresh Context

Each iteration spawns a **new Amp instance** with clean context. The only memory between iterations is:

- Git history (commits from previous iterations)
- `progress.txt` (learnings and context)
- `prd.json` (which stories are done)
- Beads files (if using Beads for detailed memory)

### Small Tasks

Each PRD item should be small enough to complete in one context window. If a task is too big, the LLM runs out of context before finishing and produces poor code.

**Right-sized stories:**

- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

**Too big (split these):**

- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

### AGENTS.md Updates Are Critical

After each iteration, Ralph updates relevant `AGENTS.md` files with learnings. This is key because Amp automatically reads these files, so future iterations (and future human developers) benefit from discovered patterns, gotchas, and conventions.

**Examples of what to add to AGENTS.md:**

- Patterns discovered ("this codebase uses X for Y")
- Gotchas ("do not forget to update Z when changing W")
- Useful context ("the settings panel is in component X")
- API patterns or conventions specific to modules
- Dependencies between files
- Testing approaches for specific areas
- Configuration or environment requirements

### Progress.txt Structure

Always APPEND to `progress.txt` (never replace):

```
## [Date/Time] - [Story ID]
Thread: https://ampcode.com/threads/$AMP_CURRENT_THREAD_ID
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
```

**Codebase Patterns Section**: Add reusable patterns to the TOP of `progress.txt`:

```
## Codebase Patterns
- Use `sql<number>` template for aggregations
- Always use `IF NOT EXISTS` for migrations
- Export types from actions.ts for UI components
```

### Feedback Loops

Ralph only works if there are feedback loops:

- Typecheck catches type errors
- Tests verify behavior
- CI must stay green (broken code compounds across iterations)
- Browser verification for UI stories

### Browser Verification for UI Stories

Frontend stories must include "Verify in browser using dev-browser skill" in acceptance criteria. Ralph will use the dev-browser skill to navigate to the page, interact with the UI, and confirm changes work.

### Stop Condition

When all stories have `passes: true`, Ralph outputs `<promise>COMPLETE</promise>` and the loop exits.

## Beads Integration (Optional)

Beads provides file-based memory for detailed task context:

- **Create Beads**: `beads create` for each user story
- **Load Beads**: `beads load` to retrieve context in Ralph iterations
- **Update Beads**: `beads update` to save progress

In Ralph prompts: Use `beads load` for context, `beads update` for progress.

## Patterns

- Each iteration spawns a fresh Amp instance with clean context
- Memory persists via git history, `progress.txt`, `prd.json`, and Beads
- Stories should be small enough to complete in one context window
- Always update AGENTS.md with discovered patterns for future iterations
- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting

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

Edit `scripts/ralph/prompt.md` to customize Ralph's behavior for IntelliPlan:

- Add project-specific quality check commands
- Include codebase conventions
- Add common gotchas for your stack
- Reference IntelliPlan-specific patterns

## Quick Start

For detailed setup instructions, see:

- **[README.md](README.md)**: End-user documentation and quick start guide
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: Developer setup, patterns, and best practices
- **[scripts/ralph/README.md](scripts/ralph/README.md)**: Ralph autonomous agent documentation

### Quick Reference

**Start Development Servers:**

```bash
# Windows
.\start-dev.ps1

# Linux/macOS
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2
```

**Database Setup:**

```bash
docker compose up -d     # Start PostgreSQL
cd backend
npm run migrate          # Run migrations
npm run seed:user        # Create test user
```

**URLs:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Archiving

Ralph automatically archives previous runs when you start a new feature (different `branchName`). Archives are saved to `archive/YYYY-MM-DD-feature-name/`.

## Next Steps

Based on `prd.json`, the following user stories are ready for implementation (ordered by priority):

### High Priority
1. **US-TP-011**: Optional Reminders per Task/Work Slot
   - Toggle reminder on/off per work slot or task
   - Reminder-only functionality (no hard appointment binding)
   - Dependencies: US-TP-004 (Manual Time Slots)

2. **US-TP-012**: Working Time Templates
   - Templates for Mon-Fri 8-17 with optional weekends
   - Save templates per project for faster planning
   - Dependencies: US-TP-002 (Project CRUD)

3. **US-017**: Reverse-Planning Feature for Carpentry Use Case
   - POST /api/appointments/reverse-plan endpoint
   - Input: end-date, resources, tasks list
   - Output: optimized schedule working backwards
   - Greedy algorithm with date-fns
   - Frontend: "Optimize Schedule" button in CalendarView
   - Dependencies: US-TP-001 (Database Schema)

4. **US-018**: Authentication and DSGVO Compliance Basics
   - Supabase Auth integration in frontend
   - requireUserId middleware in backend
   - Soft data encryption for sensitive beads
   - Timezone handling compliant with CH regulations

5. **US-019**: Create Inbound Marketing Hook
   - /demo route in frontend showcasing features
   - Shareable PDF export using jsPDF
   - Demo calendar with sample Swiss carpentry shop data
   - Call-to-action for 50-200 CHF/user pricing
   - Dependencies: US-017 (Reverse-Planning)

### Running Ralph

To continue implementation:

```bash
# Check current status
cat prd.json | jq '.userStories[] | select(.passes == false) | {id, title, priority}'

# Run Ralph to implement next story
./scripts/ralph/ralph.sh 10
```

See [scripts/ralph/README.md](scripts/ralph/README.md) for detailed Ralph documentation.

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph/)
- [Amp documentation](https://ampcode.com/manual)
- [Beads documentation](https://github.com/steveyegge/beads)

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Beads Integration Patterns (US-015)

### Overview

Enhanced Beads integration provides automatic deduplication, versioning, and validation for the Ralph loop's file-based memory system. These patterns ensure efficient memory management across iterations.

### Core Components

#### 1. Progress.txt Deduplication (`scripts/beads/deduplicate_progress.py`)

- **Purpose**: Reduces progress.txt size by deduplicating learnings and summarizing older iterations
- **Target**: 20%+ size reduction (typically achieves 85%+)
- **When to run**: After each Ralph iteration (automatic in ralph.sh)
- **Key features**:
  - Keeps last 5 iterations in full detail
  - Consolidates older learnings into "Historical Learnings Summary"
  - Creates timestamped backups in `backups/` directory
  - Hash-based deduplication prevents redundancy

**Usage:**

```bash
# Dry run to preview changes
python3 scripts/beads/deduplicate_progress.py --dry-run

# Live run (creates backup automatically)
python3 scripts/beads/deduplicate_progress.py

# Custom backup location
python3 scripts/beads/deduplicate_progress.py --backup-dir /path/to/backups
```

#### 2. Beads Versioning (`scripts/beads/version_beads.py`)

- **Purpose**: Creates timestamped snapshots of beads (prd.json, progress.txt)
- **When to run**: At start of Ralph run and before major changes
- **Storage**: `.beads/versions/` with metadata tracking

**Usage:**

```bash
# Version default files (prd.json, progress.txt)
python3 scripts/beads/version_beads.py

# Version specific files
python3 scripts/beads/version_beads.py --files prd.json progress.txt custom.json

# Custom versions directory
python3 scripts/beads/version_beads.py --versions-dir /path/to/versions
```

**Metadata format** (`.beads/versions/metadata.json`):

```json
[
  {
    "timestamp": "2026-01-21T23:47:25.123456",
    "files": [
      {
        "original": "prd.json",
        "version": ".beads/versions/prd_20260121_234725.json",
        "timestamp": "20260121_234725"
      }
    ]
  }
]
```

#### 3. Bead Validation (`bead_check()` in ralph.sh)

- **Purpose**: Validates JSON integrity and required fields before each iteration
- **Validates**:
  - prd.json is valid JSON
  - Required fields exist: `name`, `userStories`
  - Each user story has `id` and `passes` fields
  - progress.txt exists (warns if missing)
- **When to run**: Before Ralph loop starts and before each iteration (automatic)

**Key patterns:**

```bash
# Use has() for boolean fields that can be true or false
jq -e ".userStories[$i] | has(\"passes\")" "$PRD_FILE"

# Don't use -e flag directly on boolean fields (false = exit 1)
# WRONG: jq -e ".userStories[$i].passes"
# RIGHT:  jq -e ".userStories[$i] | has(\"passes\")"
```

### Integration with Ralph Loop

The enhanced Beads system integrates seamlessly with ralph.sh:

1. **Pre-run checks** (in `main()`):
   - Run `bead_check()` to validate integrity
   - Run `version_beads.py` to create initial snapshot

2. **Per-iteration checks** (in loop):
   - Re-run `bead_check()` before each iteration
   - Fail fast if validation fails

3. **Post-iteration cleanup** (after Amp exits):
   - Run `deduplicate_progress.py` to reduce size
   - Continue on deduplication failure (warning only)

### Codebase Patterns

- **Always create backups before modifying beads**: Both scripts create timestamped backups automatically
- **Use hash-based deduplication**: MD5 hash of normalized text (whitespace removed, lowercase)
- **Keep recent context fresh**: Last 5 iterations stay in full detail
- **Version before major changes**: Run version_beads.py manually before risky operations
- **Python 3 required**: Both scripts require Python 3 (ralph.sh checks and warns)
- **Fail gracefully**: Deduplication/versioning failures don't stop Ralph loop

### Performance Characteristics

- **Deduplication**: Processes 35KB file in ~50ms, reduces to ~5KB (85% reduction)
- **Versioning**: Instant copy operation, negligible overhead
- **Validation**: JSON parsing via jq, ~20ms for 17 stories

### Troubleshooting

**"Story X missing 'passes' field" error:**

- Check if field exists: `jq '.userStories[X] | has("passes")' prd.json`
- Don't confuse with field value being `false`

**Deduplication below 20% target:**

- Normal for early iterations (not enough data to deduplicate)
- Warning only, doesn't fail the build
- More iterations = more redundancy = better deduplication

**Versioning fails silently:**

- Check Python 3 is installed: `python3 --version`
- Check scripts directory exists: `ls scripts/beads/`
- Manual version: `python3 scripts/beads/version_beads.py`

### Future Enhancements

- Add semantic similarity detection (beyond hash-based)
- Integrate with beads CLI tool for richer metadata
- Add compression for archived versions
- ML-based learning extraction from progress.txt
- Auto-summarization using LLMs for historical learnings

---

**Last updated:** 2026-01-21 (US-015 implementation)
