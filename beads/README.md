# Beads - IntelliPlan

This folder is reserved for Beads files (file-based memory) to keep project context persistent
across agent runs.

Recommended usage:
- Create a bead per user story or feature area.
- Keep the latest project status, decisions, and links to key files.

Example:
1. `beads create beads/projects/task-planning`
2. `beads update beads/projects/task-planning`
3. `beads load beads/projects/task-planning`
