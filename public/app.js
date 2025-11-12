// Application state
const state = {
  allItems: [],
  allCategories: [],
  currentCategories: [], // Categories at current level
  currentView: 'home', // 'home', 'category', 'search', 'viewer'
  currentCategoryPath: [], // Array of category IDs forming the path
  categoryPathString: '', // Joined path like "photos/buildings/churches"
  searchQuery: '',
  currentIndex: -1,
  currentFile: null,
  textSize: 'medium',
  textSizes: ['small', 'medium', 'large'],
  isLegacy: false // Whether using legacy flat category structure
};

// DOM elements
const elements = {
  fileList: document.getElementById('fileList'),
  browserView: document.getElementById('browserView'),
  contentViewer: document.getElementById('contentViewer'),
  viewerContent: document.getElementById('viewerContent'),
  closeViewer: document.getElementById('closeViewer'),
  textSizeDecrease: document.getElementById('textSizeDecrease'),
  textSizeIncrease: document.getElementById('textSizeIncrease'),
  homeBtn: document.getElementById('homeBtn'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  breadcrumbHome: document.getElementById('breadcrumbHome'),
  breadcrumbSeparator: document.getElementById('breadcrumbSeparator'),
  breadcrumbCategory: document.getElementById('breadcrumbCategory'),
  breadcrumbSeparator2: document.getElementById('breadcrumbSeparator2'),
  breadcrumbFile: document.getElementById('breadcrumbFile')
};

// File type icons
const FILE_ICONS = {
  folder: '📁',
  image: '🖼️',
  document: '📄',
  text: '📝',
  video: '🎬',
  audio: '🎵',
  unknown: '📎'
};

// Initialize app
async function init() {
  // Load saved text size preference
  const savedTextSize = localStorage.getItem('textSize') || 'medium';
  setTextSize(savedTextSize);

  // Event listeners
  elements.closeViewer.addEventListener('click', closeViewer);
  elements.textSizeDecrease.addEventListener('click', decreaseTextSize);
  elements.textSizeIncrease.addEventListener('click', increaseTextSize);
  elements.homeBtn.addEventListener('click', goHome);
  elements.breadcrumbHome.addEventListener('click', goHome);

  // Breadcrumb category click - navigate up one level
  elements.breadcrumbCategory.addEventListener('click', () => {
    if (state.currentView === 'viewer') {
      closeViewer();
    } else if (state.currentView === 'category' && state.currentCategoryPath.length > 1) {
      // Navigate up one level in category hierarchy
      navigateUpCategory();
    }
  });

  // Search input with debounce
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    const value = e.target.value;

    // Show/hide clear button
    elements.clearSearch.classList.toggle('hidden', !value);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = value.trim();
      if (state.searchQuery) {
        state.currentView = 'search';
        performSearch();
      } else {
        goHome();
      }
    }, 300);
  });

  // Clear search button
  elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearch.classList.add('hidden');
    state.searchQuery = '';
    goHome();
  });

  // Load all data and show home
  await loadAllData();
  showHome();
}

// Load all categories and items
async function loadAllData() {
  setLoading(true);
  try {
    // Load categories
    const catResponse = await fetch('/api/categories');
    const catData = await catResponse.json();
    state.allCategories = catData.categories;
    state.currentCategories = catData.categories;
    state.isLegacy = catData.isLegacy || false;

    // Load all items
    const itemsResponse = await fetch('/api/items');
    const itemsData = await itemsResponse.json();
    state.allItems = itemsData.items;
  } catch (error) {
    console.error('Error loading data:', error);
    alert('Chyba při načítání obsahu');
  } finally {
    setLoading(false);
  }
}

// Get category title from path
function getCategoryTitle(categoryPath) {
  if (!categoryPath || categoryPath.length === 0) return '';

  let categories = state.allCategories;
  let title = '';

  for (let i = 0; i < categoryPath.length; i++) {
    const catId = categoryPath[i];
    const found = categories.find(c => c.id === catId);
    if (found) {
      if (i === categoryPath.length - 1) {
        title = found.title;
      }
      categories = found.subcategories || [];
    } else {
      return categoryPath[categoryPath.length - 1];
    }
  }

  return title;
}

// Update breadcrumbs
function updateBreadcrumbs() {
  if (state.currentView === 'home') {
    // Home view
    elements.breadcrumbHome.classList.add('active');
    elements.breadcrumbSeparator.style.display = 'none';
    elements.breadcrumbCategory.style.display = 'none';
    elements.breadcrumbSeparator2.style.display = 'none';
    elements.breadcrumbFile.style.display = 'none';
    elements.closeViewer.style.display = 'none';
  } else if (state.currentView === 'viewer' && state.currentFile) {
    // Viewer - show full path including file
    elements.breadcrumbHome.classList.remove('active');
    elements.breadcrumbSeparator.style.display = 'inline';
    elements.breadcrumbCategory.style.display = 'inline';
    elements.breadcrumbCategory.classList.remove('active');

    // Show category or search context
    if (state.currentCategoryPath.length > 0) {
      const categoryTitle = getCategoryTitle(state.currentCategoryPath);
      elements.breadcrumbCategory.textContent = categoryTitle || state.categoryPathString;
    } else if (state.searchQuery) {
      elements.breadcrumbCategory.textContent = `Hledání: "${state.searchQuery}"`;
    } else {
      elements.breadcrumbCategory.textContent = 'Všechny položky';
    }

    // Show file name
    elements.breadcrumbSeparator2.style.display = 'inline';
    elements.breadcrumbFile.style.display = 'inline';
    elements.breadcrumbFile.textContent = state.currentFile.title || state.currentFile.path;
    elements.breadcrumbFile.classList.add('active');

    // Show close button
    elements.closeViewer.style.display = 'block';
  } else if (state.currentView === 'category' && state.currentCategoryPath.length > 0) {
    // Category view
    elements.breadcrumbHome.classList.remove('active');
    elements.breadcrumbSeparator.style.display = 'inline';
    elements.breadcrumbCategory.style.display = 'inline';
    elements.breadcrumbSeparator2.style.display = 'none';
    elements.breadcrumbFile.style.display = 'none';
    elements.closeViewer.style.display = 'none';

    const categoryTitle = getCategoryTitle(state.currentCategoryPath);
    elements.breadcrumbCategory.textContent = categoryTitle || state.categoryPathString;
    elements.breadcrumbCategory.classList.add('active');
  } else if (state.currentView === 'search') {
    // Search view
    elements.breadcrumbHome.classList.remove('active');
    elements.breadcrumbSeparator.style.display = 'inline';
    elements.breadcrumbCategory.style.display = 'inline';
    elements.breadcrumbSeparator2.style.display = 'none';
    elements.breadcrumbFile.style.display = 'none';
    elements.closeViewer.style.display = 'none';
    elements.breadcrumbCategory.textContent = `Hledání: "${state.searchQuery}"`;
    elements.breadcrumbCategory.classList.add('active');
  }
}

// Go to home view
function goHome() {
  // Close viewer if it's open
  if (!elements.contentViewer.classList.contains('hidden')) {
    elements.contentViewer.classList.add('hidden');
    elements.browserView.classList.remove('hidden');
  }

  // Reset state
  state.currentView = 'home';
  state.currentCategoryPath = [];
  state.categoryPathString = '';
  state.currentCategories = state.allCategories;
  state.searchQuery = '';
  state.currentIndex = -1;
  state.currentFile = null;

  // Clear search UI
  elements.searchInput.value = '';
  elements.clearSearch.classList.add('hidden');

  // Show home and update breadcrumbs
  showHome();
  updateBreadcrumbs();
}

// Navigate up one level in category hierarchy
function navigateUpCategory() {
  if (state.currentCategoryPath.length === 0) {
    goHome();
    return;
  }

  // Remove last level from path
  state.currentCategoryPath.pop();
  state.categoryPathString = state.currentCategoryPath.join('/');

  if (state.currentCategoryPath.length === 0) {
    // Back to home
    goHome();
  } else {
    // Find parent category and show its children
    let categories = state.allCategories;
    for (let i = 0; i < state.currentCategoryPath.length; i++) {
      const catId = state.currentCategoryPath[i];
      const found = categories.find(c => c.id === catId);
      if (found) {
        categories = found.subcategories || [];
      }
    }

    state.currentCategories = categories;
    state.currentView = 'category';
    showHome();
  }
}

// Show/hide loading indicator
function setLoading(isLoading) {
  elements.loadingIndicator.classList.toggle('hidden', !isLoading);
}

// Show home/category page with folders
function showHome() {
  const categories = state.currentCategories;

  if (categories.length === 0) {
    elements.fileList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <div>Žádné kategorie nenalezeny</div>
      </div>
    `;
    updateBreadcrumbs();
    return;
  }

  const html = categories.map(category => `
    <div class="file-item category-folder"
         data-category-id="${category.id}"
         data-has-subcategories="${(category.subcategories && category.subcategories.length > 0) ? 'true' : 'false'}">
      <div class="file-icon">${category.icon || '📁'}</div>
      <div class="file-name">${escapeHtml(category.title)}</div>
      ${category.itemCount ? `<div class="file-description">${category.itemCount} položek</div>` : ''}
    </div>
  `).join('');

  elements.fileList.innerHTML = html;

  // Add click handlers
  elements.fileList.querySelectorAll('.category-folder').forEach(item => {
    item.addEventListener('click', () => {
      const categoryId = item.dataset.categoryId;
      enterCategory(categoryId);
    });
  });

  updateBreadcrumbs();
}

// Enter a category (navigate into it)
function enterCategory(categoryId) {
  // Find the category in current level
  const category = state.currentCategories.find(c => c.id === categoryId);
  if (!category) {
    console.error('Category not found:', categoryId);
    return;
  }

  // Update category path
  state.currentCategoryPath.push(categoryId);
  state.categoryPathString = state.currentCategoryPath.join('/');

  // Check if category has subcategories
  if (category.subcategories && category.subcategories.length > 0) {
    // Show subcategories
    state.currentView = 'category';
    state.currentCategories = category.subcategories;
    showHome(); // Reuse showHome to display subcategories
  } else {
    // No subcategories - show items in this category
    showCategoryItems();
  }
}

// Show items in current category
function showCategoryItems() {
  state.currentView = 'category';

  // Filter items by current category path
  const filteredItems = state.allItems.filter(item => {
    if (state.isLegacy) {
      // Legacy mode: check if last path segment is in categories array
      const lastCat = state.currentCategoryPath[state.currentCategoryPath.length - 1];
      return item.categories && item.categories.includes(lastCat);
    } else {
      // New mode: check if categoryId matches current path
      return item.categoryId === state.categoryPathString;
    }
  });

  renderItemList(filteredItems);
  updateBreadcrumbs();
}

// Perform search
function performSearch() {
  if (!state.searchQuery) {
    goHome();
    return;
  }

  const searchLower = state.searchQuery.toLowerCase();
  const results = state.allItems.filter(item => {
    const titleMatch = item.title?.toLowerCase().includes(searchLower);
    const descMatch = item.description?.toLowerCase().includes(searchLower);
    const keywordMatch = item.keywords?.some(k => k.toLowerCase().includes(searchLower));
    return titleMatch || descMatch || keywordMatch;
  });

  renderItemList(results);
  updateBreadcrumbs();
}

// Render item list (files)
function renderItemList(items) {
  if (items.length === 0) {
    elements.fileList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div>${state.searchQuery ? 'Žádné výsledky nenalezeny' : 'V této kategorii nejsou žádné položky'}</div>
      </div>
    `;
    return;
  }

  const html = items.map((item, index) => {
    // Use thumbnail for images, icon for other types
    const iconHtml = item.type === 'image'
      ? `<img src="/content/${item.path}" alt="${escapeHtml(item.title || item.path)}" class="file-thumbnail" loading="lazy">`
      : `<div class="file-icon">${FILE_ICONS[item.type] || FILE_ICONS.unknown}</div>`;

    return `
      <div class="file-item" data-index="${index}" data-type="${item.type}">
        ${iconHtml}
        <div class="file-name">${escapeHtml(item.title || item.path)}</div>
        ${item.description ? `<div class="file-description">${escapeHtml(item.description)}</div>` : ''}
      </div>
    `;
  }).join('');

  elements.fileList.innerHTML = html;

  // Store current items for file navigation
  state.currentItems = items;

  // Add click handlers
  elements.fileList.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      openFile(state.currentItems[index], index);
    });
  });
}

// Open file in viewer
function openFile(item, index) {
  state.currentIndex = index;
  state.currentFile = item;
  state.currentView = 'viewer';
  elements.browserView.classList.add('hidden');
  elements.contentViewer.classList.remove('hidden');

  switch (item.type) {
    case 'image':
      renderImageViewer(item);
      break;
    case 'document':
      renderPDFViewer(item);
      break;
    case 'text':
      renderTextViewer(item);
      break;
    case 'video':
      renderVideoViewer(item);
      break;
    case 'audio':
      renderAudioViewer(item);
      break;
    default:
      elements.viewerContent.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div>Nepodporovaný typ souboru</div></div>';
  }

  updateBreadcrumbs();
}

// Close viewer
function closeViewer() {
  elements.contentViewer.classList.add('hidden');
  elements.browserView.classList.remove('hidden');
  state.currentIndex = -1;
  state.currentFile = null;

  // Restore previous view
  if (state.currentCategoryPath.length > 0) {
    state.currentView = 'category';
  } else if (state.searchQuery) {
    state.currentView = 'search';
  } else {
    state.currentView = 'home';
  }

  updateBreadcrumbs();
}

// Setup image zoom functionality
function setupImageZoom() {
  const img = document.getElementById('currentImage');
  const container = document.getElementById('imageContainer');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const zoomResetBtn = document.getElementById('zoomReset');

  if (!img || !container) return;

  let currentScale = 1;
  const zoomStep = 0.25;
  const minScale = 0.5;
  const maxScale = 4;

  // Set initial size to fit container
  function fitToContainer() {
    img.style.transform = 'scale(1)';
    img.style.transformOrigin = 'center center';
    currentScale = 1;
    img.classList.remove('zoomed');
    container.scrollTo(0, 0);
  }

  // Apply zoom
  function applyZoom(scale) {
    currentScale = Math.max(minScale, Math.min(maxScale, scale));
    img.style.transform = `scale(${currentScale})`;

    if (currentScale > 1) {
      img.classList.add('zoomed');
    } else {
      img.classList.remove('zoomed');
    }
  }

  // Zoom in
  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    applyZoom(currentScale + zoomStep);
  });

  // Zoom out
  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    applyZoom(currentScale - zoomStep);
  });

  // Reset zoom
  zoomResetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fitToContainer();
  });

  // Click image to toggle zoom
  img.addEventListener('click', (e) => {
    if (currentScale === 1) {
      applyZoom(2);
    } else {
      fitToContainer();
    }
  });

  // Double click to reset
  img.addEventListener('dblclick', (e) => {
    e.preventDefault();
    fitToContainer();
  });

  // Mouse wheel zoom
  container.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
      applyZoom(currentScale + delta);
    }
  }, { passive: false });

  // Touch pinch zoom support
  let initialDistance = 0;
  let initialScale = 1;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialDistance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      initialScale = currentScale;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const scale = initialScale * (currentDistance / initialDistance);
      applyZoom(scale);
    }
  }, { passive: false });

  // Initialize
  img.onload = () => {
    fitToContainer();
  };

  // If image already loaded
  if (img.complete) {
    fitToContainer();
  }
}

// Render image viewer with navigation
function renderImageViewer(item) {
  const imagePath = `/content/${item.path}`;

  // Find all images in current items
  const images = (state.currentItems || []).filter(f => f.type === 'image');
  const currentImageIndex = images.findIndex(img => img.path === item.path);
  const hasPrev = currentImageIndex > 0;
  const hasNext = currentImageIndex < images.length - 1;

  let html = `
    <div class="image-viewer-layout">
      <div class="image-container" id="imageContainer">
        ${hasPrev ? `<button class="image-nav prev" id="prevImage">‹</button>` : ''}
        <img src="${imagePath}" alt="${escapeHtml(item.title || item.path)}" id="currentImage">
        ${hasNext ? `<button class="image-nav next" id="nextImage">›</button>` : ''}
        <div class="image-zoom-controls">
          <button class="zoom-btn" id="zoomOut" title="Zmenšit">−</button>
          <button class="zoom-btn" id="zoomIn" title="Zvětšit">+</button>
          <button class="zoom-btn" id="zoomReset" title="Obnovit velikost">⟲</button>
        </div>
      </div>
      <div class="file-metadata">
        <h2>${escapeHtml(item.title || item.path)}</h2>
        ${item.description ? `<p class="metadata-description">${escapeHtml(item.description)}</p>` : ''}
        ${item.keywords && item.keywords.length ? `
          <div class="metadata-keywords">
            <strong>Klíčová slova:</strong> ${item.keywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join(' ')}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  elements.viewerContent.innerHTML = html;

  // Setup zoom functionality
  setupImageZoom();

  // Navigation handlers
  if (hasPrev) {
    document.getElementById('prevImage').addEventListener('click', () => {
      const prevImage = images[currentImageIndex - 1];
      const prevIndex = state.currentItems.findIndex(f => f.path === prevImage.path);
      openFile(prevImage, prevIndex);
    });
  }

  if (hasNext) {
    document.getElementById('nextImage').addEventListener('click', () => {
      const nextImage = images[currentImageIndex + 1];
      const nextIndex = state.currentItems.findIndex(f => f.path === nextImage.path);
      openFile(nextImage, nextIndex);
    });
  }

  // Touch swipe support
  setupSwipeGestures(currentImageIndex, images);
}

// Setup swipe gestures for image navigation
function setupSwipeGestures(currentImageIndex, images) {
  const container = document.getElementById('imageContainer');
  let touchStartX = 0;
  let touchEndX = 0;

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe(currentImageIndex, images);
  }, { passive: true });

  function handleSwipe(currentIndex, imageList) {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && currentIndex < imageList.length - 1) {
        // Swipe left - next image
        const nextImage = imageList[currentIndex + 1];
        const nextIndex = state.currentItems.findIndex(f => f.path === nextImage.path);
        openFile(nextImage, nextIndex);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous image
        const prevImage = imageList[currentIndex - 1];
        const prevIndex = state.currentItems.findIndex(f => f.path === prevImage.path);
        openFile(prevImage, prevIndex);
      }
    }
  }
}

// Render PDF viewer
function renderPDFViewer(item) {
  const pdfPath = `/content/${item.path}`;
  elements.viewerContent.innerHTML = `
    <div class="pdf-container">
      <iframe src="${pdfPath}" type="application/pdf"></iframe>
    </div>
  `;
}

// Render text viewer
async function renderTextViewer(item) {
  try {
    const response = await fetch(`/content/${item.path}`);
    const text = await response.text();

    elements.viewerContent.innerHTML = `
      <div class="text-container">
        <h2>${escapeHtml(item.title || item.path)}</h2>
        ${item.description ? `<p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">${escapeHtml(item.description)}</p>` : ''}
        <hr style="margin: var(--spacing-lg) 0; border: 1px solid var(--gold-dark); opacity: 0.3;">
        <pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(text)}</pre>
      </div>
    `;
  } catch (error) {
    elements.viewerContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div>Chyba při načítání souboru</div>
      </div>
    `;
  }
}

// Render video viewer
function renderVideoViewer(item) {
  const videoPath = `/content/${item.path}`;
  elements.viewerContent.innerHTML = `
    <div style="max-width: 100%; max-height: 100%;">
      <video controls style="max-width: 100%; max-height: calc(100vh - 200px);">
        <source src="${videoPath}">
        Váš prohlížeč nepodporuje přehrávání videa.
      </video>
    </div>
  `;
}

// Render audio viewer
function renderAudioViewer(item) {
  const audioPath = `/content/${item.path}`;
  elements.viewerContent.innerHTML = `
    <div class="text-container" style="text-align: center;">
      <div class="file-icon" style="font-size: 96px; margin-bottom: 24px;">🎵</div>
      <h2 style="margin-bottom: 24px;">${escapeHtml(item.title || item.path)}</h2>
      ${item.description ? `<p style="color: var(--text-secondary); margin-bottom: var(--spacing-lg);">${escapeHtml(item.description)}</p>` : ''}
      <audio controls style="width: 100%; max-width: 500px;">
        <source src="${audioPath}">
        Váš prohlížeč nepodporuje přehrávání audia.
      </audio>
    </div>
  `;
}

// Increase text size
function increaseTextSize() {
  const currentIndex = state.textSizes.indexOf(state.textSize);
  if (currentIndex < state.textSizes.length - 1) {
    setTextSize(state.textSizes[currentIndex + 1]);
  }
}

// Decrease text size
function decreaseTextSize() {
  const currentIndex = state.textSizes.indexOf(state.textSize);
  if (currentIndex > 0) {
    setTextSize(state.textSizes[currentIndex - 1]);
  }
}

// Set text size
function setTextSize(size) {
  // Ensure size is valid
  if (!state.textSizes.includes(size)) {
    size = 'medium';
  }

  state.textSize = size;
  document.body.setAttribute('data-text-size', size);
  localStorage.setItem('textSize', size);

  // Update button states
  updateTextSizeButtons();
}

// Update text size button states
function updateTextSizeButtons() {
  const currentIndex = state.textSizes.indexOf(state.textSize);

  // Disable decrease button if at minimum
  elements.textSizeDecrease.disabled = currentIndex === 0;
  elements.textSizeDecrease.style.opacity = currentIndex === 0 ? '0.3' : '1';

  // Disable increase button if at maximum
  elements.textSizeIncrease.disabled = currentIndex === state.textSizes.length - 1;
  elements.textSizeIncrease.style.opacity = currentIndex === state.textSizes.length - 1 ? '0.3' : '1';
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (elements.contentViewer.classList.contains('hidden')) return;

  if (e.key === 'Escape') {
    closeViewer();
  } else if (e.key === 'ArrowLeft') {
    document.getElementById('prevImage')?.click();
  } else if (e.key === 'ArrowRight') {
    document.getElementById('nextImage')?.click();
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
