/**
 * Image Viewer with OpenSeadragon for Deep Zoom
 */

import { state, elements } from '../state.js';
import { escapeHtml } from '../utils.js';

let currentViewer = null;
let isTagMode = false;
let currentItem = null;

// Drag-to-draw state
let dragStart = null;  // { fx, fy, posX, posY }
let isDragging = false;
let justDragged = false;
let rubberBand = null;

const TAG_DEFAULT_W = 0.08;
const TAG_DEFAULT_H = 0.12;
const DRAG_THRESHOLD_PX = 6; // minimum pixels to count as a drag vs click

// --- Overlay helpers ---

function clearOverlays() {
  if (currentViewer) currentViewer.clearOverlays();
}

function addPeopleOverlays(people, editMode = false) {
  clearOverlays();
  if (!currentViewer || !people || people.length === 0) return;

  const tiledImage = currentViewer.world.getItemAt(0);
  if (!tiledImage) return;

  const imgSize = tiledImage.getContentSize();

  people.forEach((person, idx) => {
    const el = document.createElement('div');
    el.className = 'person-tag-overlay';
    el.dataset.index = idx;
    if (editMode) el.classList.add('edit-mode');

    const label = document.createElement('span');
    label.className = 'person-tag-label';
    label.textContent = person.name;
    el.appendChild(label);

    const viewportRect = tiledImage.imageToViewportRectangle(
      person.x * imgSize.x,
      person.y * imgSize.y,
      person.w * imgSize.x,
      person.h * imgSize.y
    );

    currentViewer.addOverlay({ element: el, location: viewportRect });
  });
}

function highlightOverlay(idx, on) {
  const el = document.querySelector(`.person-tag-overlay[data-index="${idx}"]`);
  if (el) el.classList.toggle('highlighted', on);
}

// --- Sidebar people list ---

function updatePeopleList() {
  const list = document.querySelector('.metadata-people');
  if (!list || !currentItem) return;

  const people = currentItem.people || [];
  if (people.length === 0) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = `
    <strong>Osoby na fotografii:</strong>
    <ul class="people-list">
      ${people.map((p, i) => `
        <li class="person-list-item" data-index="${i}">
          <i class="fa-solid fa-magnifying-glass person-locate-icon"></i>
          <span class="person-name">${escapeHtml(p.name)}</span>
          ${isTagMode ? `<button class="person-delete-btn" data-index="${i}" title="Smazat">✕</button>` : ''}
        </li>
      `).join('')}
    </ul>
  `;

  list.querySelectorAll('.person-list-item').forEach(item => {
    const idx = parseInt(item.dataset.index);
    item.addEventListener('mouseenter', () => highlightOverlay(idx, true));
    item.addEventListener('mouseleave', () => highlightOverlay(idx, false));
  });

  list.querySelectorAll('.person-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTag(parseInt(btn.dataset.index));
    });
  });
}

function updateJsonOutput() {
  const output = document.getElementById('people-json-output');
  if (!output || !currentItem) return;
  output.querySelector('pre').textContent = JSON.stringify(currentItem.people || [], null, 2);
}

// --- Tag data operations ---

function deleteTag(idx) {
  if (!currentItem) return;
  const people = [...(currentItem.people || [])];
  people.splice(idx, 1);
  currentItem.people = people;
  updatePeopleList();
  updateJsonOutput();
  addPeopleOverlays(people, true);
}

// --- Tag input form ---

function showTagForm(rect, screenX, screenY) {
  hideTagForm();

  const container = document.getElementById('imageContainer');
  if (!container) return;

  const form = document.createElement('div');
  form.id = 'tag-input-form';
  form.className = 'tag-input-form';

  const containerRect = container.getBoundingClientRect();
  let left = screenX - containerRect.left + 12;
  let top = screenY - containerRect.top + 12;
  left = Math.min(left, containerRect.width - 220);
  top = Math.min(top, containerRect.height - 90);

  form.style.left = `${left}px`;
  form.style.top = `${top}px`;

  form.innerHTML = `
    <input type="text" id="tag-name-input" placeholder="Jméno osoby" />
    <div class="tag-form-buttons">
      <button id="tag-save-btn">Uložit</button>
      <button id="tag-cancel-btn">Zrušit</button>
    </div>
  `;

  container.appendChild(form);
  document.getElementById('tag-name-input').focus();

  document.getElementById('tag-save-btn').addEventListener('click', () => confirmTag(rect));
  document.getElementById('tag-cancel-btn').addEventListener('click', hideTagForm);
  document.getElementById('tag-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmTag(rect);
    if (e.key === 'Escape') hideTagForm();
  });
}

function hideTagForm() {
  document.getElementById('tag-input-form')?.remove();
}

function confirmTag(rect) {
  const name = document.getElementById('tag-name-input')?.value.trim();
  if (!name || !currentItem) {
    hideTagForm();
    return;
  }

  const people = [...(currentItem.people || [])];
  people.push({ name, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
  currentItem.people = people;

  hideTagForm();
  updatePeopleList();
  updateJsonOutput();
  addPeopleOverlays(people, true);
}

// --- OSD tag mode event handlers ---

function getImageFraction(position) {
  const tiledImage = currentViewer.world.getItemAt(0);
  if (!tiledImage) return null;
  const imgSize = tiledImage.getContentSize();
  const vp = currentViewer.viewport.pointFromPixel(position);
  const img = tiledImage.viewportToImageCoordinates(vp.x, vp.y);
  return {
    fx: Math.max(0, Math.min(1, img.x / imgSize.x)),
    fy: Math.max(0, Math.min(1, img.y / imgSize.y))
  };
}

function removeRubberBand() {
  rubberBand?.remove();
  rubberBand = null;
}

function onCanvasPress(event) {
  if (!isTagMode) return;

  const frac = getImageFraction(event.position);
  if (!frac) return;

  dragStart = { fx: frac.fx, fy: frac.fy, posX: event.position.x, posY: event.position.y };
  isDragging = false;

  rubberBand = document.createElement('div');
  rubberBand.className = 'tag-rubber-band';
  rubberBand.style.left = `${event.position.x}px`;
  rubberBand.style.top = `${event.position.y}px`;
  rubberBand.style.width = '0';
  rubberBand.style.height = '0';
  document.getElementById('imageContainer').appendChild(rubberBand);
}

function onCanvasDrag(event) {
  if (!isTagMode || !dragStart) return;
  event.preventDefaultAction = true; // prevent OSD panning

  const dx = event.position.x - dragStart.posX;
  const dy = event.position.y - dragStart.posY;

  if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
    isDragging = true;
  }

  if (isDragging && rubberBand) {
    rubberBand.style.left   = `${Math.min(event.position.x, dragStart.posX)}px`;
    rubberBand.style.top    = `${Math.min(event.position.y, dragStart.posY)}px`;
    rubberBand.style.width  = `${Math.abs(dx)}px`;
    rubberBand.style.height = `${Math.abs(dy)}px`;
  }
}

function onCanvasRelease(event) {
  if (!isTagMode || !dragStart) return;

  removeRubberBand();

  if (!isDragging) {
    // canvas-click will handle this
    dragStart = null;
    isDragging = false;
    return;
  }

  const frac = getImageFraction(event.position);
  if (!frac) { dragStart = null; isDragging = false; return; }

  const rect = {
    x: Math.min(dragStart.fx, frac.fx),
    y: Math.min(dragStart.fy, frac.fy),
    w: Math.abs(frac.fx - dragStart.fx),
    h: Math.abs(frac.fy - dragStart.fy)
  };

  const canvasRect = currentViewer.canvas.getBoundingClientRect();
  const screenX = canvasRect.left + event.position.x;
  const screenY = canvasRect.top + event.position.y;

  dragStart = null;
  isDragging = false;
  justDragged = true;

  showTagForm(rect, screenX, screenY);
}

function onCanvasClick(event) {
  if (!isTagMode) return;
  if (justDragged) { justDragged = false; return; }
  event.preventDefaultAction = true;

  const frac = getImageFraction(event.position);
  if (!frac) return;

  const rect = {
    x: Math.max(0, frac.fx - TAG_DEFAULT_W / 2),
    y: Math.max(0, frac.fy - TAG_DEFAULT_H / 2),
    w: TAG_DEFAULT_W,
    h: TAG_DEFAULT_H
  };

  const canvasRect = currentViewer.canvas.getBoundingClientRect();
  showTagForm(rect, canvasRect.left + event.position.x, canvasRect.top + event.position.y);
}

// --- Tag mode toggle ---

function enableTagMode(btn) {
  isTagMode = true;
  btn.classList.add('active');
  btn.textContent = 'Ukončit označování';

  document.getElementById('tag-mode-hint')?.style.setProperty('display', 'block');
  document.getElementById('people-json-output')?.style.setProperty('display', 'block');

  addPeopleOverlays(currentItem?.people || [], true);
  updatePeopleList();

  currentViewer.addHandler('canvas-press', onCanvasPress);
  currentViewer.addHandler('canvas-drag', onCanvasDrag);
  currentViewer.addHandler('canvas-release', onCanvasRelease);
  currentViewer.addHandler('canvas-click', onCanvasClick);
}

function disableTagMode(btn) {
  isTagMode = false;
  btn.classList.remove('active');
  btn.textContent = 'Označit osoby';
  hideTagForm();
  removeRubberBand();
  dragStart = null;
  isDragging = false;
  justDragged = false;

  document.getElementById('tag-mode-hint')?.style.setProperty('display', 'none');

  addPeopleOverlays(currentItem?.people || [], false);
  updatePeopleList();

  currentViewer.removeHandler('canvas-press', onCanvasPress);
  currentViewer.removeHandler('canvas-drag', onCanvasDrag);
  currentViewer.removeHandler('canvas-release', onCanvasRelease);
  currentViewer.removeHandler('canvas-click', onCanvasClick);
}

// --- Navigation ---

function setupNavigation(currentImageIndex, images, openFileFn) {
  const prevBtn = document.getElementById('prevImage');
  const nextBtn = document.getElementById('nextImage');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const prevImage = images[currentImageIndex - 1];
      const prevIndex = state.currentItems.findIndex(f => f.path === prevImage.path);
      openFileFn(prevImage, prevIndex);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const nextImage = images[currentImageIndex + 1];
      const nextIndex = state.currentItems.findIndex(f => f.path === nextImage.path);
      openFileFn(nextImage, nextIndex);
    });
  }
}

// --- Main render ---

export function renderImageViewer(item, openFileFn) {
  if (currentViewer) {
    currentViewer.destroy();
    currentViewer = null;
  }

  isTagMode = false;
  dragStart = null;
  isDragging = false;
  rubberBand = null;
  currentItem = item;
  if (!item.people) item.people = [];

  const imagePath = `/content/${item.path}`;
  const images = (state.currentItems || []).filter(f => f.type === 'image');
  const currentImageIndex = images.findIndex(img => img.path === item.path);
  const hasPrev = currentImageIndex > 0;
  const hasNext = currentImageIndex < images.length - 1;

  const editControls = state.editMode ? `
    <div class="tag-mode-controls">
      <button id="tagModeBtn" class="tag-mode-btn">Označit osoby</button>
      <p id="tag-mode-hint" class="tag-mode-hint" style="display:none;">Táhněte pro obdélník, nebo klikněte pro výchozí velikost</p>
    </div>
    <div id="people-json-output" class="people-json-output" style="display:none;">
      <strong>Zkopírujte do items.json:</strong>
      <div class="json-output-wrapper">
        <pre>${escapeHtml(JSON.stringify(item.people, null, 2))}</pre>
        <button class="json-copy-btn" title="Kopírovat">⎘</button>
      </div>
    </div>
  ` : '';

  elements.viewerContent.innerHTML = `
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
            <strong>Klíčová slova:</strong>
            ${item.keywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join(' ')}
          </div>
        ` : ''}
        <div class="metadata-people"></div>
        ${editControls}
        <p class="metadata-filepath">${escapeHtml(item.path)}</p>
      </div>
    </div>
  `;

  updatePeopleList();

  if (state.editMode) {
    document.getElementById('tagModeBtn').addEventListener('click', function () {
      if (isTagMode) disableTagMode(this);
      else enableTagMode(this);
    });

    document.querySelector('.json-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(currentItem.people || [], null, 2)).catch(() => {});
    });
  }

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

  currentViewer = OpenSeadragon({
    id: 'openseadragon-viewer',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
    tileSources: { type: 'image', url: imagePath },
    showNavigationControl: true,
    showRotationControl: false,
    showHomeControl: false,
    showZoomControl: true,
    showFullPageControl: false,
    defaultZoomLevel: 0,
    minZoomLevel: 0.5,
    maxZoomLevel: 10,
    visibilityRatio: 0.8,
    constrainDuringPan: false,
    animationTime: 0.3,
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
    immediateRender: true,
    smoothTileEdgesMinZoom: 1.5,
    blendTime: 0.1
  });

  currentViewer.addHandler('open', () => {
    if (item.people && item.people.length > 0) {
      addPeopleOverlays(item.people, false);
    }
  });

  setupNavigation(currentImageIndex, images, openFileFn);
}
