# Reverse Planning Prompt Template (Carpentry)

Goal: Produce a conflict-free schedule working backward from a fixed deadline.

Context:

- Domain: Swiss carpentry shop (Schreinerei)
- Working hours default: 08:00–17:00
- Weekends optional (include when explicitly enabled)

Guidelines:

1. Schedule tasks in reverse order from the end-date.
2. Keep tasks sequential and non-overlapping.
3. Respect working hours and weekends settings.
4. Prefer earlier placement when conflicts are detected.
5. Highlight resource usage in the output (machine, workstation, crew).

Output format:

- List of tasks with start/end timestamps (ISO 8601)
- Include resource label if present
- Provide warnings if tasks cannot be scheduled without conflicts
