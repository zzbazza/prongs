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
- `position` (optional): Number that controls the category's order among its siblings. Categories with a `position` are sorted ascending and shown first; any without `position` follow, sorted alphabetically by `title` (Czech locale). Use any spacing you like — e.g. `10`, `20`, `30` — to leave gaps for inserting new categories later. Applies recursively (sub-subcategories too).
- `breakBefore` (optional, boolean): When `true`, this category starts on a new row in the grid (forces a row break). Useful for visually grouping related categories. Ignored on the first category.
- `dividerLabel` (optional, string): When set, inserts a labeled divider line above this category (e.g. `"Hry a zábava"`). Implies `breakBefore: true`. Renders as a Bodoni heading flanked by gold rules; ignored on the first category.

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
  - `game` - Interactive game (currently: pexeso). See [Games](#games) below.
- `title` (required): Display title for the item
- `description` (optional): Longer description shown in viewer
- `keywords` (optional): Array of keywords for searching
- `display` (optional): Set to `false` to hide this item from display. Defaults to `true` if not specified
- `icon` (optional): Emoji or short text used as the tile icon. Overrides the default `FILE_ICONS[type]` (e.g. 🎮 for every game).
- `icon_path` (optional): URL/path to an icon image (SVG/PNG) used as the tile icon. Wins over `icon`. Same convention as category `icon_path` — typically `"/static/icons/foo.svg"`.
- `filter` (optional, default `true`): When `icon_path` is set, controls whether the gold colour filter is applied. Set to `false` to render the icon as-is.

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
- `audio` (optional): Exhibition-wide audio that plays continuously across step navigation. Same track schema as step `audio` (string or array of `{ path, start, volume, volumeChanges }`). **Times are in cumulative step seconds**: `start: 0` is the very start of step 1, and the timeline advances along with the actual step progress (sum of completed step durations + current-step elapsed). Auto-advance between steps is continuous; manual prev/next or timeline scrubbing re-syncs the audio to the new cumulative position. Pause/play affects them together with step tracks.

**Media paths:** all `path` fields inside step JSONs (images and audio) are absolute relative to `content/`, e.g. `"files/FOTO/DTJ/photo.jpg"` or `"files/audio/track.m4a"`. A leading `/` is allowed and stripped.

### Step JSON

A step is either an **image step** (default) or a **text step** (`"type": "text"`). Both share the same `audio` schema, pause/play, timeline scrubbing, and step counter.

#### Text step (`"type": "text"`)

Full-screen text slide — no images. Useful for thank-you / credits / chapter intro pages.

```json
{
  "type": "text",
  "title": "Děkujeme za pozornost",
  "text": "Tato virtuální expozice byla připravena Klubem rodáků a přátel Staré Bělé.\n\nFotografie z archivu Sokola Stará Bělá.",
  "duration": 20
}
```

**Fields:**
- `type` (required): must be `"text"`.
- `title` (optional): rendered large at the top of the slide and shown in the footer step title.
- `text` (optional): body content. Line breaks (`\n`) are preserved (rendered with `white-space: pre-wrap`).
- `duration` (required): seconds the slide stays on screen before auto-advancing to the next step.
- `audio` (optional): same format as image steps.

#### Image step

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
- `notes` (optional): Array of annotations drawn on top of the image. Each entry has a `type` (default `"note"`) plus fields specific to that type, and may carry optional timing fields:
  - `appearTime` (default `0`): seconds from when this image first appears, when the annotation becomes visible.
  - `duration` (default = until the image switches): seconds the annotation stays visible after `appearTime`.

  Timing is tied to the step timeline, so scrubbing the progress bar honors `appearTime`/`duration` correctly.

  All coordinates are `[0, 1]` normalized to the rendered image (not the viewport), so they survive resize.

  **Common optional fields (all types):**
  - `fadeIn` (seconds, default `0`): linear opacity ramp from 0 to 1 starting at `appearTime`.
  - `fadeOut` (seconds, default `0`): linear ramp from 1 to 0 ending at `appearTime + duration`. Requires `duration` to be set; ignored otherwise.
  - `color` (CSS color string, default gold): overrides the gold theme color. Accepts hex (`"#ff6600"`), rgb/rgba/hsl/hsla, or named colors. Affects the note pin background, rectangle border, and arrow stroke + arrowhead.
  - `borderSize` (px, rectangle only, default `3`): thickness of the rectangle border.
  - `width` (px, arrow only, default `1.2`): stroke width of the arrow line. The arrowhead scales with stroke width.

  **`type: "note"`** (default) — `?` pin you can tap to open a translucent text bubble. Multiple notes can stay open at once.
  ```json
  { "type": "note", "x": 0.42, "y": 0.31, "text": "Vlevo František Vávra." }
  ```
  - `open` (boolean, default `false`): when `true`, the bubble is shown immediately when the note appears — no tap required. Tapping still toggles it closed (and back open).

  **`type: "rectangle"`** — outlined box drawn at `(x, y)` with the given size, no fill.
  ```json
  { "type": "rectangle", "x": 0.1, "y": 0.15, "width": 0.25, "height": 0.18,
    "appearTime": 2, "duration": 6, "fadeIn": 0.4, "fadeOut": 0.4,
    "color": "#e63946", "borderSize": 5 }
  ```

  **`type: "arrow"`** — line from `(x1, y1)` to `(x2, y2)` with an arrowhead at the second endpoint.
  ```json
  { "type": "arrow", "x1": 0.05, "y1": 0.05, "x2": 0.30, "y2": 0.22,
    "appearTime": 4, "color": "#1d3557", "width": 3 }
  ```

  **`type: "person"`** — bordered rectangle around a person, with a hidden name label that shows on hover/tap. Mirrors the people-tagging used in the standalone image viewer, just with the exhibition annotation schema (`width`/`height` instead of `w`/`h`).
  ```json
  { "type": "person",
    "name": "František Vávra",
    "x": 0.30, "y": 0.18, "width": 0.10, "height": 0.20,
    "appearTime": 2 }
  ```
  - Default rectangle: 2px dashed gold (semi-transparent), so the hot area is discoverable without obscuring the photo. On hover or tap, the border becomes solid and the name label fades in below the rectangle.
  - Customize via `color` (border color) and `borderSize` (border thickness in px).
  - Tap toggles the `open` state — useful on touchscreens where hover doesn't persist. Multiple people can be opened simultaneously.
  - `showName` (boolean, default `false`): when `true`, the name label is always visible (no need to hover or tap), and the border is rendered solid by default to match. Click still toggles `open` but has no visible effect.

  **`type: "image"`** — inset/detail image overlaid on the main image with a thin black frame. Useful for "callouts" (e.g. zoomed-in detail from a map). Combine with an `arrow` annotation to point from the inset to the spot on the main image where the detail comes from.
  ```json
  { "type": "image",
    "src": "files/maps/sokolovna-detail.jpg",
    "x": 0.62, "y": 0.05, "width": 0.30, "height": 0.25,
    "appearTime": 2, "fadeIn": 0.4 }
  ```
  - `src` (required): absolute path under `content/`, same convention as other media.
  - Default frame: 2px black. Override via `color` (frame color) and `borderSize` (frame thickness in px), same as other shape types.
  - The image is rendered with `object-fit: contain` so it always shows the full picture (pick the box's aspect ratio to match the image, or accept letterboxing).

  **Authoring in edit mode** (`yarn start-edit`):
  - A toolbar at the top-right of the viewer offers five tools: **Poznámka** (note), **Obdélník** (rectangle), **Šipka** (arrow), **Obrázek** (image), **Osoba** (person). The active tool has a gold highlight.
  - With **Poznámka** active: click an empty area of the image → prompts for text → drops a `?` pin.
  - With **Obdélník** active: drag from one corner to the opposite corner → drops a rectangle.
  - With **Šipka** active: drag from arrow start to arrow end (arrowhead at release point) → drops an arrow.
  - With **Obrázek** active: drag a box, then a prompt asks for the image path → drops an inset image annotation.
  - With **Osoba** active: drag a box around the person, then a prompt asks for the name → drops a person annotation.
  - Drags shorter than ~2% of the image are ignored, so an accidental click in shape mode doesn't create a zero-size annotation.
  - The floating **JSON** button copies the full current-step JSON for pasting back into the step file. `appearTime` / `duration`, color/size tweaks, and per-shape deletion (other than text notes) are JSON-only edits.

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
- `once` (default `false`): Controls loop behavior.
  - `false` (default): track loops from the beginning every time it reaches its end (background music behavior).
  - `true`: track plays one time per pass through its `start` cue. Going back to the step (Prev) or scrubbing the timeline back before `start` resets the played state, so the track will play again the next time the cue is crossed going forward.
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

## Games

Interactive games for kids (pexeso, jigsaw, treasure hunt, ...). Each game is a folder under `content/games/<name>/` with a `game.json` config. Games are surfaced in the UI by adding `"type": "game"` items to any category's `items.json`.

### Wiring a Game into a Category

```json
{
  "items": [
    {
      "path": "pexeso-dtj",
      "type": "game",
      "title": "Pexeso – DTJ Stará Bělá"
    }
  ]
}
```

`path` is the folder name under `content/games/`.

### Folder Structure

```
content/
├── games/
│   └── pexeso-dtj/
│       └── game.json
└── files/                        ← media (images) referenced by games
```

### game.json (common fields)

Every `game.json` must declare a `kind` so the dispatcher knows which game module to load.

```json
{
  "title": "Display title",
  "description": "Optional description",
  "kind": "pexeso"
}
```

The remaining fields are kind-specific. All media `path` fields are absolute relative to `content/`, same convention as exhibitions.

### Pexeso (`kind: "pexeso"`)

Classic memory pairs game. Cards are laid face-down in a grid; tap two to flip; matching pairs stay up.

```json
{
  "title": "Pexeso – DTJ Stará Bělá",
  "description": "Najdi všechny dvojice fotografií",
  "kind": "pexeso",
  "gridSize": "4x4",
  "pairs": [
    "files/FOTO/DTJ/DTJ.jpg",
    "files/FOTO/DTJ/DTJ muži.jpg",
    "files/FOTO/DTJ/DTJ ženy 30.léta.jpg",
    "files/FOTO/DTJ/1927 DTJ Hastrman.jpg"
  ]
}
```

**Fields:**
- `gridSize` (default `"4x4"`): Board dimensions as `"RxC"`. `R*C` must be even. Common sizes: `"2x2"`, `"3x4"`, `"4x4"`, `"4x5"`, `"4x6"`.
- `pairs` (required): Array of image paths. Each entry is used twice (one pair). Must contain at least `R*C/2` entries; if more, a random subset is chosen each game.

### Puzzle (`kind: "puzzle"`)

Swap-style image puzzle. The picture is sliced into an R×C grid of pieces; pieces are shuffled across the board. Tap two pieces to swap their positions. When a piece arrives at its correct slot it locks in place. Win when every piece is locked. A reference thumbnail of the original image is shown beside the board.

```json
{
  "title": "Puzzle – Otevření Sokolovny 1923",
  "description": "Klepni na dva kousky a vyměň jejich pozice.",
  "kind": "puzzle",
  "gridSize": "3x3",
  "image": "files/PLAKÁTY/slavnostní_otevření_sokolovny-4_8_1923a.jpg"
}
```

**Fields:**
- `image` (string) **or** `images` (array of strings, one chosen at random each game) — at least one is required. Absolute path(s) to the source image(s). Aspect ratio is taken from the chosen image's natural dimensions, so the board fits the picture without distortion. If both are set, `images` wins.
- `gridSize` (default `"3x3"`): Board dimensions as `"RxC"`. `R*C` must be ≥ 4. Easy: `"2x2"` / `"3x3"`. Hard: `"4x4"` / `"5x5"`.

### Seek (`kind: "seek"`)

Hidden-objects / "I-spy" game. A game can contain **multiple rooms** — each a separate scene with its own background and items. On every start/restart a random room is picked, so the same game offers varied playthroughs.

#### Folder structure

```
content/games/<game-name>/
├── game.json              ← top-level config (lists rooms)
└── rooms/
    ├── kitchen.json
    ├── bedroom.json
    └── garden.json
```

#### Game config

```json
{
  "title": "Skřítci",
  "description": "Najdi všechny předměty schované v místnosti.",
  "kind": "seek",
  "rooms": [
    "rooms/kitchen.json",
    "rooms/bedroom.json",
    "rooms/garden.json"
  ]
}
```

**Fields:**
- `rooms` (required): array of paths to room JSON files, relative to the game folder. One is picked at random each time the game opens or Restart is pressed.
- `title`, `description` — game-level display; the chosen room's `title` is appended in the header (e.g. `"Skřítci — Kuchyně"`).

**Back-compat:** if a game has no `rooms` array, the game itself is treated as a single inline room and may use `image` + `items` directly inside `game.json` (the original pre-rooms format).

#### Room config

```json
{
  "title": "Kuchyně",
  "image": "files/games/kitchen.png",
  "items": [
    {
      "src": "files/items/key.png",
      "name": "Klíč",
      "x": 0.30, "y": 0.45,
      "width": 0.05, "height": 0.05
    }
  ]
}
```

**Fields:**
- `title` (optional): shown after the game title in the header.
- `image` (required): absolute path to the background image. Rendered with `object-fit: contain` so it never distorts.
- `items` (required, may be `[]`): array of items to find. Each entry:
  - `src` (required): absolute path to the small item image (PNG with transparency works best so it blends into the scene).
  - `x`, `y`, `width`, `height` (required): item rectangle, normalized `[0, 1]` to the rendered background image. The item is rendered at this rect on the scene and the same rect serves as the tap hit area.
  - `name` (optional): label shown under the item's thumbnail in the bottom checklist.

A correct tap adds a green outline + checkmark to the item on the scene and colours its thumbnail in the **Nápověda** (help) list. After the last item is found, the "Hotovo!" overlay appears with a Restart button (which picks a fresh random room). Tapping the background or an already-found item does nothing.

The help list is **hidden by default** in play mode — the player searches without help. A **Nápověda** button in the header toggles it (shows thumbnails + names of all items, with found items in colour and unfound ones greyed out). In edit mode the list is visible by default so authors can see what they've added.

Empty `items` is allowed — the room opens and shows just the background. The "Hotovo!" overlay only appears when at least one item has been added and all are found.

**Authoring in edit mode** (`yarn start-edit`):
- Edits apply to the **currently displayed room** only. Click Restart to land on a different room and edit that one.
- A floating hint shows the current room's file path; a **JSON místnosti** button toggles a panel showing the live room JSON, ready to copy back into the matching `rooms/<file>.json`.
- **Drag** anywhere on the background to define an item rectangle. On release, a prompt asks for the item's image path; an optional second prompt asks for the name.
- Existing items get a dashed gold outline. **Click** any item to delete it (confirm dialog).
- Edit-mode authoring lives in memory only — copy from the JSON panel and save manually to the matching room file.

Example with image rotation:

```json
{
  "title": "Puzzle – Slavnosti",
  "kind": "puzzle",
  "gridSize": "3x3",
  "images": [
    "files/PLAKÁTY/slavnostní_otevření_sokolovny-4_8_1923a.jpg",
    "files/foto1/SOKOL/DSC_0786a.jpg",
    "files/FOTO/DTJ/1927 DTJ Hastrman.jpg"
  ]
}
```
