/**
 * Navigation and Breadcrumb Functions
 */

import { state, elements, FILE_ICONS } from './state.js';
import { getCategoryTitles } from './api.js';
import { escapeHtml, getThumbnailPath } from './utils.js';
import { openFile } from './fileViewer.js';

function buildCategoryBreadcrumb(categoryTitles, isActive = false) {
  // Build clickable breadcrumb segments
  const segments = categoryTitles.map((cat, index) => {
    const isLast = index === categoryTitles.length - 1;
    const className = isLast && isActive ? 'breadcrumb-segment active' : 'breadcrumb-segment';
    return `<span class="${className}" data-level="${index}">${escapeHtml(cat.title)}</span>`;
  });

  return segments.join(' <span class="breadcrumb-separator-inline">›</span> ');
}

export function updateBreadcrumbs() {
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

    // Show category path or search context
    if (state.currentCategoryPath.length > 0) {
      const categoryTitles = getCategoryTitles(state.currentCategoryPath);
      elements.breadcrumbCategory.innerHTML = buildCategoryBreadcrumb(categoryTitles, false);
      attachBreadcrumbHandlers();
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

    // Show full category path
    const categoryTitles = getCategoryTitles(state.currentCategoryPath);
    elements.breadcrumbCategory.innerHTML = buildCategoryBreadcrumb(categoryTitles, true);
    attachBreadcrumbHandlers();
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

function attachBreadcrumbHandlers() {
  // Attach click handlers to each breadcrumb segment
  const segments = elements.breadcrumbCategory.querySelectorAll('.breadcrumb-segment');
  segments.forEach(segment => {
    segment.addEventListener('click', (e) => {
      e.stopPropagation();
      const level = parseInt(segment.dataset.level);
      navigateToBreadcrumbLevel(level);
    });
  });
}

function navigateToBreadcrumbLevel(level) {
  // Navigate to a specific breadcrumb level
  // level 0 = first category, level 1 = second category, etc.

  if (level < 0 || level >= state.currentCategoryPath.length) {
    return;
  }

  // Close viewer if open
  if (state.currentView === 'viewer') {
    elements.contentViewer.classList.add('hidden');
    elements.browserView.classList.remove('hidden');
  }

  // Navigate to that level
  state.currentCategoryPath = state.currentCategoryPath.slice(0, level + 1);
  state.categoryPathString = state.currentCategoryPath.join('/');
  state.currentView = 'category';

  // Find the category at this level
  let categories = state.allCategories;
  let targetCategory = null;

  for (let i = 0; i < state.currentCategoryPath.length; i++) {
    const catId = state.currentCategoryPath[i];
    const found = categories.find(c => c.id === catId);
    if (found) {
      if (i === state.currentCategoryPath.length - 1) {
        // We're at the target level
        targetCategory = found;
      } else {
        categories = found.subcategories || [];
      }
    }
  }

  // Determine what to show: subcategories or items
  if (targetCategory && targetCategory.subcategories && targetCategory.subcategories.length > 0) {
    // This category has subcategories - show them
    state.currentCategories = targetCategory.subcategories;

    // Check if there are also items at this level
    const hasItems = state.allItems.some(item => {
      if (state.isLegacy) {
        const lastCat = state.currentCategoryPath[level];
        return item.categories && item.categories.includes(lastCat);
      } else {
        return item.categoryId === state.categoryPathString;
      }
    });

    // Show subcategories and items if they exist
    showHome(hasItems);
  } else {
    // No subcategories - just show items in this category
    state.currentCategories = [];
    showCategoryItems();
  }

  updateBreadcrumbs();
}

export function goHome() {
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

export function navigateUpCategory() {
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

    // Check if current category has items to display
    const hasItems = state.allItems.some(item => {
      if (state.isLegacy) {
        const lastCat = state.currentCategoryPath[state.currentCategoryPath.length - 1];
        return item.categories && item.categories.includes(lastCat);
      } else {
        return item.categoryId === state.categoryPathString;
      }
    });

    showHome(hasItems);
  }
}

export function showHome(includeItems = false) {
  const categories = state.currentCategories;

  if (categories.length === 0 && !includeItems) {
    elements.fileList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <div>Žádné kategorie nenalezeny</div>
      </div>
    `;
    updateBreadcrumbs();
    return;
  }

  // Build HTML for categories/subcategories
  let html = categories.map(category => `
    <div class="file-item category-folder"
         data-category-id="${category.id}"
         data-has-subcategories="${(category.subcategories && category.subcategories.length > 0) ? 'true' : 'false'}">
      <div class="file-icon">${category.icon || '📁'}</div>
      <div class="file-name">${escapeHtml(category.title)}</div>
      ${category.itemCount ? `<div class="file-description">${category.itemCount} položek</div>` : ''}
    </div>
  `).join('');

  // If includeItems is true, also show items in current category
  if (includeItems) {
    const filteredItems = state.allItems.filter(item => {
      if (state.isLegacy) {
        const lastCat = state.currentCategoryPath[state.currentCategoryPath.length - 1];
        return item.categories && item.categories.includes(lastCat);
      } else {
        return item.categoryId === state.categoryPathString;
      }
    });

    if (filteredItems.length > 0) {
      // Store items for file opening
      state.currentItems = filteredItems;

      const itemsHtml = filteredItems.map((item, index) => {
        const iconHtml = item.type === 'image'
          ? `<img src="/content/${getThumbnailPath(item.path)}" alt="${escapeHtml(item.title || item.path)}" class="file-thumbnail" loading="lazy">`
          : `<div class="file-icon">${FILE_ICONS[item.type] || FILE_ICONS.unknown}</div>`;

        return `
          <div class="file-item file-item-actual"
               data-index="${index}"
               data-type="${item.type}">
            ${iconHtml}
            <div class="file-name">${escapeHtml(item.title || item.path)}</div>
            ${item.description ? `<div class="file-description">${escapeHtml(item.description)}</div>` : ''}
          </div>
        `;
      }).join('');

      html += itemsHtml;
    }
  }

  elements.fileList.innerHTML = html || `
    <div class="empty-state">
      <div class="empty-state-icon">📁</div>
      <div>Žádné položky nenalezeny</div>
    </div>
  `;

  // Add click handlers for categories
  elements.fileList.querySelectorAll('.category-folder').forEach(item => {
    item.addEventListener('click', () => {
      const categoryId = item.dataset.categoryId;
      enterCategory(categoryId);
    });
  });

  // Add click handlers for file items
  elements.fileList.querySelectorAll('.file-item-actual').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      openFile(state.currentItems[index], index);
    });
  });

  updateBreadcrumbs();
}

export function enterCategory(categoryId) {
  // Find the category in current level
  const category = state.currentCategories.find(c => c.id === categoryId);
  if (!category) {
    console.error('Category not found:', categoryId);
    return;
  }

  // Update category path
  state.currentCategoryPath.push(categoryId);
  state.categoryPathString = state.currentCategoryPath.join('/');

  // Check if category has items in current path
  const hasItems = state.allItems.some(item => {
    if (state.isLegacy) {
      return item.categories && item.categories.includes(categoryId);
    } else {
      return item.categoryId === state.categoryPathString;
    }
  });

  // Check if category has subcategories
  if (category.subcategories && category.subcategories.length > 0) {
    // Show subcategories and items (if any)
    state.currentView = 'category';
    state.currentCategories = category.subcategories;
    showHome(hasItems); // Pass true if there are items to display after subcategories
  } else {
    // No subcategories - show items in this category
    showCategoryItems();
  }
}

export function showCategoryItems() {
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

export function performSearch() {
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

export function renderItemList(items) {
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
      ? `<img src="/content/${getThumbnailPath(item.path)}" alt="${escapeHtml(item.title || item.path)}" class="file-thumbnail" loading="lazy">`
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

