// Hardcoded categories
const CATEGORIES = [
  { id: 'chronicles', title: 'Kroniky', icon: '📖' },
  { id: 'photos', title: 'Fotografie a pohledy', icon: '📷' },
  { id: 'exhibition-panels', title: 'Panely výstav', icon: '🖼️' },
  { id: 'project-docs', title: 'Projektová dokumentace', icon: '📋' },
  { id: 'old-maps', title: 'Staré mapy', icon: '🗺️' },
  { id: 'newsletter', title: 'Staroběleský zpravodaj', icon: '📰' }
];

// Application state
const state = {
  allItems: [],
  currentView: 'home', // 'home', 'category', 'search', 'viewer'
  currentCategory: null,
  searchQuery: '',
  currentIndex: -1,
  currentFile: null,
  textSize: 'medium',
  textSizes: ['small', 'medium', 'large']
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

  // Breadcrumb category click - go back to category/search view
  elements.breadcrumbCategory.addEventListener('click', () => {
    if (state.currentView === 'viewer') {
      closeViewer();
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

  // Load all items and show home
  await loadAllItems();
  showHome();
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
    if (state.currentCategory) {
      const category = CATEGORIES.find(c => c.id === state.currentCategory);
      elements.breadcrumbCategory.textContent = category ? category.title : state.currentCategory;
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
  } else if (state.currentView === 'category' && state.currentCategory) {
    // Category view
    elements.breadcrumbHome.classList.remove('active');
    elements.breadcrumbSeparator.style.display = 'inline';
    elements.breadcrumbCategory.style.display = 'inline';
    elements.breadcrumbSeparator2.style.display = 'none';
    elements.breadcrumbFile.style.display = 'none';
    elements.closeViewer.style.display = 'none';

    const category = CATEGORIES.find(c => c.id === state.currentCategory);
    elements.breadcrumbCategory.textContent = category ? category.title : state.currentCategory;
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
  state.currentView = 'home';
  state.currentCategory = null;
  state.searchQuery = '';
  elements.searchInput.value = '';
  elements.clearSearch.classList.add('hidden');
  showHome();
  updateBreadcrumbs();
}

// Show/hide loading indicator
function setLoading(isLoading) {
  elements.loadingIndicator.classList.toggle('hidden', !isLoading);
}

// Load all items from API
async function loadAllItems() {
  setLoading(true);
  try {
    const response = await fetch('/api/items');
    const data = await response.json();
    state.allItems = data.items;
  } catch (error) {
    console.error('Error loading items:', error);
    alert('Chyba při načítání obsahu');
  } finally {
    setLoading(false);
  }
}

// Show home page with category folders
function showHome() {
  const html = CATEGORIES.map(category => `
    <div class="file-item category-folder" data-category-id="${category.id}">
      <div class="file-icon">${category.icon}</div>
      <div class="file-name">${escapeHtml(category.title)}</div>
    </div>
  `).join('');

  elements.fileList.innerHTML = html;

  // Add click handlers
  elements.fileList.querySelectorAll('.category-folder').forEach(item => {
    item.addEventListener('click', () => {
      const categoryId = item.dataset.categoryId;
      showCategory(categoryId);
    });
  });

  updateBreadcrumbs();
}

// Show category with its files
function showCategory(categoryId) {
  state.currentView = 'category';
  state.currentCategory = categoryId;

  // Filter items by category
  const filteredItems = state.allItems.filter(item =>
    item.categories && item.categories.includes(categoryId)
  );

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

  const html = items.map((item, index) => `
    <div class="file-item" data-index="${index}" data-type="${item.type}">
      <div class="file-icon">${FILE_ICONS[item.type] || FILE_ICONS.unknown}</div>
      <div class="file-name">${escapeHtml(item.title || item.path)}</div>
      ${item.description ? `<div class="file-description">${escapeHtml(item.description)}</div>` : ''}
    </div>
  `).join('');

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
  if (state.currentCategory) {
    state.currentView = 'category';
  } else if (state.searchQuery) {
    state.currentView = 'search';
  } else {
    state.currentView = 'home';
  }

  updateBreadcrumbs();
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
    <div class="image-container" id="imageContainer">
      ${hasPrev ? `<button class="image-nav prev" id="prevImage">‹</button>` : ''}
      <img src="${imagePath}" alt="${escapeHtml(item.title || item.path)}" id="currentImage">
      ${hasNext ? `<button class="image-nav next" id="nextImage">›</button>` : ''}
    </div>
    <div class="file-metadata">
      <h2>${escapeHtml(item.title || item.path)}</h2>
      ${item.description ? `<p class="metadata-description">${escapeHtml(item.description)}</p>` : ''}
      ${item.keywords && item.keywords.length ? `
        <div class="metadata-keywords">
          <strong>Klíčová slova:</strong> ${item.keywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join(' ')}
        </div>
      ` : ''}
      ${item.categories && item.categories.length ? `
        <div class="metadata-categories">
          <strong>Kategorie:</strong> ${item.categories.map(c => {
            const cat = CATEGORIES.find(cat => cat.id === c);
            return cat ? escapeHtml(cat.title) : escapeHtml(c);
          }).join(', ')}
        </div>
      ` : ''}
    </div>
  `;

  elements.viewerContent.innerHTML = html;

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
