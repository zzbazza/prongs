#!/usr/bin/env python3
"""
Script to compare configured items in JSON files with parsed_files.txt
Outputs:
- missing.txt: Files in parsed_files.txt that are not in any items.json
- not_existing.txt: Files in items.json that are not in parsed_files.txt
"""

import json
import os
from pathlib import Path

def collect_all_configured_items(configs_dir):
    """Collect all file paths from items.json files in the configs directory."""
    configured_paths = set()

    # Walk through all subdirectories in content/configs
    for root, dirs, files in os.walk(configs_dir):
        if 'items.json' in files:
            items_path = os.path.join(root, 'items.json')
            try:
                with open(items_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    items = data.get('items', [])
                    for item in items:
                        path = item.get('path', '')
                        # Remove 'files/' prefix to match parsed_files.txt format
                        if path.startswith('files/'):
                            path = path[6:]  # Remove 'files/' prefix
                        if path:
                            configured_paths.add(path)
            except Exception as e:
                print(f"Error reading {items_path}: {e}")

    return configured_paths

def read_parsed_files(parsed_file_path):
    """Read all file paths from parsed_files.txt."""
    parsed_paths = set()

    try:
        with open(parsed_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip empty lines
                if line:
                    parsed_paths.add(line)
    except Exception as e:
        print(f"Error reading {parsed_file_path}: {e}")

    return parsed_paths

def main():
    # Define paths
    project_root = Path(__file__).parent
    configs_dir = project_root / 'content' / 'configs'
    parsed_file = project_root / 'samples' / 'parsed_files.txt'
    missing_output = project_root / 'missing.txt'
    not_existing_output = project_root / 'not_existing.txt'

    print("Collecting configured items from items.json files...")
    configured_paths = collect_all_configured_items(configs_dir)
    print(f"Found {len(configured_paths)} configured items")

    print("Reading parsed_files.txt...")
    parsed_paths = read_parsed_files(parsed_file)
    print(f"Found {len(parsed_paths)} parsed files")

    # Find missing files (in parsed_files.txt but not in configs)
    missing = parsed_paths - configured_paths
    print(f"Found {len(missing)} missing files")

    # Find not existing files (in configs but not in parsed_files.txt)
    not_existing = configured_paths - parsed_paths
    print(f"Found {len(not_existing)} files in configs but not in parsed_files.txt")

    # Write missing files
    with open(missing_output, 'w', encoding='utf-8') as f:
        for path in sorted(missing):
            f.write(f"{path}\n")
    print(f"Written missing files to {missing_output}")

    # Write not existing files
    with open(not_existing_output, 'w', encoding='utf-8') as f:
        for path in sorted(not_existing):
            f.write(f"{path}\n")
    print(f"Written not existing files to {not_existing_output}")

    print("\nSummary:")
    print(f"- Total configured items: {len(configured_paths)}")
    print(f"- Total parsed files: {len(parsed_paths)}")
    print(f"- Missing from configs: {len(missing)}")
    print(f"- In configs but not in parsed files: {len(not_existing)}")

if __name__ == '__main__':
    main()
