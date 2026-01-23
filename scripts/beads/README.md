# Beads Integration Scripts

This directory contains Python scripts for enhanced Beads integration in the IntelliPlan Ralph loop.

## Scripts

### deduplicate_progress.py

Deduplicates and summarizes `progress.txt` to maintain efficient memory across Ralph iterations.

**Features:**
- Hash-based deduplication of learnings
- Keeps last 5 iterations in full detail
- Consolidates older learnings into summary section
- Creates timestamped backups automatically
- Target: 20%+ size reduction (typically achieves 85%+)

**Usage:**
```bash
# Dry run (preview changes without modification)
python3 scripts/beads/deduplicate_progress.py --dry-run

# Live run (with automatic backup)
python3 scripts/beads/deduplicate_progress.py

# Custom backup location
python3 scripts/beads/deduplicate_progress.py --backup-dir /path/to/backups

# Adjust minimum reduction threshold
python3 scripts/beads/deduplicate_progress.py --min-reduction 30.0
```

**Output:**
- Creates backup in `backups/progress_YYYYMMDD_HHMMSS.txt`
- Updates `progress.txt` in place
- Prints statistics (original size, new size, reduction %)

### version_beads.py

Creates timestamped versions of beads files for rollback and auditing.

**Features:**
- Timestamps: `YYYYMMDD_HHMMSS` format
- Metadata tracking in `.beads/versions/metadata.json`
- Supports multiple files simultaneously
- Non-destructive (copies files)

**Usage:**
```bash
# Version default files (prd.json, progress.txt)
python3 scripts/beads/version_beads.py

# Version specific files
python3 scripts/beads/version_beads.py --files prd.json progress.txt custom.json

# Custom versions directory
python3 scripts/beads/version_beads.py --versions-dir /custom/path
```

**Output:**
- Creates versions in `.beads/versions/` (or custom dir)
- Updates metadata.json with version info
- Prints summary of versioned files

## Integration with Ralph

Both scripts are automatically integrated into `scripts/ralph/ralph.sh`:

1. **version_beads.py**: Runs at start of Ralph loop
2. **deduplicate_progress.py**: Runs after each iteration

The Ralph loop continues even if these scripts fail (warnings only).

## Requirements

- Python 3.6+
- Standard library only (no external dependencies)

## File Structure

```
scripts/beads/
├── README.md                    # This file
├── deduplicate_progress.py      # Deduplication script
└── version_beads.py             # Versioning script

.beads/versions/
├── metadata.json                # Version tracking
├── prd_YYYYMMDD_HHMMSS.json     # Timestamped snapshots
└── progress_YYYYMMDD_HHMMSS.txt # Timestamped snapshots

backups/
└── progress_YYYYMMDD_HHMMSS.txt # Deduplication backups
```

## Troubleshooting

### Script not found
Ensure you're running from project root:
```bash
cd /path/to/IntelliPlan
python3 scripts/beads/deduplicate_progress.py
```

### Python not available
Ralph checks for Python 3 and warns if missing. Install:
```bash
# macOS
brew install python3

# Ubuntu/Debian
sudo apt install python3

# Windows
# Download from python.org
```

### Deduplication below target
- Normal for first few iterations (not enough duplicate data yet)
- Warning only, doesn't fail the build
- Will improve as more iterations accumulate

### Version metadata growing large
- Old versions can be archived/deleted manually
- Metadata file is append-only for audit trail
- Consider periodic cleanup of old versions

## See Also

- [AGENTS.md](../../AGENTS.md) - Comprehensive Beads Integration Patterns section
- [scripts/ralph/ralph.sh](../ralph/ralph.sh) - Ralph loop with integrated beads checks
- [Steve Yegge's Beads](https://github.com/steveyegge/beads) - Original Beads concept
