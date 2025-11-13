/**
 * Document Viewers (PDF, Text, Video, Audio)
 */

import { elements } from '../state.js';
import { escapeHtml } from '../utils.js';

// Render PDF viewer using PDF.js - renders all pages without controls
export async function renderPDFViewer(item) {
  const pdfPath = `/content/${item.path}`;

  elements.viewerContent.innerHTML = `
    <div class="pdf-container">
      <div class="pdf-canvas-container" style="overflow: auto; width: 100%; height: 100%; background: #525252; padding: var(--spacing-lg);">
        <div id="pdfPages" style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing-md);"></div>
      </div>
    </div>
  `;

  // Check if PDF.js is loaded
  if (typeof pdfjsLib === 'undefined') {
    elements.viewerContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div>PDF.js knihovna nebyla načtena</div>
      </div>
    `;
    return;
  }

  // Set worker path
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const scale = 1.5;
  const pagesContainer = document.getElementById('pdfPages');

  // Load PDF and render all pages
  try {
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    const pdfDoc = await loadingTask.promise;

    // Render each page
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scale });

      // Create canvas for this page
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.display = 'block';
      canvas.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';

      pagesContainer.appendChild(canvas);

      // Render page
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    }
  } catch (error) {
    console.error('Error loading PDF:', error);
    elements.viewerContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div>Chyba při načítání PDF</div>
      </div>
    `;
  }
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
