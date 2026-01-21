#!/usr/bin/env python3
"""
Beads Versioning Script

Creates timestamped versions of beads (prd.json, progress.txt) for better tracking.
Versions are stored in .beads/versions/ directory.

Usage:
    python3 version_beads.py [--files FILE1 FILE2 ...]
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
import sys

def version_file(file_path: Path, versions_dir: Path) -> dict:
    """Create a timestamped version of a bead file."""
    if not file_path.exists():
        return {'success': False, 'error': f'File not found: {file_path}'}
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_name = file_path.name
    version_name = f"{file_path.stem}_{timestamp}{file_path.suffix}"
    version_path = versions_dir / version_name
    
    versions_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(file_path, version_path)
    
    return {
        'success': True,
        'original': str(file_path),
        'version': str(version_path),
        'timestamp': timestamp
    }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Version beads files with timestamps'
    )
    parser.add_argument(
        '--files',
        nargs='+',
        default=['prd.json', 'progress.txt'],
        help='Files to version (default: prd.json progress.txt)'
    )
    parser.add_argument(
        '--versions-dir',
        default='.beads/versions',
        help='Directory for versions (default: .beads/versions)'
    )
    
    args = parser.parse_args()
    
    # Get project root (assuming script is in scripts/beads/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    versions_dir = project_root / args.versions_dir
    
    print(f"📦 Beads Versioning")
    print(f"   Project: {project_root}")
    print(f"   Versions dir: {versions_dir}")
    print()
    
    results = []
    for file_name in args.files:
        file_path = project_root / file_name
        result = version_file(file_path, versions_dir)
        results.append(result)
        
        if result['success']:
            print(f"✓ Versioned: {file_name} → {Path(result['version']).name}")
        else:
            print(f"✗ Failed: {file_name} - {result.get('error', 'Unknown error')}")
    
    # Create/update metadata
    metadata_file = versions_dir / 'metadata.json'
    metadata = []
    if metadata_file.exists():
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
    
    metadata.append({
        'timestamp': datetime.now().isoformat(),
        'files': [r for r in results if r['success']]
    })
    
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print()
    print(f"✓ Metadata updated: {metadata_file}")
    
    success_count = sum(1 for r in results if r['success'])
    fail_count = len(results) - success_count
    
    if fail_count > 0:
        print(f"\n⚠️  {fail_count} file(s) failed to version")
        sys.exit(1)
    else:
        print(f"\n✅ Successfully versioned {success_count} file(s)")
        sys.exit(0)

if __name__ == '__main__':
    main()
