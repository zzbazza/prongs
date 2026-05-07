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
- `path` (required): Path to the file relative to `content/` folder (e.g., `"files/photo.jpg"`). For `exhibition` items the path is the folder name under `content/exhibitions/` (no `files/` prefix).
- `type` (required): File type - one of:
  - `image` - Photos, images (jpg, png, etc.)
  - `document` - PDFs and documents
  - `panel` - Exhibition panel image
  - `text` - Text files
  - `video` - Video files
  - `audio` - Audio files
  - `exhibition` - Virtual exhibition (slideshow with audio + notes). See [Virtual Exhibitions](#virtual-exhibitions) below.
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

## Virtual Exhibitions

A *virtual exhibition* is a guided slideshow of photographs with optional background audio (multiple tracks, with start times and volume envelopes) and clickable notes pinned to specific points on each photo.

### Wiring an Exhibition into a Category

Add an item with `"type": "exhibition"` to any category's `items.json`. The `path` is the folder name under `content/exhibitions/`:

```json
{
  "items": [
    {
      "path": "ukazka",
      "type": "exhibition",
      "title": "Ukázka virtuální expozice"
    }
  ]
}
```

### Folder Structure

```
content/
├── exhibitions/
│   └── ukazka/
│       ├── exhibition.json
│       └── steps/
│           ├── 01-uvod.json
│           └── 02-slavnosti.json
└── files/
    └── FOTO/DTJ/                  ← media files (images + audio)
```

### exhibition.json

Top-level config of an exhibition.

```json
{
  "title": "Ukázka virtuální expozice",
  "description": "Krátká ukázková expozice.",
  "steps": [
    "steps/01-uvod.json",
    "steps/02-slavnosti.json"
  ]
}
```

**Fields:**
- `title` (required): Display title.
- `description` (optional): Currently loaded but not rendered in the viewer.
- `steps` (required): Ordered array of step file paths, relative to the exhibition folder.

**Media paths:** all `path` fields inside step JSONs (images and audio) are absolute relative to `content/`, e.g. `"files/FOTO/DTJ/photo.jpg"` or `"files/audio/track.m4a"`. A leading `/` is allowed and stripped.

### Step JSON

Each step is one slide group: a sequence of images with per-image durations, optional audio tracks, and optional notes pinned to images.

```json
{
  "title": "Úvod – Dělnická tělovýchovná jednota",
  "audio": [
    {
      "path": "files/audio/ambient.mp3",
      "start": 0,
      "volume": 0.6,
      "volumeChanges": [
        { "time": 8,  "volume": 0.25 },
        { "time": 24, "volume": 0 }
      ]
    },
    {
      "path": "files/audio/narration.mp3",
      "start": 8,
      "volume": 1.0
    }
  ],
  "images": [
    {
      "path": "files/FOTO/DTJ/DTJ.jpg",
      "duration": 6,
      "notes": [
        { "x": 0.42, "y": 0.31, "text": "Vlevo František Vávra." }
      ]
    },
    { "path": "files/FOTO/DTJ/DTJ muži.jpg",       "duration": 6 },
    { "path": "files/FOTO/DTJ/DTJ ženy 30.léta.jpg", "duration": 6 }
  ]
}
```

#### `images[]`

- `path` (required): Absolute media path, e.g. `files/FOTO/DTJ/photo.jpg`.
- `duration` (required): Seconds the image stays on screen. Step total duration = sum of all image durations.
- `notes` (optional): Array of `{ x, y, text }`. `x` and `y` are normalized `[0, 1]` coordinates relative to the **rendered image bounds** (not the viewport), so they survive resize. The viewer shows a `?` pin at each note; clicking opens a translucent bubble with the note text. Multiple notes can be open simultaneously.

#### `audio` (optional)

Two accepted forms:

- **String** — single track at `start: 0`, `volume: 1`:
  ```json
  "audio": "files/audio/narration.mp3"
  ```
- **Array of track objects** — multiple tracks, may overlap:
  ```json
  "audio": [
    { "path": "files/audio/music.mp3", "start": 0, "volume": 0.6, "volumeChanges": [...] },
    { "path": "files/audio/voice.mp3", "start": 5, "volume": 1.0 }
  ]
  ```

**Track fields** (all times in seconds since the step started):
- `path` (required): Absolute audio path, e.g. `files/audio/track.mp3`.
- `start` (default `0`): When the track begins playing.
- `volume` (default `1`): Initial volume `[0, 1]`.
- `volumeChanges` (optional): Ordered list of cues. Each cue is either:
  - **Instant snap** — `{ time, volume }`: volume jumps to `volume` at `time`.
  - **Linear ramp** — `{ time, endVolume, duration?, startVolume? }`: volume linearly interpolates from `startVolume` (defaults to the current volume at `time`) to `endVolume` over `duration` seconds. `duration` of `0` or omitted snaps instantly.

**Ramp examples:**

```json
"volumeChanges": [
  { "time": 0,  "startVolume": 0,    "endVolume": 0.6, "duration": 3 },   // fade in over 3s
  { "time": 12, "endVolume": 0.2, "duration": 2 },                         // fade from current vol to 0.2 over 2s
  { "time": 24, "endVolume": 0,   "duration": 4 }                          // fade out over 4s
]
```

Tracks reset on step change. Pause / play / timeline scrubbing affect every track in sync.

### Viewer Controls

- **Timeline (progress bar)**: Shows step elapsed/total. Tick marks indicate where the next image takes over. Click anywhere on the bar to jump to that point in the step (images and audio re-sync).
- **Pause / Play button** (centered next to the slide counter).
- **Prev / Next** step buttons.
- The viewer auto-advances to the next step when one finishes; the last step holds.

### Edit Mode

Start the server with `yarn start-edit` (or `node server.js --edit`). The frontend picks up the flag from `/api/config` and unlocks editing in the exhibition viewer:

- Click empty area on a photo → prompts for note text and drops a `?` pin at the click position.
- Click a pin → "Upravit" / "Smazat" buttons appear in the bubble.
- Floating **JSON** button (top-right of the viewer) → opens a panel with the current step's JSON, ready to copy/paste back into the step file.

Edits live in memory only; you must copy the JSON and save it manually to the step file.
