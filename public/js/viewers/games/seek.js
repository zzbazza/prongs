/**
 * Adventure / Seek game — "find the hidden objects"
 *
 * A game can contain multiple "rooms" (each a separate scene with its own
 * background image and items). On every start/restart, one room is picked
 * at random. Each room is defined in its own JSON file referenced from the
 * main game.json.
 *
 * Game config (content/games/<name>/game.json):
 *   {
 *     "title": "...",
 *     "kind": "seek",
 *     "rooms": [
 *       "rooms/kitchen.json",
 *       "rooms/bedroom.json"
 *     ]
 *   }
 *
 * Room config (content/games/<name>/rooms/<file>.json):
 *   {
 *     "title": "Kitchen",
 *     "image": "files/games/kitchen.png",
 *     "items": [
 *       { "src": "files/items/key.png",
 *         "x": 0.30, "y": 0.45,
 *         "width": 0.05, "height": 0.05,
 *         "name": "Klíč" }
 *     ]
 *   }
 *
 * Back-compat: if a game has no `rooms[]` it falls back to inline
 * `image` + `items` (the original single-room format).
 *
 * Edit mode authors the **currently displayed** room; the JSON panel shows
 * the room JSON (not the game JSON) for copy/paste back to the room file.
 *
 * All item coordinates are normalized [0,1] relative to the rendered
 * background image (not the container), so they survive resize.
 */

import { state, elements } from '../../state.js';
import { escapeHtml } from '../../utils.js';

let game = null;
let gameFolder = '';
let currentRoom = null;
let currentRoomPath = null;
let found = new Set();
let imageDims = { w: 1, h: 1 };
let resizeHandler = null;
let winTimer = null;
let dragState = null;

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error(`Cannot load image ${src}`));
    img.src = src;
  });
}

function resolveMedia(p) {
  return `/content/${String(p || '').replace(/^\/+/, '')}`;
}

async function loadRandomRoom() {
  if (Array.isArray(game.rooms) && game.rooms.length > 0) {
    const roomPath = game.rooms[Math.floor(Math.random() * game.rooms.length)];
    const res = await fetch(`/content/games/${gameFolder}/${roomPath}`);
    if (!res.ok) throw new Error(`Cannot load room "${roomPath}"`);
    const room = await res.json();
    if (!Array.isArray(room.items)) room.items = [];
    currentRoom = room;
    currentRoomPath = roomPath;
  } else {
    // Inline single-room back-compat
    currentRoom = {
      title: game.title,
      image: game.image,
      items: Array.isArray(game.items) ? game.items : []
    };
    currentRoomPath = null;
  }
}

async function startGame() {
  await loadRandomRoom();
  if (!currentRoom.image) throw new Error('Room has no background image');

  const imgUrl = resolveMedia(currentRoom.image);
  imageDims = await preloadImage(imgUrl);

  found = new Set();
  if (winTimer) { clearTimeout(winTimer); winTimer = null; }

  renderBoard(imgUrl);
}

function combinedTitle() {
  const parts = [];
  if (game.title) parts.push(game.title);
  if (currentRoom.title && currentRoom.title !== game.title) parts.push(currentRoom.title);
  return parts.join(' — ');
}

function renderBoard(imgUrl) {
  const editing = state.editMode;
  // The list is hidden by default in play mode (acts as a hint/help panel).
  // In edit mode it's shown so authors can see what they've added.
  const listHidden = !editing;
  elements.viewerContent.innerHTML = `
    <div class="seek-game${editing ? ' edit-mode' : ''}">
      <div class="seek-header">
        <div class="seek-title">${escapeHtml(combinedTitle() || 'Hledání')}</div>
        <div class="seek-stats">
          <span>Nalezeno: <strong id="seek-found">0</strong> / <span id="seek-total">${currentRoom.items.length}</span></span>
        </div>
        <button id="seek-help" type="button" class="seek-btn seek-btn-secondary">Nápověda</button>
        <button id="seek-restart" type="button" class="seek-btn">Restart</button>
      </div>
      <div class="seek-board-wrap">
        <div class="seek-image-area" id="seek-image-area">
          <img class="seek-image" id="seek-image" src="${imgUrl}" alt="" draggable="false"/>
          <div class="seek-items" id="seek-items"></div>
        </div>
      </div>
      <div class="seek-footer${listHidden ? ' hidden' : ''}" id="seek-footer">
        <div class="seek-list" id="seek-list"></div>
      </div>
      <div id="seek-overlay" class="seek-overlay hidden">
        <div class="seek-overlay-content">
          <div class="seek-overlay-title">Hotovo!</div>
          <div class="seek-overlay-stats">Všechny předměty nalezeny.</div>
          <button id="seek-overlay-restart" type="button" class="seek-btn">Hrát znovu</button>
        </div>
      </div>
    </div>
  `;

  const img = document.getElementById('seek-image');
  const ready = () => {
    positionItemsOverlay();
    renderItems();
    renderList();
  };
  if (img.complete && img.naturalWidth > 0) ready();
  else img.addEventListener('load', ready, { once: true });

  document.getElementById('seek-restart').addEventListener('click', restart);
  document.getElementById('seek-overlay-restart').addEventListener('click', restart);
  document.getElementById('seek-help').addEventListener('click', () => {
    const footer = document.getElementById('seek-footer');
    if (footer) footer.classList.toggle('hidden');
  });

  const itemsOverlay = document.getElementById('seek-items');
  itemsOverlay.addEventListener('click', onItemClick);
  if (editing) {
    itemsOverlay.addEventListener('pointerdown', onOverlayPointerDown);
    itemsOverlay.addEventListener('pointermove', onOverlayPointerMove);
    itemsOverlay.addEventListener('pointerup', onOverlayPointerUp);
    itemsOverlay.addEventListener('pointercancel', onOverlayPointerUp);
    renderEditorPanel();
  }

  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  resizeHandler = () => positionItemsOverlay();
  window.addEventListener('resize', resizeHandler);
}

function positionItemsOverlay() {
  const img = document.getElementById('seek-image');
  const overlay = document.getElementById('seek-items');
  if (!img || !overlay) return;
  const area = img.parentElement;
  const cw = area.clientWidth, ch = area.clientHeight;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!iw || !ih) return;
  const ratio = Math.min(cw / iw, ch / ih);
  const w = iw * ratio, h = ih * ratio;
  overlay.style.left = `${(cw - w) / 2}px`;
  overlay.style.top = `${(ch - h) / 2}px`;
  overlay.style.width = `${w}px`;
  overlay.style.height = `${h}px`;
}

function renderItems() {
  const overlay = document.getElementById('seek-items');
  if (!overlay) return;
  overlay.innerHTML = currentRoom.items.map((item, i) => `
    <div class="seek-item${found.has(i) ? ' found' : ''}" data-index="${i}"
         style="left: ${item.x * 100}%; top: ${item.y * 100}%;
                width: ${item.width * 100}%; height: ${item.height * 100}%;">
      <img src="${escapeHtml(resolveMedia(item.src))}" alt="" draggable="false"/>
    </div>
  `).join('');
}

function renderList() {
  const list = document.getElementById('seek-list');
  if (!list) return;
  if (currentRoom.items.length === 0) {
    list.innerHTML = `<div class="seek-empty">Zatím žádné předměty${state.editMode ? ' (přidej přetažením na obrázku)' : ''}.</div>`;
    return;
  }
  list.innerHTML = currentRoom.items.map((item, i) => `
    <div class="seek-list-item${found.has(i) ? ' found' : ''}" data-index="${i}">
      <img src="${escapeHtml(resolveMedia(item.src))}" alt="" draggable="false"/>
      ${item.name ? `<span class="seek-list-name">${escapeHtml(item.name)}</span>` : ''}
    </div>
  `).join('');
}

function updateCounter() {
  const fc = document.getElementById('seek-found');
  const tc = document.getElementById('seek-total');
  if (fc) fc.textContent = String(found.size);
  if (tc) tc.textContent = String(currentRoom.items.length);
}

function onItemClick(e) {
  const itemEl = e.target.closest('.seek-item');
  if (!itemEl) return;
  const idx = parseInt(itemEl.dataset.index, 10);

  if (state.editMode) {
    const label = currentRoom.items[idx]?.name || `#${idx + 1}`;
    if (confirm(`Smazat předmět "${label}" ?`)) {
      currentRoom.items.splice(idx, 1);
      found = new Set(); // reset to keep indices consistent
      renderItems();
      renderList();
      updateCounter();
      refreshEditorJSON();
    }
    return;
  }

  if (found.has(idx)) return;
  found.add(idx);
  itemEl.classList.add('found');
  const listEl = document.querySelector(`.seek-list-item[data-index="${idx}"]`);
  if (listEl) listEl.classList.add('found');
  updateCounter();

  if (currentRoom.items.length > 0 && found.size >= currentRoom.items.length) {
    winTimer = setTimeout(showWinOverlay, 500);
  }
}

function showWinOverlay() {
  const o = document.getElementById('seek-overlay');
  if (o) o.classList.remove('hidden');
}

function restart() {
  startGame().catch(showError);
}

function showError(err) {
  console.error(err);
  elements.viewerContent.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">❌</div>
      <div>${escapeHtml(err.message || 'Chyba seek hry')}</div>
    </div>
  `;
}

// --- Edit mode: drag-to-create + JSON panel ---

function onOverlayPointerDown(e) {
  if (!state.editMode) return;
  if (e.target.closest('.seek-item')) return;

  const overlay = document.getElementById('seek-items');
  if (!overlay) return;
  const rect = overlay.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  const previewEl = document.createElement('div');
  previewEl.className = 'seek-drag-preview';
  overlay.appendChild(previewEl);
  dragState = { startX: x, startY: y, currX: x, currY: y, previewEl };
  updateDragPreview();

  try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
  e.preventDefault();
}

function onOverlayPointerMove(e) {
  if (!dragState) return;
  const overlay = document.getElementById('seek-items');
  if (!overlay) return;
  const rect = overlay.getBoundingClientRect();
  let x = (e.clientX - rect.left) / rect.width;
  let y = (e.clientY - rect.top) / rect.height;
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));
  dragState.currX = x;
  dragState.currY = y;
  updateDragPreview();
}

function updateDragPreview() {
  if (!dragState || !dragState.previewEl) return;
  const { startX, startY, currX, currY, previewEl } = dragState;
  const left = Math.min(startX, currX);
  const top = Math.min(startY, currY);
  previewEl.style.left = `${left * 100}%`;
  previewEl.style.top = `${top * 100}%`;
  previewEl.style.width = `${Math.abs(currX - startX) * 100}%`;
  previewEl.style.height = `${Math.abs(currY - startY) * 100}%`;
}

function onOverlayPointerUp(e) {
  if (!dragState) return;
  const { startX, startY, currX, currY, previewEl } = dragState;
  if (previewEl && previewEl.parentNode) previewEl.parentNode.removeChild(previewEl);
  dragState = null;

  const dx = currX - startX, dy = currY - startY;
  if (Math.sqrt(dx * dx + dy * dy) < 0.01) return;

  const src = prompt('Cesta k obrázku předmětu (např. files/items/key.png):');
  if (!src) return;
  const name = prompt('Název (volitelně):');

  const left = Math.min(startX, currX);
  const top = Math.min(startY, currY);
  const item = {
    src: src.trim(),
    x: +left.toFixed(4),
    y: +top.toFixed(4),
    width: +Math.abs(currX - startX).toFixed(4),
    height: +Math.abs(currY - startY).toFixed(4)
  };
  if (name && name.trim()) item.name = name.trim();

  currentRoom.items.push(item);
  renderItems();
  renderList();
  updateCounter();
  refreshEditorJSON();
}

function renderEditorPanel() {
  if (document.getElementById('seek-editor')) return;
  const root = elements.viewerContent.querySelector('.seek-game');
  if (!root) return;
  const div = document.createElement('div');
  div.id = 'seek-editor';
  div.className = 'seek-editor';
  div.innerHTML = `
    <div class="seek-edit-hint">
      Edit mód: táhni na obrázku pro vytvoření předmětu, klikni na předmět pro smazání.
      ${currentRoomPath ? `<br><strong>Místnost:</strong> ${escapeHtml(currentRoomPath)}` : ''}
    </div>
    <button id="seek-editor-toggle" type="button" class="seek-edit-btn">JSON místnosti</button>
    <div id="seek-editor-panel" class="seek-editor-panel hidden">
      <div class="seek-editor-header">JSON aktuální místnosti</div>
      <textarea id="seek-editor-json" readonly spellcheck="false"></textarea>
      <button id="seek-editor-copy" type="button" class="seek-edit-btn">Kopírovat</button>
    </div>
  `;
  root.appendChild(div);
  document.getElementById('seek-editor-toggle').addEventListener('click', () => {
    document.getElementById('seek-editor-panel').classList.toggle('hidden');
    refreshEditorJSON();
  });
  document.getElementById('seek-editor-copy').addEventListener('click', async () => {
    const ta = document.getElementById('seek-editor-json');
    try {
      await navigator.clipboard.writeText(ta.value);
    } catch (_) {
      ta.select();
      document.execCommand('copy');
    }
  });
  refreshEditorJSON();
}

function refreshEditorJSON() {
  const ta = document.getElementById('seek-editor-json');
  if (!ta || !currentRoom) return;
  ta.value = JSON.stringify(currentRoom, null, 2);
}

export function renderSeek(g, folder) {
  game = g;
  gameFolder = folder || '';
  startGame().catch(showError);
}

export function destroySeek() {
  if (winTimer) { clearTimeout(winTimer); winTimer = null; }
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  dragState = null;
  game = null;
  gameFolder = '';
  currentRoom = null;
  currentRoomPath = null;
  found = new Set();
}
