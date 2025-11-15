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

// Get thumbnail path for an image
// If thumbnail exists, return thumbnail path, otherwise return original path
export function getThumbnailPath(imagePath) {
  if (!imagePath) return imagePath;

  // Split path into directory and filename
  const lastSlashIndex = imagePath.lastIndexOf('/');
  if (lastSlashIndex === -1) return imagePath;

  const directory = imagePath.substring(0, lastSlashIndex);
  const filename = imagePath.substring(lastSlashIndex + 1);

  // Construct thumbnail path: directory/thumbnails/filename
  const thumbnailPath = `${directory}/thumbnails/${filename}`;

  return thumbnailPath;
}
