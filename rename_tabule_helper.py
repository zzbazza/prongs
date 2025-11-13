#!/usr/bin/env python3
"""
Tabule Files Renaming Helper
Generates short, clean filenames and updates all references
"""

import json
import os
import re
import shutil
from pathlib import Path
from collections import defaultdict
import unicodedata

# Configuration
CONTENT_DIR = Path("content")
FILES_DIR = CONTENT_DIR / "files"
CONFIGS_DIR = CONTENT_DIR / "configs" / "exhibition-panels"
LOG_FILE = "tabule_rename_log.txt"

# Czech character mapping
CZECH_CHARS = {
    'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i',
    'ň': 'n', 'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u',
    'ů': 'u', 'ý': 'y', 'ž': 'z',
    'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I',
    'Ň': 'N', 'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U',
    'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z'
}

# Words to skip (common Czech words that don't add meaning)
SKIP_WORDS = {
    'a', 'v', 'na', 'z', 'ze', 'do', 'od', 'u', 'o', 'pro', 'pri', 'pred',
    'po', 'roku', 'leta', 'let', 'st', 'stol', 'c', 'p', 'cp', 'inv', 'foto',
    'fotila', 'fotil', 'nalezen', 'nalezena', 'nalezeno', 'podle', 'archiv',
    'muzeum', 'misto', 'ulozeni', 'str', 'mapa', 'poli', 'pole', 'mezi',
    'lety', 'bliznosti', 'typ', 'typu', 'se', 'tak', 'kol', 'tzv', 'tis'
}

def normalize_czech(text):
    """Convert Czech characters to ASCII equivalents"""
    result = []
    for char in text:
        result.append(CZECH_CHARS.get(char, char))
    return ''.join(result)

def extract_meaningful_words(filename, max_words=4):
    """Extract 2-4 meaningful words from filename"""
    # Remove extension
    name_no_ext = os.path.splitext(filename)[0]

    # Remove content in parentheses (usually metadata)
    name_no_ext = re.sub(r'\([^)]*\)', '', name_no_ext)

    # Remove extra info after commas or dashes in long names
    # But keep the important first part
    parts = re.split(r'[,–—-]', name_no_ext)
    if len(parts) > 1:
        # Take first part which usually has the main subject
        name_no_ext = parts[0].strip()

    # Split into words
    words = re.findall(r'\w+', name_no_ext)

    # Filter out numbers, skip words, and very short words
    meaningful = []
    for word in words:
        word_lower = word.lower()
        # Skip if it's just a number, or a skip word, or too short
        if (not word.isdigit() and
            word_lower not in SKIP_WORDS and
            len(word) >= 2):
            meaningful.append(word_lower)

    # Take first 2-4 words
    if len(meaningful) == 0:
        # Fallback to first few words if filtering was too aggressive
        meaningful = [w.lower() for w in words[:max_words] if len(w) >= 2]

    selected = meaningful[:max_words]

    # If still less than 2 words, add more
    if len(selected) < 2 and len(words) > len(selected):
        for word in words:
            if word.lower() not in [w for w in selected]:
                selected.append(word.lower())
                if len(selected) >= 2:
                    break

    return selected[:max_words]

def generate_short_name(old_path, existing_names):
    """Generate a short, clean filename"""
    filename = os.path.basename(old_path)
    extension = os.path.splitext(filename)[1].lower()

    # Special handling for main tabule PDFs (e.g., "1-PRAVĚKÁ.pdf" -> "1-praveka.pdf")
    # Pattern: files/Tabule/NUMBER-NAME.pdf (not in subdirectory)
    path_parts = Path(old_path).parts
    is_main_tabule_pdf = (
        len(path_parts) == 3 and  # files/Tabule/file.pdf
        path_parts[0] == 'files' and
        path_parts[1] == 'Tabule' and
        extension == '.pdf'
    )

    if is_main_tabule_pdf:
        # Check if it matches pattern like "1-PRAVĚKÁ.pdf" or "7-8-PRVOREPUBLIKOVÁ2.pdf"
        match = re.match(r'^(\d+(?:-\d+)?)\s*-\s*(.+)$', os.path.splitext(filename)[0])
        if match:
            number = match.group(1)
            desc = match.group(2)

            # Normalize the descriptive part
            desc_normalized = normalize_czech(desc)
            desc_normalized = re.sub(r'[^a-z0-9]', '', desc_normalized.lower())

            base_name = f"{number}-{desc_normalized}"
            new_name = base_name + extension

            # Handle duplicates
            counter = 1
            while new_name in existing_names:
                new_name = f"{base_name}-{counter}{extension}"
                counter += 1

            return new_name

    # Standard handling for all other files
    # Extract meaningful words
    words = extract_meaningful_words(filename)

    if not words:
        # Fallback to simple numbering
        base_name = "tabule"
        words = [base_name]

    # Join with dashes
    base_name = '-'.join(words)

    # Normalize Czech characters
    base_name = normalize_czech(base_name)

    # Remove any remaining special characters, keep only alphanumeric and dashes
    base_name = re.sub(r'[^a-z0-9-]', '', base_name.lower())

    # Remove multiple dashes
    base_name = re.sub(r'-+', '-', base_name)

    # Remove leading/trailing dashes
    base_name = base_name.strip('-')

    # Handle duplicates
    new_name = base_name + extension
    counter = 1
    while new_name in existing_names:
        new_name = f"{base_name}-{counter}{extension}"
        counter += 1

    return new_name

def collect_tabule_files():
    """Collect all Tabule file references from JSON configs"""
    tabule_files = {}

    # Scan all items.json files in exhibition-panels
    for items_file in CONFIGS_DIR.rglob("items.json"):
        try:
            with open(items_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            for item in data.get('items', []):
                path = item.get('path', '')
                if path.startswith('files/Tabule/'):
                    if path not in tabule_files:
                        tabule_files[path] = []
                    tabule_files[path].append({
                        'config_file': items_file,
                        'item': item
                    })
        except Exception as e:
            print(f"Error reading {items_file}: {e}")

    return tabule_files

def generate_rename_mapping(tabule_files):
    """Generate mapping of old paths to new paths"""
    rename_map = {}
    existing_names = set()

    for old_path in sorted(tabule_files.keys()):
        # Get the directory structure
        path_parts = Path(old_path).parts

        # Generate new filename
        new_filename = generate_short_name(old_path, existing_names)
        existing_names.add(new_filename)

        # Reconstruct path maintaining directory structure
        if len(path_parts) > 2:
            # files/Tabule/subdirectory/file.ext -> files/Tabule/subdirectory/new-name.ext
            new_path = os.path.join(*path_parts[:-1], new_filename)
        else:
            # files/Tabule/file.ext -> files/Tabule/new-name.ext
            new_path = os.path.join('files/Tabule', new_filename)

        rename_map[old_path] = new_path

    return rename_map

def update_json_configs(renamed_files, tabule_files):
    """Update JSON config files ONLY for files that were actually renamed"""
    updated_files = set()

    for old_path, new_path in renamed_files.items():
        if old_path not in tabule_files:
            continue

        for ref in tabule_files[old_path]:
            config_file = ref['config_file']

            # Read JSON
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Update paths
            modified = False
            for item in data.get('items', []):
                if item.get('path') == old_path:
                    item['path'] = new_path
                    modified = True

            # Write back if modified
            if modified:
                with open(config_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write('\n')
                updated_files.add(config_file)

    return updated_files

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

def rename_actual_files(rename_map):
    """Rename actual files if they exist - return dict of successful renames"""
    renamed_files = {}

    for old_path, new_path in rename_map.items():
        # Try to find the actual file (with variations)
        actual_file = find_actual_file(old_path)

        if actual_file:
            new_file = CONTENT_DIR / new_path

            # Create directory if needed
            new_file.parent.mkdir(parents=True, exist_ok=True)

            # Rename file
            shutil.move(str(actual_file), str(new_file))
            renamed_files[old_path] = new_path
            print(f"✓ Renamed: {old_path} -> {new_path}")
        else:
            print(f"✗ File not found, skipping: {old_path}")

    return renamed_files

def write_log(rename_map, log_file):
    """Write rename log to file"""
    with open(log_file, 'w', encoding='utf-8') as f:
        for old_path, new_path in sorted(rename_map.items()):
            f.write(f"{new_path} <- {old_path}\n")

def main():
    print("=== Collecting Tabule file references ===")
    tabule_files = collect_tabule_files()
    print(f"Found {len(tabule_files)} unique Tabule files in configs")

    print("\n=== Generating rename mapping ===")
    rename_map = generate_rename_mapping(tabule_files)
    print(f"Generated {len(rename_map)} rename mappings")

    print("\n=== Renaming actual files ===")
    renamed_files = rename_actual_files(rename_map)
    print(f"\n✓ Successfully renamed {len(renamed_files)} files")
    print(f"✗ Skipped {len(rename_map) - len(renamed_files)} files (not found)")

    print("\n=== Updating JSON configs ===")
    print("(Only updating configs for files that were actually renamed)")
    updated_files = update_json_configs(renamed_files, tabule_files)
    print(f"✓ Updated {len(updated_files)} JSON config files")

    print("\n=== Writing log file ===")
    write_log(renamed_files, LOG_FILE)
    print(f"Log written to {LOG_FILE}")

    print("\n=== Summary ===")
    print(f"Total files in configs: {len(tabule_files)}")
    print(f"Files actually renamed: {len(renamed_files)}")
    print(f"Files not found: {len(rename_map) - len(renamed_files)}")
    print(f"Configs updated: {len(updated_files)}")
    print(f"Log file: {LOG_FILE}")

if __name__ == "__main__":
    main()
