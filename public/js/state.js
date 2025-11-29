/**
 * Application State and Constants
 */

// Application state
export const state = {
  allItems: [],
  allCategories: [],
  currentCategories: [], // Categories at current level
  currentView: 'home', // 'home', 'category', 'search', 'viewer'
  currentCategoryPath: [], // Array of category IDs forming the path
  categoryPathString: '', // Joined path like "photos/buildings/churches"
  searchQuery: '',
  currentIndex: -1,
  currentFile: null,
  currentItems: [], // Items in current view
  textSize: 'medium',
  textSizes: ['small', 'medium', 'large'],
  isLegacy: false // Whether using legacy flat category structure
};

// DOM elements
export const elements = {
  fileList: document.getElementById('fileList'),
  browserView: document.getElementById('browserView'),
  contentViewer: document.getElementById('contentViewer'),
  viewerContent: document.getElementById('viewerContent'),
  closeViewer: document.getElementById('closeViewer'),
  backBtn: document.getElementById('backBtn'),
  textSizeDecrease: document.getElementById('textSizeDecrease'),
  textSizeIncrease: document.getElementById('textSizeIncrease'),
  homeBtn: document.getElementById('homeBtn'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  breadcrumbHome: document.getElementById('breadcrumbHome'),
  breadcrumbContent: document.getElementById('breadcrumbContent')
};

// File type icons
export const FILE_ICONS = {
  folder: '📁',
  image: '🖼️',
  document: '📄',
  text: '📝',
  video: '🎬',
  audio: '🎵',
  panel: '🖼️',
  unknown: '📎'
};
