/**
 * Utility Functions
 */

import { elements } from './state.js';

// Show/hide loading indicator
export function setLoading(isLoading) {
  elements.loadingIndicator.classList.toggle('hidden', !isLoading);
}

// Escape HTML to prevent XSS
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
