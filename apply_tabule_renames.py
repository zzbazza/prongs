#!/usr/bin/env python3
"""
Apply Tabule File Renames from Log
This script reads tabule_rename_log.txt and renames files accordingly.
Use this on other machines where files still have old names.
"""

import os
import shutil
import unicodedata
from pathlib import Path

# Configuration
CONTENT_DIR = Path("content")
LOG_FILE = "tabule_rename_log.txt"

def normalize_path_for_matching(path_str):
    """Normalize path for fuzzy matching - handle NBSP and special chars"""
    # Replace NBSP (U+00A0) with regular space
    normalized = path_str.replace('\u00a0', ' ')
    # Normalize unicode
    normalized = unicodedata.normalize('NFC', normalized)
    return normalized

def find_actual_file(config_path):
    """Find actual file, trying variations for special characters"""
    # Try exact path first
    file_path = CONTENT_DIR / config_path
    if file_path.exists():
        return file_path

    # Try with normalized path (NBSP -> space, etc.)
    normalized_path = normalize_path_for_matching(config_path)
    file_path = CONTENT_DIR / normalized_path
    if file_path.exists():
        return file_path

    # Try to find file in directory with similar name
    try:
        parent_dir = (CONTENT_DIR / config_path).parent
        if parent_dir.exists():
            filename = os.path.basename(config_path)
            normalized_filename = normalize_path_for_matching(filename)

            # List all files in directory
            for actual_file in parent_dir.iterdir():
                if actual_file.is_file():
                    actual_name = actual_file.name
                    normalized_actual = normalize_path_for_matching(actual_name)

                    # Check if names match after normalization
                    if normalized_filename == normalized_actual or filename == actual_name:
                        return actual_file
    except:
        pass

    return None

def parse_log_file(log_file):
    """Parse the log file and return list of (new_path, old_path) tuples"""
    renames = []

    if not os.path.exists(log_file):
        print(f"Error: Log file '{log_file}' not found!")
        return renames

    with open(log_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue

            # Parse: NEW_PATH <- OLD_PATH
            if ' <- ' in line:
                parts = line.split(' <- ', 1)
                if len(parts) == 2:
                    new_path = parts[0].strip()
                    old_path = parts[1].strip()
                    renames.append((new_path, old_path))
                else:
                    print(f"Warning: Could not parse line {line_num}: {line}")
            else:
                print(f"Warning: Invalid format on line {line_num}: {line}")

    return renames

def apply_renames(renames, dry_run=False):
    """Apply the renames from the log file"""
    total = len(renames)
    success_count = 0
    skip_count = 0
    error_count = 0

    for new_path, old_path in renames:
        # Try to find the actual old file (with fuzzy matching)
        actual_old_file = find_actual_file(old_path)

        if not actual_old_file:
            print(f"✗ File not found: {old_path}")
            skip_count += 1
            continue

        new_file = CONTENT_DIR / new_path

        # Check if new file already exists
        if new_file.exists():
            print(f"⊘ Already exists: {new_path}")
            skip_count += 1
            continue

        try:
            if dry_run:
                print(f"[DRY RUN] Would rename: {old_path} -> {new_path}")
                success_count += 1
            else:
                # Create parent directory if needed
                new_file.parent.mkdir(parents=True, exist_ok=True)

                # Rename the file
                shutil.move(str(actual_old_file), str(new_file))
                print(f"✓ Renamed: {old_path} -> {new_path}")
                success_count += 1
        except Exception as e:
            print(f"✗ Error renaming {old_path}: {e}")
            error_count += 1

    return success_count, skip_count, error_count, total

def main():
    import sys

    print("=== Tabule File Rename Applicator ===")
    print(f"Reading log file: {LOG_FILE}")
    print()

    # Check if dry run
    dry_run = '--dry-run' in sys.argv or '-n' in sys.argv

    if dry_run:
        print("*** DRY RUN MODE - No files will be modified ***")
        print()

    # Parse log file
    renames = parse_log_file(LOG_FILE)

    if not renames:
        print("No renames found in log file.")
        return

    print(f"Found {len(renames)} rename operations in log file")
    print()

    # Ask for confirmation if not dry run
    if not dry_run:
        response = input("Proceed with renaming? (yes/no): ").strip().lower()
        if response not in ['yes', 'y']:
            print("Aborted.")
            return
        print()

    # Apply renames
    success, skipped, errors, total = apply_renames(renames, dry_run)

    # Summary
    print()
    print("=== Summary ===")
    print(f"Total operations: {total}")
    print(f"✓ Successfully renamed: {success}")
    print(f"⊘ Skipped (not found or already exists): {skipped}")
    print(f"✗ Errors: {errors}")

    if dry_run:
        print()
        print("This was a DRY RUN. Run without --dry-run to actually rename files.")
    else:
        print()
        print("Done!")

if __name__ == "__main__":
    main()
