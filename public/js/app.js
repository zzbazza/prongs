/**
 * Main Application Entry Point
 * Stará Běla Historical Exposition
 */

import { state, elements } from './state.js';
import { loadAllData } from './api.js';
import { goHome, navigateUpCategory, performSearch, showHome } from './navigation.js';
import { openFile, closeViewer } from './fileViewer.js';
import { setTextSize, increaseTextSize, decreaseTextSize } from './ui/textSize.js';

// Initialize application
async function init() {
  // Load saved text size preference
  const savedTextSize = localStorage.getItem('textSize') || 'medium';
  setTextSize(savedTextSize);

  // Event listeners
  elements.closeViewer.addEventListener('click', closeViewer);
  elements.backBtn.addEventListener('click', () => {
    // If viewing a file, close viewer; otherwise navigate up one category
    if (state.currentView === 'viewer') {
      closeViewer();
    } else {
      navigateUpCategory();
    }
  });
  elements.textSizeDecrease.addEventListener('click', decreaseTextSize);
  elements.textSizeIncrease.addEventListener('click', increaseTextSize);
  elements.homeBtn.addEventListener('click', goHome);
  elements.breadcrumbHome.addEventListener('click', goHome);

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
