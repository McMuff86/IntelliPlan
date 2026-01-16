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

| File | Purpose |
|------|---------|
| `scripts/ralph/ralph.sh` | The bash loop that spawns fresh Amp instances |
| `scripts/ralph/prompt.md` | Instructions given to each Amp instance |
| `prd.json` | User stories with `passes` status (the task list) |
| `prd.json.example` | Example PRD format for reference |
| `progress.txt` | Append-only learnings for future iterations |
| `AGENTS.md` | This file - agent instructions and patterns |

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


## Quick Start (Windows)

Run both backend and frontend dev servers at once:

```powershell
.\start-dev.ps1
```

This opens two PowerShell windows:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

### Manual Start

```powershell
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

### Database (Docker)

Use Docker for a reproducible local Postgres setup (recommended for development).

```powershell
# From project root
docker compose up -d
```

Optional: create `backend/.env` from `backend/.env.example` (Docker defaults are already filled in) and then run migrations:

```powershell
cd backend
npm run migrate
```

Backend expects these defaults:
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_NAME=intelliplan`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`

If you override the Docker password, keep `backend/.env` in sync (or use `DATABASE_URL`).

### Dev Quickfix: Seed User

If appointment creation fails, create a seed user and send `x-user-id` from the frontend.

```powershell
# Run migrations first (if not already done)
cd backend
npm run migrate

# Create/update a demo user
npm run seed:user
```

Copy the printed `User ID` and set it for the frontend:

```powershell
# Option A: set once in browser console
localStorage.setItem('userId', '<PASTE_USER_ID>');

# Option B: set via env for dev (frontend)
# VITE_USER_ID=<PASTE_USER_ID>
```

## Archiving

Ralph automatically archives previous runs when you start a new feature (different `branchName`). Archives are saved to `archive/YYYY-MM-DD-feature-name/`.

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph/)
- [Amp documentation](https://ampcode.com/manual)
- [Beads documentation](https://github.com/steveyegge/beads)
