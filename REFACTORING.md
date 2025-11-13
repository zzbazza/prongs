# Code Refactoring - Modular Structure

## Current Status

The app.js file (920 lines) has been partially refactored into ES6 modules.

## Completed Modules

### Core Modules (public/js/)
- **state.js** - Application state, DOM elements, constants (52 lines) ✅
- **utils.js** - Utility functions (escapeHtml, setLoading) (18 lines) ✅
- **api.js** - Data loading and category management (74 lines) ✅
- **navigation.js** - Navigation, breadcrumbs, rendering (337 lines) ✅
- **fileViewer.js** - File viewer controller (47 lines) ✅

### Legacy Files
- **viewers.js** - Document viewers (old version, needs update) (73 lines)
- **dataLoader.js** - (duplicate of api.js, can be removed)

## Remaining Work

### 1. Create Viewer Submodules

**public/js/viewers/imageViewer.js** (~200 lines)
- `setupImageZoom()` - Zoom controls and gestures
- `renderImageViewer()` - Image display with navigation
- `setupSwipeGestures()` - Touch swipe support

**public/js/viewers/documentViewers.js** (~100 lines)
- `renderPDFViewer()` - PDF display
- `renderTextViewer()` - Text file display
- `renderVideoViewer()` - Video player
- `renderAudioViewer()` - Audio player

### 2. Create UI Module

**public/js/ui/textSize.js** (~50 lines)
- `increaseTextSize()`
- `decreaseTextSize()`
- `setTextSize()`
- `updateTextSizeButtons()`

### 3. Create Main Entry Point

**public/js/app.js** (~100 lines)
- Import all modules
- `init()` function
- Event handlers (keyboard shortcuts, button clicks)
- Start application

### 4. Update HTML

**public/index.html**
- Change script tag to: `<script src="/static/js/app.js" type="module"></script>`
- Remove old app.js script tag

## Module Dependencies

```
app.js (main)
├── state.js
├── utils.js
├── api.js
│   ├── state.js
│   └── utils.js
├── navigation.js
│   ├── state.js
│   ├── api.js
│   └── utils.js
├── fileViewer.js
│   ├── state.js
│   ├── navigation.js
│   ├── viewers/imageViewer.js
│   └── viewers/documentViewers.js
├── viewers/imageViewer.js
│   ├── state.js
│   └── utils.js
├── viewers/documentViewers.js
│   ├── state.js
│   └── utils.js
└── ui/textSize.js
    └── state.js
```

## Benefits

1. **Better Organization** - Logical separation of concerns
2. **Easier Maintenance** - Smaller, focused files
3. **Reusability** - Modules can be imported where needed
4. **Testing** - Individual modules can be tested
5. **Performance** - Browser can cache modules separately

## File Size Comparison

- Original: app.js (920 lines)
- Refactored: 7 modules (665+ lines, more to add)

## Next Steps

1. Extract image viewer functions from app-backup.js lines 579-800
2. Extract document viewer functions from app-backup.js lines 802-862
3. Extract text size functions from app-backup.js lines 869-910
4. Create main app.js with initialization and event handlers
5. Update index.html
6. Test thoroughly
7. Remove app-backup.js once confirmed working
