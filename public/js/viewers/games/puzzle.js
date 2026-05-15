/**
 * Puzzle (swap-style)
 *
 * Image is sliced into a R×C grid of pieces. Pieces are shuffled across the
 * grid slots. Tap two pieces → they swap positions. When a piece arrives at
 * its correct slot, it locks (further taps ignored). Win when all locked.
 *
 * Game schema (content/games/<name>/game.json):
 *   {
 *     "title": "...",
 *     "kind": "puzzle",
 *     "image": "files/...",
 *     "gridSize": "3x3"   // R*C ≥ 4
 *   }
 */

import { elements } from '../../state.js';
import { escapeHtml } from '../../utils.js';

let game = null;
let slots = [];                // slots[i] = original piece index currently at slot i
let firstSelected = null;
let solved = 0;
let total = 0;
let imageDims = { w: 1, h: 1 };

function parseGridSize(spec) {
  const m = String(spec || '3x3').match(/^(\d+)\s*[xX×]\s*(\d+)$/);
  if (!m) return { rows: 3, cols: 3 };
  return { rows: parseInt(m[1], 10), cols: parseInt(m[2], 10) };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countCorrect(s) {
  let c = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === i) c++;
  return c;
}

function buildSlots(n) {
  // Shuffle until at least 2 pieces are misplaced (no trivial games).
  let s;
  do {
    s = shuffle(Array.from({ length: n }, (_, i) => i));
  } while (countCorrect(s) >= n - 1);
  return s;
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error(`Cannot load image ${src}`));
    img.src = src;
  });
}

async function startGame() {
  const { rows, cols } = parseGridSize(game.gridSize);
  total = rows * cols;
  if (total < 4) throw new Error(`Puzzle grid "${game.gridSize}" too small (min 4 cells)`);

  const candidates = Array.isArray(game.images)
    ? game.images
    : (game.image ? [game.image] : []);
  if (candidates.length === 0) {
    throw new Error('Puzzle has no image (set "image" or "images" in game.json)');
  }
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const imgUrl = `/content/${picked.replace(/^\/+/, '')}`;
  imageDims = await preloadImage(imgUrl);

  slots = buildSlots(total);
  firstSelected = null;
  solved = countCorrect(slots);

  renderBoard(imgUrl);
}

function renderBoard(imgUrl) {
  const { rows, cols } = parseGridSize(game.gridSize);

  elements.viewerContent.innerHTML = `
    <div class="puzzle-game">
      <div class="puzzle-header">
        <div class="puzzle-title">${escapeHtml(game.title || 'Puzzle')}</div>
        <div class="puzzle-stats">
          <span>Hotovo: <strong id="puzzle-solved">${solved}</strong> / ${total}</span>
        </div>
        <button id="puzzle-restart" type="button" class="puzzle-btn">Restart</button>
      </div>
      <div class="puzzle-main">
        <div class="puzzle-board-wrapper">
          <div class="puzzle-board" id="puzzle-board"
               style="--puzzle-img-w: ${imageDims.w};
                      --puzzle-img-h: ${imageDims.h};
                      grid-template-columns: repeat(${cols}, 1fr);
                      grid-template-rows: repeat(${rows}, 1fr);">
            ${slots.map((pieceIdx, slotIdx) =>
              renderPiece(slotIdx, pieceIdx, rows, cols, imgUrl)
            ).join('')}
          </div>
        </div>
        <div class="puzzle-reference">
          <div class="puzzle-reference-label">Předloha</div>
          <img src="${imgUrl}" alt="" draggable="false" />
        </div>
      </div>
      <div id="puzzle-overlay" class="puzzle-overlay hidden">
        <div class="puzzle-overlay-content">
          <div class="puzzle-overlay-title">Hotovo!</div>
          <button id="puzzle-overlay-restart" type="button" class="puzzle-btn">Hrát znovu</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('puzzle-board').addEventListener('click', onBoardClick);
  document.getElementById('puzzle-restart').addEventListener('click', restart);
  document.getElementById('puzzle-overlay-restart').addEventListener('click', restart);
}

function renderPiece(slotIdx, pieceIdx, rows, cols, imgUrl) {
  const r = Math.floor(pieceIdx / cols);
  const c = pieceIdx % cols;
  const bgX = cols > 1 ? (c / (cols - 1)) * 100 : 50;
  const bgY = rows > 1 ? (r / (rows - 1)) * 100 : 50;
  const isCorrect = pieceIdx === slotIdx;
  return `
    <div class="puzzle-piece${isCorrect ? ' correct' : ''}"
         data-slot="${slotIdx}"
         style="background-image: url('${imgUrl}');
                background-size: ${cols * 100}% ${rows * 100}%;
                background-position: ${bgX}% ${bgY}%;">
    </div>
  `;
}

function onBoardClick(e) {
  const pieceEl = e.target.closest('.puzzle-piece');
  if (!pieceEl) return;
  const slotIdx = parseInt(pieceEl.dataset.slot, 10);

  if (slots[slotIdx] === slotIdx) return; // locked correct piece

  if (firstSelected == null) {
    firstSelected = slotIdx;
    pieceEl.classList.add('selected');
    return;
  }
  if (firstSelected === slotIdx) {
    firstSelected = null;
    pieceEl.classList.remove('selected');
    return;
  }

  const a = firstSelected;
  const b = slotIdx;
  firstSelected = null;
  swapSlots(a, b);

  solved = countCorrect(slots);
  const stat = document.getElementById('puzzle-solved');
  if (stat) stat.textContent = solved;
  if (solved === total) showWinOverlay();
}

function swapSlots(a, b) {
  const { rows, cols } = parseGridSize(game.gridSize);
  [slots[a], slots[b]] = [slots[b], slots[a]];
  redrawPiece(a, rows, cols);
  redrawPiece(b, rows, cols);
  document.querySelectorAll('.puzzle-piece.selected').forEach(el => el.classList.remove('selected'));
}

function redrawPiece(slotIdx, rows, cols) {
  const el = document.querySelector(`.puzzle-piece[data-slot="${slotIdx}"]`);
  if (!el) return;
  const pieceIdx = slots[slotIdx];
  const r = Math.floor(pieceIdx / cols);
  const c = pieceIdx % cols;
  const bgX = cols > 1 ? (c / (cols - 1)) * 100 : 50;
  const bgY = rows > 1 ? (r / (rows - 1)) * 100 : 50;
  el.style.backgroundPosition = `${bgX}% ${bgY}%`;
  el.classList.toggle('correct', pieceIdx === slotIdx);
}

function showWinOverlay() {
  const o = document.getElementById('puzzle-overlay');
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
      <div>${escapeHtml(err.message || 'Chyba puzzle')}</div>
    </div>
  `;
}

export function renderPuzzle(g) {
  game = g;
  startGame().catch(showError);
}

export function destroyPuzzle() {
  game = null;
  slots = [];
  firstSelected = null;
  solved = 0;
  total = 0;
}
