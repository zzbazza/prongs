#!/usr/bin/env python3
import json
import os
from pathlib import Path

# Find all chronicle items.json files
chronicles_dir = Path("content/configs/chronicles")
items_files = list(chronicles_dir.glob("*/items.json"))

print(f"Found {len(items_files)} chronicle items.json files to sort:\n")

for items_file in sorted(items_files):
    print(f"Processing: {items_file}")

    # Read the JSON file
    with open(items_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Sort items by path (ascending)
    if 'items' in data and isinstance(data['items'], list):
        original_count = len(data['items'])
        data['items'].sort(key=lambda x: x.get('path', ''))

        # Write back to file
        with open(items_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"  ✓ Sorted {original_count} items")
    else:
        print(f"  ⚠ No items array found")

    print()

print("✓ All chronicle files sorted successfully!")
