#!/usr/bin/env python3
"""
Generate items.json with NFC Unicode normalization

This script generates items.json files from directory contents with proper
NFC Unicode normalization for cross-platform compatibility (macOS/Linux).

Usage:
    python3 generate_items_json.py <source_directory> <output_file>

Example:
    python3 generate_items_json.py "content/files/FOTO/DTJ" "content/configs/photos/dtj/items.json"

The script:
1. Scans the source directory for images and documents
2. Generates properly formatted items with NFC-normalized paths
3. Excludes thumbnail directories
4. Auto-detects file types
"""

import os
import sys
import json
import unicodedata
from pathlib import Path


def normalize_to_nfc(text):
    """Normalize text to NFC (composed) form for Linux compatibility."""
    return unicodedata.normalize('NFC', text)


def get_file_type(extension):
    """Determine file type from extension."""
    ext = extension.lower()
    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
        return 'image'
    elif ext == '.pdf':
        return 'document'
    elif ext in ['.txt', '.md']:
        return 'text'
    elif ext in ['.mp4', '.avi', '.mov', '.webm']:
        return 'video'
    elif ext in ['.mp3', '.wav', '.ogg']:
        return 'audio'
    else:
        return 'document'


def generate_items(source_dir, base_path):
    """
    Generate items list from directory contents.

    Args:
        source_dir: Directory to scan for files
        base_path: Base path to use in items (e.g., "files/FOTO/DTJ")

    Returns:
        List of item dictionaries
    """
    items = []
    source_path = Path(source_dir)

    if not source_path.exists():
        print(f"Error: Directory not found: {source_dir}")
        sys.exit(1)

    # Supported extensions
    supported_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf',
                      '.txt', '.md', '.mp4', '.avi', '.mov', '.webm', '.mp3', '.wav', '.ogg'}

    # Find all files recursively
    all_files = []
    for file_path in source_path.rglob('*'):
        if file_path.is_file():
            # Skip thumbnails and hidden files
            if 'thumbnail' not in file_path.parts and not file_path.name.startswith('.'):
                if file_path.suffix.lower() in supported_exts:
                    # Get relative path from source directory
                    rel_path = file_path.relative_to(source_path)
                    all_files.append((file_path, rel_path))

    # Sort files
    all_files.sort(key=lambda x: str(x[1]))

    # Generate items
    for file_path, rel_path in all_files:
        # Normalize all path components to NFC
        path_parts = [base_path] + [normalize_to_nfc(part) for part in rel_path.parts]
        normalized_path = '/'.join(path_parts)

        # Generate title from filename
        title = normalize_to_nfc(file_path.stem)

        # Determine file type
        file_type = get_file_type(file_path.suffix)

        items.append({
            'path': normalized_path,
            'type': file_type,
            'title': title
        })

    return items


def main():
    """Main function."""
    if len(sys.argv) < 3:
        print("Usage: python3 generate_items_json.py <source_directory> <output_file>")
        print("\nExample:")
        print('  python3 generate_items_json.py "content/files/FOTO/DTJ" "content/configs/photos/dtj/items.json"')
        sys.exit(1)

    source_dir = sys.argv[1]
    output_file = sys.argv[2]

    # Extract base path from source directory
    # Assumes source is like "content/files/FOTO/DTJ"
    # and we want base path like "files/FOTO/DTJ"
    if source_dir.startswith('content/'):
        base_path = source_dir.replace('content/', '', 1)
    else:
        base_path = source_dir

    print(f"Scanning: {source_dir}")
    print(f"Base path: {base_path}")
    print(f"Output: {output_file}")
    print("=" * 70)

    # Generate items
    items = generate_items(source_dir, base_path)

    print(f"Found {len(items)} items")

    # Create output directory if needed
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write JSON with NFC normalization
    output_data = {'items': items}

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"✓ Generated {output_file}")
    print("✓ All paths normalized to NFC for Linux/Ubuntu compatibility")


if __name__ == '__main__':
    main()
