#!/bin/bash

# Tabule Files Renaming Script
# This script renames files in content/files/Tabule with long names to shorter, standardized names
# and updates all references in content/configs JSON files

set -e

CONTENT_DIR="content"
FILES_DIR="$CONTENT_DIR/files"
CONFIGS_DIR="$CONTENT_DIR/configs/exhibition-panels"
LOG_FILE="tabule_rename_log.txt"
PYTHON_SCRIPT="rename_tabule_helper.py"

echo "=== Tabule Files Renaming Script ==="
echo ""

# Check if Python helper script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "Error: Python helper script '$PYTHON_SCRIPT' not found!"
    echo "Please ensure rename_tabule_helper.py is in the same directory."
    exit 1
fi

# Run the Python script to generate rename mappings and perform renames
python3 "$PYTHON_SCRIPT"

# Check if log file was created
if [ -f "$LOG_FILE" ]; then
    echo ""
    echo "=== Rename Summary ==="
    wc -l < "$LOG_FILE" | xargs echo "Total files renamed:"
    echo ""
    echo "Full log saved to: $LOG_FILE"
    echo ""
    echo "Sample changes:"
    head -10 "$LOG_FILE"
else
    echo "No log file created. Check for errors above."
fi

echo ""
echo "=== Done ==="
