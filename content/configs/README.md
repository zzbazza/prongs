# Hierarchical Configuration System

This folder contains the hierarchical configuration for all content in the Stará Běla historical exposition application.

## Structure

The configuration is organized in a folder-based hierarchy that mirrors the category structure users see in the application.

```
configs/
├── category-name/
│   ├── metadata.json       # Category information (title, icon, description)
│   ├── items.json          # Content items in this category
│   ├── items2.json         # Additional items (optional, all merged)
│   └── subcategory/        # Nested subcategory (optional)
│       ├── metadata.json
│       └── items.json
└── another-category/
    ├── metadata.json
    └── items.json
```

## File Types

### metadata.json (Category Information)

Each category folder should contain a `metadata.json` file describing the category itself.

**Format:**
```json
{
  "title": "Display name of category",
  "icon": "📷",
  "description": "Optional description of the category"
}
```

**Example:**
```json
{
  "title": "Fotografie a pohledy",
  "icon": "📷",
  "description": "Photographs and views of Stará Běla"
}
```

**Fields:**
- `title` (required): The Czech display name shown to users
- `icon` (required): Emoji icon representing the category
- `description` (optional): Brief description of the category content

### items.json (Content Items)

Each category folder can contain one or more JSON files with content items. All JSON files (except `metadata.json`) are automatically merged.

**Format:**
```json
{
  "items": [
    {
      "path": "files/example.pdf",
      "type": "document",
      "title": "Item title",
      "description": "Item description",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}
```

**Item Fields:**
- `path` (required): Path to the file relative to `content/` folder (e.g., `"files/photo.jpg"`)
- `type` (required): File type - one of:
  - `image` - Photos, images (jpg, png, etc.)
  - `document` - PDFs and documents
  - `text` - Text files
  - `video` - Video files
  - `audio` - Audio files
- `title` (required): Display title for the item
- `description` (optional): Longer description shown in viewer
- `keywords` (optional): Array of keywords for searching
- `display` (optional): Set to `false` to hide this item from display. Defaults to `true` if not specified

**Example:**
```json
{
  "items": [
    {
      "path": "files/8-prvni_valka.pdf",
      "type": "document",
      "title": "Panel první světová válka",
      "description": "Panel věnovaný první světové válce a jejím dopadům na region Stará Běla",
      "keywords": ["panel", "historie", "první světová válka", "stará běla"]
    },
    {
      "path": "files/draft_photo.jpg",
      "type": "image",
      "title": "Draft photo",
      "display": false
    }
  ]
}
```

**Note:** Items with `"display": false` will be completely hidden from the application, including search results and category views. This is useful for temporarily hiding content without deleting it.

## Creating Categories

### Top-Level Category

1. Create a new folder in `content/configs/` with a lowercase English name (e.g., `photos`)
2. Create `metadata.json` with Czech title and icon
3. Create `items.json` with your content items

**Example:**
```bash
mkdir content/configs/photos
```

Create `content/configs/photos/metadata.json`:
```json
{
  "title": "Fotografie",
  "icon": "📷"
}
```

Create `content/configs/photos/items.json`:
```json
{
  "items": []
}
```

### Subcategories (Nested Categories)

Categories can be nested up to 3-4 levels deep. Simply create a subfolder within an existing category.

**Example - Buildings subcategory under Photos:**
```bash
mkdir content/configs/photos/buildings
```

Create `content/configs/photos/buildings/metadata.json`:
```json
{
  "title": "Budovy a stavby",
  "icon": "🏛️",
  "description": "Historical buildings and structures"
}
```

Create `content/configs/photos/buildings/items.json`:
```json
{
  "items": [
    {
      "path": "files/building1.jpg",
      "type": "image",
      "title": "Hlavní budova",
      "description": "Hlavní historická budova z roku 1890",
      "keywords": ["budova", "architektura", "1890"]
    }
  ]
}
```

## Adding Content

### Adding Items to Existing Category

1. Navigate to the appropriate category folder
2. Edit `items.json` or create a new file like `items2.json`
3. Add your item to the `items` array
4. Make sure the file referenced in `path` exists in `content/files/`

### Multiple Items Files

You can split large categories into multiple JSON files for easier management:

```
exhibition-panels/
├── metadata.json
├── items-ww1.json      # WWI panels
├── items-ww2.json      # WWII panels
└── items-modern.json   # Modern period
```

All will be automatically merged when the app loads.

## Folder Naming Conventions

- **Folder names**: Use lowercase English names with hyphens (e.g., `old-maps`, `exhibition-panels`)
- **File paths**: Store actual files in `content/files/` and reference them as `files/filename.ext`
- **No special characters**: Avoid spaces, Czech characters, or special symbols in folder names

## Navigation Flow

Users navigate through the hierarchy:

```
Home (shows top-level categories)
  → Fotografie (shows subcategories: Budovy, Lidé, etc.)
    → Budovy (shows items or more subcategories)
      → Individual photo viewer
```

## Search Functionality

All items are searchable by:
- Title
- Description
- Keywords

Search results show items from all categories and all levels of the hierarchy.

## Example Structure

```
configs/
├── chronicles/
│   ├── metadata.json
│   └── items.json
├── photos/
│   ├── metadata.json
│   ├── items.json
│   ├── buildings/
│   │   ├── metadata.json
│   │   ├── items.json
│   │   └── churches/
│   │       ├── metadata.json
│   │       └── items.json
│   └── people/
│       ├── metadata.json
│       └── items.json
├── exhibition-panels/
│   ├── metadata.json
│   ├── items-ww1.json
│   └── items-ww2.json
├── project-docs/
│   ├── metadata.json
│   └── items.json
├── old-maps/
│   ├── metadata.json
│   └── items.json
└── newsletter/
    ├── metadata.json
    └── items.json
```

## Tips

- Keep category names short and descriptive
- Use emoji icons that visually represent the category
- Add meaningful keywords to improve searchability
- Split large categories into subcategories for better organization
- Use multiple items files if a category has many items
- Keep the `files/` folder organized with meaningful filenames

## Migration from Old System

The old flat `metadata.json` file is still supported for backwards compatibility, but it's recommended to migrate to the new hierarchical structure for better scalability and organization.

Categories are no longer hardcoded - they are discovered automatically from the folder structure at startup.
