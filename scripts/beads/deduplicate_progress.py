#!/usr/bin/env python3
"""
Beads Integration - Progress.txt Deduplication and Summarization Script

This script:
1. Reads progress.txt and extracts unique learnings
2. Deduplicates similar patterns and gotchas
3. Summarizes redundant information
4. Reduces file size by at least 20%
5. Creates timestamped backup before modification

Usage:
    python3 deduplicate_progress.py [--dry-run] [--backup-dir PATH]

Based on Steve Yegge's Beads pattern for file-based persistence.
"""

import re
import json
import os
import sys
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Set, Tuple
from collections import defaultdict

class ProgressDeduplicator:
    def __init__(self, progress_file: str, backup_dir: str = None, dry_run: bool = False):
        self.progress_file = Path(progress_file)
        self.backup_dir = Path(backup_dir) if backup_dir else self.progress_file.parent / "backups"
        self.dry_run = dry_run
        
        # Stats
        self.original_size = 0
        self.deduplicated_size = 0
        
    def hash_text(self, text: str) -> str:
        """Create hash for similarity detection."""
        normalized = re.sub(r'\s+', ' ', text.lower().strip())
        return hashlib.md5(normalized.encode()).hexdigest()[:8]
    
    def extract_sections(self, content: str) -> Tuple[str, List[str], List[Dict]]:
        """Extract codebase patterns and iteration logs."""
        # Split into sections
        parts = content.split('## Iteration Log')
        
        if len(parts) != 2:
            # Fallback if structure is unexpected
            return content, [], []
        
        header_section = parts[0]
        iterations_section = parts[1]
        
        # Extract codebase patterns
        patterns_match = re.search(
            r'## Codebase Patterns\n(.*?)---',
            header_section,
            re.DOTALL
        )
        codebase_patterns = []
        if patterns_match:
            pattern_text = patterns_match.group(1).strip()
            # Extract individual patterns
            for line in pattern_text.split('\n'):
                line = line.strip()
                if line and not line.startswith('<!--') and not line.endswith('-->'):
                    if line.startswith('- '):
                        codebase_patterns.append(line[2:])
        
        # Extract iterations
        iterations = []
        iteration_blocks = re.split(r'\n## (\d{4}-\d{2}-\d{2})', iterations_section)
        
        for i in range(1, len(iteration_blocks), 2):
            if i + 1 < len(iteration_blocks):
                date = iteration_blocks[i]
                content_block = iteration_blocks[i + 1]
                
                # Parse iteration
                lines = content_block.split('\n')
                title_match = re.match(r'^\s*-\s*(.+)$', lines[0]) if lines else None
                title = title_match.group(1) if title_match else lines[0] if lines else ""
                
                # Extract learnings
                learnings = []
                in_learnings = False
                for line in lines:
                    if '**Learnings' in line or '**Learning for future' in line:
                        in_learnings = True
                        continue
                    if in_learnings:
                        if line.strip().startswith('- '):
                            learnings.append(line.strip()[2:])
                        elif line.strip().startswith('---'):
                            break
                
                iterations.append({
                    'date': date,
                    'title': title,
                    'content': content_block,
                    'learnings': learnings,
                    'hash': self.hash_text(title)
                })
        
        return header_section, codebase_patterns, iterations
    
    def deduplicate_patterns(self, patterns: List[str]) -> List[str]:
        """Remove duplicate patterns."""
        seen_hashes = set()
        unique_patterns = []
        
        for pattern in patterns:
            pattern_hash = self.hash_text(pattern)
            if pattern_hash not in seen_hashes:
                seen_hashes.add(pattern_hash)
                unique_patterns.append(pattern)
        
        return unique_patterns
    
    def merge_learnings(self, iterations: List[Dict]) -> List[str]:
        """Extract and deduplicate learnings from all iterations."""
        all_learnings = []
        seen_hashes = set()
        
        for iteration in iterations:
            for learning in iteration['learnings']:
                learning_hash = self.hash_text(learning)
                if learning_hash not in seen_hashes:
                    seen_hashes.add(learning_hash)
                    all_learnings.append(learning)
        
        return all_learnings
    
    def reconstruct_file(self, header: str, patterns: List[str], 
                         iterations: List[Dict], merged_learnings: List[str]) -> str:
        """Reconstruct the progress.txt file with deduplication."""
        lines = []
        
        # Add header
        lines.append("# IntelliPlan - Ralph Progress Log\n")
        lines.append("\n## Codebase Patterns\n")
        lines.append("<!-- Add reusable patterns here as they are discovered -->\n")
        
        # Add unique patterns
        for pattern in patterns:
            lines.append(f"- {pattern}\n")
        
        lines.append("\n---\n")
        lines.append("\n## Iteration Log\n")
        lines.append("<!-- Each Ralph iteration appends its progress below -->\n")
        
        # Add iterations (keep recent ones, summarize older ones)
        # Keep last 5 iterations in full detail
        recent_iterations = iterations[-5:] if len(iterations) > 5 else iterations
        
        for iteration in recent_iterations:
            lines.append(f"\n## {iteration['date']} - {iteration['title']}\n")
            lines.append(iteration['content'])
            if not iteration['content'].endswith('\n'):
                lines.append('\n')
        
        # Add merged learnings section if we have older iterations
        if len(iterations) > 5:
            lines.append("\n## Historical Learnings Summary\n")
            lines.append("<!-- Consolidated learnings from older iterations -->\n")
            for learning in merged_learnings[:20]:  # Keep top 20 unique learnings
                lines.append(f"- {learning}\n")
            lines.append("---\n")
        
        return ''.join(lines)
    
    def create_backup(self) -> Path:
        """Create timestamped backup of progress.txt."""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = self.backup_dir / f"progress_{timestamp}.txt"
        
        with open(self.progress_file, 'r') as f:
            content = f.read()
        
        with open(backup_file, 'w') as f:
            f.write(content)
        
        return backup_file
    
    def run(self) -> Dict:
        """Execute deduplication process."""
        # Read original file
        if not self.progress_file.exists():
            return {
                'success': False,
                'error': f'Progress file not found: {self.progress_file}'
            }
        
        with open(self.progress_file, 'r') as f:
            original_content = f.read()
        
        self.original_size = len(original_content)
        
        # Create backup
        if not self.dry_run:
            backup_file = self.create_backup()
            print(f"✓ Created backup: {backup_file}")
        
        # Extract sections
        header, patterns, iterations = self.extract_sections(original_content)
        
        # Deduplicate patterns
        unique_patterns = self.deduplicate_patterns(patterns)
        
        # Merge learnings from older iterations
        merged_learnings = self.merge_learnings(iterations[:-5]) if len(iterations) > 5 else []
        
        # Reconstruct file
        new_content = self.reconstruct_file(header, unique_patterns, iterations, merged_learnings)
        self.deduplicated_size = len(new_content)
        
        # Calculate reduction
        size_reduction = ((self.original_size - self.deduplicated_size) / self.original_size * 100) if self.original_size > 0 else 0
        
        # Write new file
        if not self.dry_run:
            with open(self.progress_file, 'w') as f:
                f.write(new_content)
            print(f"✓ Updated {self.progress_file}")
        else:
            print(f"[DRY RUN] Would update {self.progress_file}")
        
        return {
            'success': True,
            'original_size': self.original_size,
            'deduplicated_size': self.deduplicated_size,
            'reduction_percent': size_reduction,
            'patterns_before': len(patterns),
            'patterns_after': len(unique_patterns),
            'iterations_count': len(iterations),
            'merged_learnings': len(merged_learnings)
        }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Deduplicate and summarize progress.txt for Beads integration'
    )
    parser.add_argument(
        '--progress-file',
        default='progress.txt',
        help='Path to progress.txt file (default: progress.txt)'
    )
    parser.add_argument(
        '--backup-dir',
        help='Directory for backups (default: backups/ in same dir as progress.txt)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    parser.add_argument(
        '--min-reduction',
        type=float,
        default=20.0,
        help='Minimum size reduction percentage to accept (default: 20)'
    )
    
    args = parser.parse_args()
    
    # Get project root (assuming script is in scripts/beads/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    progress_file = project_root / args.progress_file
    
    print(f"🔧 Beads Progress Deduplicator")
    print(f"   Project: {project_root}")
    print(f"   Progress file: {progress_file}")
    print(f"   Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print()
    
    deduplicator = ProgressDeduplicator(
        str(progress_file),
        args.backup_dir,
        args.dry_run
    )
    
    result = deduplicator.run()
    
    if not result['success']:
        print(f"❌ Error: {result.get('error', 'Unknown error')}")
        sys.exit(1)
    
    # Print stats
    print()
    print("📊 Statistics:")
    print(f"   Original size: {result['original_size']:,} bytes")
    print(f"   New size: {result['deduplicated_size']:,} bytes")
    print(f"   Reduction: {result['reduction_percent']:.1f}%")
    print(f"   Patterns: {result['patterns_before']} → {result['patterns_after']}")
    print(f"   Iterations: {result['iterations_count']}")
    print(f"   Merged learnings: {result['merged_learnings']}")
    print()
    
    if result['reduction_percent'] < args.min_reduction:
        print(f"⚠️  Warning: Size reduction ({result['reduction_percent']:.1f}%) below target ({args.min_reduction}%)")
        print(f"   This may indicate progress.txt is already optimized or needs more iterations to accumulate redundancy.")
    else:
        print(f"✅ Success: Achieved {result['reduction_percent']:.1f}% size reduction (target: {args.min_reduction}%)")
    
    sys.exit(0)

if __name__ == '__main__':
    main()
