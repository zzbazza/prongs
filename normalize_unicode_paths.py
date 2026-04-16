#!/usr/bin/env python3
"""
Unicode Path Normalization Script for zlaty_jelen

This script normalizes all file paths in items.json files to NFC (composed) form
to ensure compatibility between macOS (which uses NFD) and Linux/Ubuntu (which uses NFC).

Usage:
    python3 normalize_unicode_paths.py [--check-only]

Options:
    --check-only    Only check for non-normalized paths without fixing them

Background:
    - macOS uses NFD (decomposed) Unicode normalization for filesystems
      Characters like ů, á, é, í are stored as: base letter + combining accent

    - Linux/Ubuntu uses NFC (composed) Unicode normalization
      These characters are stored as single composed characters

    - macOS is tolerant and matches both forms
    - Linux requires exact matches, causing file not found errors

Solution:
    Always normalize paths to NFC in JSON configs for cross-platform compatibility
"""

import os
import json
import unicodedata
import sys
from pathlib import Path


def normalize_path_to_nfc(path):
    """
    Normalize all parts of a path to NFC (composed) form for Linux compatibility.

    Args:
        path: File path string

    Returns:
        Normalized path string in NFC form
    """
    parts = path.split('/')
    normalized_parts = [unicodedata.normalize('NFC', part) for part in parts]
    return '/'.join(normalized_parts)


def check_unicode_form(text):
    """
    Check if text is in NFC or NFD form.

    Args:
        text: String to check

    Returns:
        String indicating form: "NFC", "NFD", "ASCII", or "MIXED"
    """
    nfc = unicodedata.normalize('NFC', text)
    nfd = unicodedata.normalize('NFD', text)

    if text == nfc and text != nfd:
        return "NFC"
    elif text == nfd and text != nfc:
        return "NFD"
    elif text == nfc == nfd:
        return "ASCII"
    else:
        return "MIXED"


def process_items_file(filepath, check_only=False):
    """
    Process a single items.json file and normalize all paths.

    Args:
        filepath: Path to items.json file
        check_only: If True, only report issues without fixing

    Returns:
        Number of paths that were fixed (or would be fixed if check_only)
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not data.get('items'):
        return 0

    items_fixed = 0

    for item in data['items']:
        if 'path' in item:
            original_path = item['path']
            normalized_path = normalize_path_to_nfc(original_path)

            if original_path != normalized_path:
                items_fixed += 1
                if not check_only:
                    item['path'] = normalized_path

    if items_fixed > 0 and not check_only:
        # Write back the normalized version
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return items_fixed


def main():
    """Main function to process all items.json files in the project."""
    check_only = '--check-only' in sys.argv

    if check_only:
        print("Running in CHECK-ONLY mode (no files will be modified)")
        print("=" * 70)
    else:
        print("Normalizing all Unicode paths to NFC (composed) form")
        print("=" * 70)

    # Find all items.json files recursively
    config_root = Path('content/configs')

    if not config_root.exists():
        print(f"Error: {config_root} directory not found!")
        print("Please run this script from the project root directory.")
        sys.exit(1)

    total_files = 0
    total_fixed = 0
    files_with_issues = []

    for items_file in config_root.rglob('items.json'):
        total_files += 1
        items_fixed = process_items_file(items_file, check_only)

        if items_fixed > 0:
            rel_path = items_file.relative_to(config_root)
            action = "Found" if check_only else "Fixed"
            print(f"✓ {rel_path}: {action} {items_fixed} paths")
            total_fixed += items_fixed
            files_with_issues.append(str(rel_path))

    print("\n" + "=" * 70)
    print(f"Processed {total_files} items.json files")

    if check_only:
        if total_fixed > 0:
            print(f"Found {total_fixed} paths that need normalization")
            print("\nFiles with issues:")
            for file in files_with_issues:
                print(f"  - {file}")
            print("\nRun without --check-only to fix these paths")
            sys.exit(1)
        else:
            print("All paths are already normalized to NFC ✓")
    else:
        if total_fixed > 0:
            print(f"Fixed {total_fixed} paths total")
            print("All paths now normalized to NFC for Linux/Ubuntu compatibility ✓")
        else:
            print("All paths were already normalized to NFC ✓")


if __name__ == '__main__':
    main()
