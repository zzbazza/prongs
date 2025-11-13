/**
 * Document Viewers (PDF, Text, Video, Audio)
 */

import { elements } from '../state.js';
import { escapeHtml } from '../utils.js';

// Render PDF viewer
export function renderPDFViewer(item) {
  const pdfPath = `/content/${item.path}#toolbar=0`;
  elements.viewerContent.innerHTML = `
    <div class="pdf-container">
      <iframe src="${pdfPath}" type="application/pdf"></iframe>
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
