#!/bin/bash

# Apply Tabule File Renames - Shell Wrapper
# Applies renames from tabule_rename_log.txt to actual files

set -e

echo "=== Apply Tabule File Renames ==="
echo ""
echo "This script will rename files based on tabule_rename_log.txt"
echo ""

# Check if log file exists
if [ ! -f "tabule_rename_log.txt" ]; then
    echo "Error: tabule_rename_log.txt not found!"
    echo "Make sure you're in the correct directory."
    exit 1
fi

# Run the Python script
python3 apply_tabule_renames.py "$@"
