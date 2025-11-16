/**
 * Document Viewers (PDF, Text, Video, Audio, Panel)
 */

import { elements } from '../state.js';
import { escapeHtml } from '../utils.js';

let currentPanelViewer = null;

// Simple PDF viewer using iframe with Chrome's built-in PDF viewer
export function renderPDFViewer(item) {
  const pdfPath = `/content/${item.path}`;

  elements.viewerContent.innerHTML = `
    <div class="pdf-container">
      <iframe
        src="${pdfPath}#toolbar=0"
        style="width: 100%; height: 100%; border: none; background: #525252;"
        title="${escapeHtml(item.title || item.path)}">
      </iframe>
    </div>
  `;
}

// Render text viewer
export async function renderTextViewer(item) {
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
export function renderVideoViewer(item) {
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
export function renderAudioViewer(item) {
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

// Render panel viewer using OpenSeadragon with DZI tiles
export function renderPanelViewer(item) {
  // Cleanup previous viewer if exists
  if (currentPanelViewer) {
    currentPanelViewer.destroy();
    currentPanelViewer = null;
  }

  // The path should point to a .dzi file
  const dziPath = `/content/${item.path}`;

  elements.viewerContent.innerHTML = `
    <div class="panel-viewer-container" style="width: 100%; height: 100%;">
      <div id="panel-viewer" style="width: 100%; height: 100%; background: #525252;"></div>
    </div>
  `;

  // Check if OpenSeadragon is loaded
  if (typeof OpenSeadragon === 'undefined') {
    console.error('OpenSeadragon not loaded');
    document.getElementById('panel-viewer').innerHTML = `
      <div style="color: white; padding: var(--spacing-xl); text-align: center;">
        <div>OpenSeadragon knihovna nebyla načtena</div>
        <div style="font-size: 0.9em; margin-top: var(--spacing-md);">Zkuste obnovit stránku</div>
      </div>
    `;
    return;
  }

  // Initialize OpenSeadragon viewer with DZI tiles
  currentPanelViewer = OpenSeadragon({
    id: 'panel-viewer',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
    tileSources: dziPath,
    // Appearance
    showNavigationControl: false,
    showRotationControl: false,
    showHomeControl: false,
    showZoomControl: false,
    showFullPageControl: false,
    // Behavior
    defaultZoomLevel: 0,
    minZoomLevel: 0.5,
    maxZoomLevel: 10,
    visibilityRatio: 1.0,
    constrainDuringPan: true,
    animationTime: 0.5,
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

  console.log('Panel viewer initialized for:', dziPath);
}
