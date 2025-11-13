/**
 * Image Viewer with Zoom and Navigation
 */

import { state, elements } from '../state.js';
import { escapeHtml } from '../utils.js';

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
      img.style.transformOrigin = 'top left';
    } else {
      img.classList.remove('zoomed');
      img.style.transformOrigin = 'center center';
    }
  }

  // Zoom in
  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Zooming in', currentScale, zoomStep);
    applyZoom(currentScale + zoomStep);
  });

  // Zoom out
  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Zooming out', currentScale, zoomStep);
    applyZoom(currentScale - zoomStep);
  });

  // Reset zoom
  zoomResetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Zooming reset', currentScale, zoomStep);
    fitToContainer();
  });

  // Click image to toggle zoom
  img.addEventListener('click', (e) => {
    // Don't zoom if clicking on a button or control
    if (e.target !== img) return;

    console.log('Zooming click', currentScale, zoomStep);
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
      console.log('Zooming wheel', currentScale, delta);
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

// Setup swipe gestures for image navigation
function setupSwipeGestures(currentImageIndex, images, openFile) {
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

// Render image viewer with navigation
export function renderImageViewer(item, openFile) {
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
  setupSwipeGestures(currentImageIndex, images, openFile);
}
