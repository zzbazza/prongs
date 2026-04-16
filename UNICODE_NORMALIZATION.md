# Unicode Normalization Guide

## Problem Overview

This project encountered **file not found errors** on Linux/Ubuntu servers while working perfectly on macOS. The issue was caused by **Unicode normalization differences** between operating systems.

### Root Cause

- **macOS** uses **NFD (decomposed)** Unicode normalization for filesystems
  - Czech characters like `ů`, `á`, `é`, `í`, `ě`, `č`, `š`, `ž`, `ř`, `ň` are stored as: base letter + combining accent mark
  - Example: `ů` = `u` + combining ring above (`\u030a`)

- **Linux/Ubuntu** uses **NFC (composed)** Unicode normalization
  - These characters are stored as single precomposed characters
  - Example: `ů` = single character (`\u016f`)

- **macOS filesystem is tolerant** and matches both NFD and NFC forms
- **Linux filesystem requires exact matches**, causing "file not found" errors when paths use different normalization

## Solution: Always Use NFC

**All paths in JSON configuration files MUST use NFC (composed) normalization** for cross-platform compatibility.

## Tools Provided

### 1. `normalize_unicode_paths.py`

Automatically normalizes all paths in existing `items.json` files.

```bash
# Check for non-normalized paths
python3 normalize_unicode_paths.py --check-only

# Fix all paths (normalize to NFC)
python3 normalize_unicode_paths.py
```

**When to use:**
- After manually editing items.json files
- After bulk file operations
- Before deploying to Ubuntu server
- As a verification step in CI/CD

### 2. `generate_items_json.py`

Generates new items.json files with NFC normalization built-in.

```bash
# Generate items.json for a directory
python3 generate_items_json.py "content/files/FOTO/DTJ" "content/configs/photos/dtj/items.json"
```

**When to use:**
- Creating new category configs
- Regenerating items after adding files
- Initial setup of new categories

## Best Practices

### When Creating New Categories

1. **Use the generation script** (it handles NFC automatically):
   ```bash
   python3 generate_items_json.py "content/files/NewFolder" "content/configs/category/items.json"
   ```

2. **If creating manually**, always normalize paths:
   ```python
   import unicodedata

   def normalize_path(path):
       parts = path.split('/')
       return '/'.join(unicodedata.normalize('NFC', p) for p in parts)
   ```

### Before Deployment

Always run the normalization check:

```bash
python3 normalize_unicode_paths.py --check-only
```

If it finds issues, fix them:

```bash
python3 normalize_unicode_paths.py
```

### In Development

- Test on both macOS and Linux when possible
- Add normalization check to pre-commit hooks
- Include in CI/CD pipeline

## Common Affected Characters

Czech characters that require normalization:

- Letters with acute: `á`, `é`, `í`, `ó`, `ú`, `ý`
- Letters with háček: `č`, `ď`, `ě`, `ň`, `ř`, `š`, `ť`, `ž`
- Letters with ring: `ů`
- Uppercase variants: `Á`, `É`, `Í`, `Ó`, `Ú`, `Ý`, `Č`, `Ď`, `Ě`, `Ň`, `Ř`, `Š`, `Ť`, `Ž`, `Ů`

## Examples

### NFD (macOS default - problematic on Linux)
```
Path: files/FOTO/Břetislav Lyčka/DSCN5569.JPG
       ↑                ↑
  Decomposed: B + r̆   y + č̌
```

### NFC (Linux required - works everywhere)
```
Path: files/FOTO/Břetislav Lyčka/DSCN5569.JPG
       ↑                ↑
  Composed: ř (single)  č (single)
```

## Troubleshooting

### Files not found on Ubuntu but work on macOS

**Symptom:** Categories show "0 items" or images don't load

**Solution:**
1. Check normalization:
   ```bash
   python3 normalize_unicode_paths.py --check-only
   ```

2. Fix if needed:
   ```bash
   python3 normalize_unicode_paths.py
   ```

3. Restart server and test

### New category not working on Ubuntu

**Check:**
1. Are paths in items.json using NFC?
2. Do directory names in filesystem match paths exactly?
3. Run normalization script as verification

## Integration with Scripts

When creating helper scripts or tools that generate paths:

```python
import unicodedata

def create_item(file_path):
    # Always normalize to NFC
    normalized_path = unicodedata.normalize('NFC', file_path)

    return {
        'path': normalized_path,
        'type': 'image',
        'title': unicodedata.normalize('NFC', title)
    }
```

## Summary

✅ **ALWAYS use NFC normalization** for paths in JSON configs
✅ **Use provided scripts** to generate/check items.json
✅ **Test on Linux** before production deployment
✅ **Run normalization check** before git commits
✅ **Document** any custom scripts to use NFC

This ensures the application works correctly on both macOS and Linux/Ubuntu systems.
