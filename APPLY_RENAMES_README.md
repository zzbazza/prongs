# Apply Tabule Renames Script

## Purpose

This script applies file renames based on `tabule_rename_log.txt`. Use this on **other machines** (like your production server) where the actual files still have the old names, but the JSON configs have already been updated with new paths.

## How It Works

1. Reads `tabule_rename_log.txt` line by line
2. For each `NEW_PATH <- OLD_PATH`:
   - Finds the file at `OLD_PATH` (with fuzzy matching for NBSP and special characters)
   - Renames it to `NEW_PATH`
   - Creates directories as needed

## Usage

### Dry Run (Recommended First)

Test what would happen without actually renaming files:

```bash
python3 apply_tabule_renames.py --dry-run
```

or

```bash
python3 apply_tabule_renames.py -n
```

### Actual Rename

Apply the renames for real:

```bash
python3 apply_tabule_renames.py
```

The script will ask for confirmation before proceeding.

## Prerequisites

1. **`tabule_rename_log.txt`** must exist in the same directory
2. **`content/files/Tabule/`** directory must exist with the old files
3. **JSON configs** should already have the new paths (deployed from git)

## Typical Workflow

### On Development Machine (Already Done)
1. ✅ Run `rename_tabule_helper.py` - Generated new filenames
2. ✅ Renamed actual files
3. ✅ Updated JSON configs
4. ✅ Created `tabule_rename_log.txt`
5. Commit JSON configs and log file to git

### On Production Server
1. Pull latest code (includes updated JSON configs and log file)
2. Upload old files to `content/files/Tabule/`
3. Run `python3 apply_tabule_renames.py --dry-run` to preview
4. Run `python3 apply_tabule_renames.py` to apply renames
5. Files now match the paths in JSON configs

## Features

✅ **Fuzzy matching** - Handles NBSP (hard spaces) and special character variations
✅ **Dry run mode** - Preview changes before applying
✅ **Safe** - Asks for confirmation before renaming
✅ **Smart skipping** - Skips files that don't exist or are already renamed
✅ **Clear output** - Shows ✓ success, ✗ errors, ⊘ skipped

## Output Example

```
=== Tabule File Rename Applicator ===
Reading log file: tabule_rename_log.txt

Found 139 rename operations in log file

Proceed with renaming? (yes/no): yes

✓ Renamed: files/Tabule/1-PRAVĚKÁ.pdf -> files/Tabule/1-praveka.pdf
✓ Renamed: files/Tabule/2-KOLONIZAČNÍ.pdf -> files/Tabule/2-kolonizacni.pdf
✗ File not found: files/Tabule/1-pravěká obr./IMG_3700.JPG
✓ Renamed: files/Tabule/3-STŘEDOVĚKÁ.pdf -> files/Tabule/3-stredoveka.pdf
...

=== Summary ===
Total operations: 139
✓ Successfully renamed: 135
⊘ Skipped (not found or already exists): 4
✗ Errors: 0

Done!
```

## Files Needed

1. **`apply_tabule_renames.py`** - This script
2. **`tabule_rename_log.txt`** - The rename log (139 lines)
3. **`content/files/Tabule/`** - Directory with old files

## Log File Format

Each line in `tabule_rename_log.txt`:
```
files/Tabule/2-kolonizacni.pdf <- files/Tabule/2-KOLONIZAČNÍ.pdf
files/Tabule/mamuti-kel-odry.jpg <- files/Tabule/Mamutí kel nalezen v řečišti...jpg
```

Format: `NEW_PATH <- OLD_PATH`

## Safety Features

- ✅ Does NOT overwrite existing files
- ✅ Does NOT modify files if target already exists
- ✅ Creates directories only when needed
- ✅ Asks for confirmation before renaming
- ✅ Dry run mode for testing

## Troubleshooting

### "File not found"
- File might already be renamed
- File might not exist on this machine
- Check the actual filename for special characters

### "Already exists"
- Target file already exists (rename already applied)
- Safe to skip

### Unicode/Special Character Issues
- Script handles NBSP (U+00A0) automatically
- Tries multiple normalization strategies
- Checks actual directory contents

## Dependencies

**Python Standard Library Only** - No pip install needed:
- `os` - File operations
- `shutil` - Moving files
- `pathlib` - Path handling
- `unicodedata` - Unicode normalization

## Command Line Options

- `--dry-run` or `-n` - Preview changes without applying
- No flags - Apply renames (with confirmation)

## Example Commands

```bash
# Preview what would happen
python3 apply_tabule_renames.py --dry-run

# Apply renames
python3 apply_tabule_renames.py

# Make script executable (optional)
chmod +x apply_tabule_renames.py
./apply_tabule_renames.py --dry-run
```
