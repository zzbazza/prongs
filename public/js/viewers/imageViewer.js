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

  let currentZoom = 100; // Percentage for max-width/max-height
  const zoomStep = 20; // 20% steps
  const minZoom = 100; // Don't go below fit-to-container
  const maxZoom = 500; // 500% max

  // Detect if image is wider than container
  function checkImageWidth() {
    const imageWidth = img.offsetWidth || img.naturalWidth;
    const containerWidth = container.offsetWidth;
    return {
      imageWidth,
      containerWidth,
      isWider: imageWidth > containerWidth
    };
  }

  // Set initial size to fit container
  function fitToContainer() {
    currentZoom = 100;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.classList.remove('zoomed');
    container.style.justifyContent = 'center';
    container.scrollTo(0, 0);
  }

  // Apply zoom
  function applyZoom(zoom) {
    currentZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    img.style.maxWidth = `${currentZoom}%`;
    img.style.maxHeight = `${currentZoom}%`;

    if (currentZoom > 100) {
      img.classList.add('zoomed');

      // Check if image is wider than container after zoom
      setTimeout(() => {
        const widthInfo = checkImageWidth();
        if (widthInfo.isWider) {
          // Image is wider - align to left for easier scrolling
          container.style.justifyContent = 'flex-start';
        } else {
          // Image is narrower - keep centered
          container.style.justifyContent = 'center';
        }
        console.log('Image width:', widthInfo.imageWidth, 'Container width:', widthInfo.containerWidth);
      }, 0);
    } else {
      img.classList.remove('zoomed');
      container.style.justifyContent = 'center';
    }
  }

  // Zoom in
  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    applyZoom(currentZoom + zoomStep);
  });

  // Zoom out
  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    applyZoom(currentZoom - zoomStep);
  });

  // Reset zoom
  zoomResetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    fitToContainer();
  });

  // Click image to toggle zoom
  img.addEventListener('click', (e) => {
    // Don't zoom if clicking on a button or control
    if (e.target !== img) return;

    if (currentZoom === 100) {
      applyZoom(200);
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
      applyZoom(currentZoom + delta);
    }
  }, { passive: false });

  // Touch pinch zoom support
  let initialDistance = 0;
  let initialZoom = 100;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialDistance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      initialZoom = currentZoom;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const zoomRatio = currentDistance / initialDistance;
      const newZoom = initialZoom * zoomRatio;
      applyZoom(newZoom);
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
  let isSingleTouch = false;

  container.addEventListener('touchstart', (e) => {
    // Only track swipes for single-touch gestures (not pinch zoom)
    if (e.touches.length === 1) {
      isSingleTouch = true;
      touchStartX = e.changedTouches[0].screenX;
    } else {
      isSingleTouch = false;
    }
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    // Only handle swipe if it was a single-touch gesture
    if (isSingleTouch && e.touches.length === 0) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe(currentImageIndex, images);
    }
    isSingleTouch = false;
  }, { passive: true });

  function handleSwipe(currentIndex, imageList) {
    // Don't navigate if image is zoomed - allow panning instead
    const img = document.getElementById('currentImage');
    if (img && img.classList.contains('zoomed')) {
      return;
    }

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
