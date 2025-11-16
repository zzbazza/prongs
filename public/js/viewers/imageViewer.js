/**
 * Image Viewer with OpenSeadragon for Deep Zoom
 */

import { state, elements } from '../state.js';
import { escapeHtml } from '../utils.js';

let currentViewer = null;

// Setup navigation handlers
function setupNavigation(currentImageIndex, images, openFile) {
  const prevBtn = document.getElementById('prevImage');
  const nextBtn = document.getElementById('nextImage');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const prevImage = images[currentImageIndex - 1];
      const prevIndex = state.currentItems.findIndex(f => f.path === prevImage.path);
      openFile(prevImage, prevIndex);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const nextImage = images[currentImageIndex + 1];
      const nextIndex = state.currentItems.findIndex(f => f.path === nextImage.path);
      openFile(nextImage, nextIndex);
    });
  }
}

// Render image viewer with navigation using OpenSeadragon
export function renderImageViewer(item, openFile) {
  // Cleanup previous viewer if exists
  if (currentViewer) {
    currentViewer.destroy();
    currentViewer = null;
  }

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
        <div id="openseadragon-viewer" style="width: 100%; height: 100%; background: #525252;"></div>
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
      </div>
    </div>
  `;

  elements.viewerContent.innerHTML = html;

  // Check if OpenSeadragon is loaded
  if (typeof OpenSeadragon === 'undefined') {
    console.error('OpenSeadragon not loaded');
    document.getElementById('openseadragon-viewer').innerHTML = `
      <div style="color: white; padding: var(--spacing-xl); text-align: center;">
        <div>OpenSeadragon knihovna nebyla načtena</div>
        <div style="font-size: 0.9em; margin-top: var(--spacing-md);">Zkuste obnovit stránku</div>
      </div>
    `;
    return;
  }

  // Initialize OpenSeadragon viewer
  currentViewer = OpenSeadragon({
    id: 'openseadragon-viewer',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
    tileSources: {
      type: 'image',
      url: imagePath
    },
    // Appearance
    showNavigationControl: true,
    showRotationControl: false,
    showHomeControl: false,
    showZoomControl: true,
    showFullPageControl: false,
    // Behavior
    defaultZoomLevel: 0,
    minZoomLevel: 0.5,
    maxZoomLevel: 10,
    visibilityRatio: 0.8,
    constrainDuringPan: false,
    animationTime: 0.3,
    // Touch gestures
    gestureSettingsMouse: {
      clickToZoom: false,
      dblClickToZoom: true,
      pinchToZoom: true,
      flickEnabled: true,
      flickMinSpeed: 0.5
    },
    gestureSettingsTouch: {
      clickToZoom: false,
      dblClickToZoom: true,
      pinchToZoom: true,
      flickEnabled: true,
      flickMinSpeed: 0.5
    },
    // Performance
    immediateRender: true,
    smoothTileEdgesMinZoom: 1.5,
    blendTime: 0.1
  });

  // Setup navigation
  setupNavigation(currentImageIndex, images, openFile);
}
