# Tabule Files Renaming Scripts

## Overview

These scripts rename files in the `content/files/Tabule` directory from long, descriptive names with special characters to shorter, standardized names suitable for web URLs.

## Files

- **`rename_tabule.sh`** - Main shell script
- **`rename_tabule_helper.py`** - Python script that does the actual work
- **`tabule_rename_log.txt`** - Output log showing all renames

## What It Does

1. **Scans** all `items.json` files in `content/configs/exhibition-panels/`
2. **Generates** short, clean filenames (2-4 words) from original names
3. **Updates** all JSON config file references
4. **Renames** actual files (if they exist)
5. **Creates** a log file showing all changes

## Naming Rules

- **2-4 meaningful words** from original filename
- **Lowercase** only
- **Dash-separated** (e.g., `mamuti-kel-odry.jpg`)
- **No special characters** (removes parentheses, commas, etc.)
- **Czech characters normalized** (ě→e, á→a, š→s, etc.)
- **No redundant words** (skips "nalezen", "foto", "archiv", etc.)
- **Handles duplicates** by adding numbers (e.g., `-1`, `-2`)

## Examples

```
NEW NAME                                          <- ORIGINAL NAME
files/Tabule/1.pdf                                <- files/Tabule/1-PRAVĚKÁ.pdf
files/Tabule/mamuti-kel-recisti-odry.jpg          <- files/Tabule/Mamutí kel nalezen v řečišti Odry roku 2009...
files/Tabule/isselicrinus-vyskovic.jpg            <- files/Tabule/Isselicrinus nalezen na poli u Výškovic...
files/Tabule/rekonstrukce-zalesneni.jpg           <- files/Tabule/Rekonstrukce zalesnění pro 9.–12. stol...
files/Tabule/zlaty-jelen1.pdf                     <- files/Tabule/ZLATÝ JELEN1.pdf
```

## Usage

### Option 1: Run Shell Script
```bash
./rename_tabule.sh
```

### Option 2: Run Python Script Directly
```bash
python3 rename_tabule_helper.py
```

## Status

✅ **Already Executed**

The script has already been run and completed:
- **154 files** mapped to new names
- **9 JSON config files** updated with new paths
- **0 actual files** renamed (files don't exist yet on this system)

When the actual files are uploaded to the server at `content/files/Tabule/`, you can run the script again to rename them.

## Log File Format

Each line in `tabule_rename_log.txt` shows:
```
NEW_PATH <- ORIGINAL_PATH
```

Example:
```
files/Tabule/1-pravěká obr./mamuti-kel-recisti-odry.jpg <- files/Tabule/1-pravěká obr./Mamutí kel nalezen v řečišti Odry roku 2009 v blízkosti Honculi (Místo uložení Ostravské muzeum, inv čB 14007, fotila Viera Gřondělová).jpg
```

## What Was Updated

All JSON config files in these directories:
- `content/configs/exhibition-panels/1-praveka-obr/items.json`
- `content/configs/exhibition-panels/2-kolonizacni/items.json`
- `content/configs/exhibition-panels/3-stredoveka/items.json`
- `content/configs/exhibition-panels/4-pobelohorska/items.json`
- `content/configs/exhibition-panels/5-prelomova/items.json`
- `content/configs/exhibition-panels/6-prvovalecna/items.json`
- `content/configs/exhibition-panels/7-8-prvorepublikova/items.json`
- `content/configs/exhibition-panels/9-10-druhovalecna/items.json`

All paths starting with `files/Tabule/` have been updated to the new short names.

## Safe to Run Multiple Times

The script is idempotent - you can run it multiple times safely:
- If files already renamed, it will skip them
- If configs already updated, they'll be updated again to match the current mapping
- Duplicate names are handled with numeric suffixes

## Reverting Changes

If you need to revert:
1. Restore JSON configs from git: `git checkout content/configs/`
2. Rename files back using the log (you'd need to reverse the arrows)

## Technical Details

**Python Dependencies**: Standard library only (no pip install needed)
- `json` - JSON parsing
- `pathlib` - Path handling
- `re` - Regular expressions
- `shutil` - File operations

**Czech Character Mapping**:
```python
á→a, č→c, ď→d, é→e, ě→e, í→i, ň→n, ó→o, ř→r, š→s, ť→t, ú→u, ů→u, ý→y, ž→z
```

**Filtered Words** (automatically removed):
```
a, v, na, z, do, u, o, pro, roku, foto, nalezen, archiv, muzeum, etc.
```
